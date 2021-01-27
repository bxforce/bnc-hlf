/*
Copyright 2020 IRT SystemX

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { IEnrollmentRequest, IEnrollResponse } from 'fabric-ca-client';
import { BaseGenerator } from '../base';
import { AdminCAAccount } from './createOrgCerts';
import { Network } from '../../parser/model/network';
import { Orderer } from '../../parser/model/orderer';
import { Membership, UserParams } from '../../core/hlf/membership';
import { ClientConfig } from '../../core/hlf/client';
import { ConsensusType, HLF_CLIENT_ACCOUNT_ROLE, MAX_ENROLLMENT_COUNT } from '../../utils/constants';
import { CSR, IEnrollSecretResponse, DockerComposeYamlOptions } from '../../utils/datatype';
import { CertificateCsr } from '../utils/certificateCsr';
import { Utils } from '../../utils/helper';
import getOrdererOrganizationRootPath = Utils.getOrdererOrganizationRootPath;
import getOrdererMspRootPath = Utils.getOrdererMspRootPath;
import getOrdererTlsRootPath = Utils.getOrdererTlsRootPath;
import getPropertiesPath = Utils.getPropertiesPath;
import getPeerMspPath = Utils.getPeerMspPath;
import { SysWrapper } from '../../utils/sysWrapper';
import { d, e } from '../../utils/logs';
import getFile = SysWrapper.getFile;

import { ensureDir } from 'fs-extra'; // TODO: fix

/**
 * Class responsible to generate Ordering crypto & certificates credentials
 *
 * @author wassim.znaidi@gmail.com
 */
export class OrdererCertsGenerator extends BaseGenerator {
  contents = `
name: "bnc"
x-type: "hlfv1"
description: "Blockchain network composer"
version: "1.0"

client:
  organization: ${this.network.ordererOrganization[0].name}
  credentialStore:
    path: ${this.network.options.networkConfigPath}/wallets/organizations/${this.network.ordererOrganization[0].fullName}
    cryptoStore:
      path: ${this.network.options.networkConfigPath}/wallets/organizations/${this.network.ordererOrganization[0].fullName}
organizations:
    ${this.network.organizations[0].name}:
      mspid: ${this.network.organizations[0].mspName}
      peers:
      ${this.network.organizations[0].peers.map((peer, index) => `
        - ${peer.name}.${this.network.organizations[0].fullName}`).join('')}
peers:
${this.network.organizations[0].peers.map((peer, index) => `
  ${peer.name}.${this.network.organizations[0].fullName}:
    url: grpc${this.network.organizations[0].isSecure ? 's' : ''}://${peer.name}.${this.network.organizations[0].fullName}:${peer.options.ports[0]}
    grpcOptions:
      ssl-target-name-override: ${peer.name}.${this.network.organizations[0].fullName}
      request-timeout: 120001
      grpc.keepalive_time_ms: 600000
    tlsCACerts:
      path: ${getPeerMspPath(this.network.options.networkConfigPath, this.network.organizations[0], peer)}/tlscacerts/tlsca.${this.network.organizations[0].fullName}-cert.pem
`).join('')}

orderers:
    ${this.network.organizations[0].orderers[0].name}.${this.network.ordererOrganization[0].domainName}:
      url: grpc${this.network.organizations[0].isSecure ? 's' : ''}://${this.network.organizations[0].orderers[0].fullName}:${this.network.ordererOrganization[0].orderers[0].options.ports[0]}
      grpcOptions:
        ssl-target-name-override: ${this.network.ordererOrganization[0].orderers[0].name}.${this.network.ordererOrganization[0].domainName}
        grpc-max-send-message-length: 40000
      tlsCACerts:
        path: ${this.network.options.networkConfigPath}/organizations/ordererOrganizations/${this.network.organizations[0].fullName}/tlsca/tlsca.${this.network.ordererOrganization[0].domainName}-cert.pem
  
certificateAuthorities:
  ${this.network.ordererOrganization[0].caName}:
    url: http${this.network.ordererOrganization[0].isSecure ? 's' : ''}://${this.network.ordererOrganization[0].ca.options.host}:${this.network.ordererOrganization[0].ca.options.port}
    httpOptions:
      verify: false
    tlsCACerts:
      path: ${this.network.options.networkConfigPath}/organizations/ordererOrganizations/${this.options.org.fullName}/msp/tlscacerts
    registrar:
      - enrollId: ${this.admin.name}
        enrollSecret: ${this.admin.password}
    caName: ${this.network.ordererOrganization[0].caName}  
  `;

  /**
   * Constructor
   * @param filename
   * @param path
   * @param network
   * @param admin
   */
  constructor(filename: string,
              path: string,
              private network: Network,
              private options?: DockerComposeYamlOptions,
              private admin: AdminCAAccount = { name: 'admin', password: 'adminpw' }
  ) {
    super(filename, getPropertiesPath(path));
  }

  /**
   * Build all certificate to be used
   */
  async buildCertificate(): Promise<boolean> {
    try {
      await this.save();
      await this.createMSPDirectories();

      const rootPath = this.network.options.networkConfigPath;
      const domain = this.network.ordererOrganization[0].domainName;
      const ordererMspId = this.network.ordererOrganization[0].mspName;

      // Instantiate the CA instance
      d('Initiate CA Client services');
      const config: ClientConfig = {
        networkProfile: this.filePath,
        admin: {
          name: this.admin.name,
          secret: this.admin.password
        }
      };
      const membership = new Membership(config);
      await membership.initCaClient(this.network.ordererOrganization[0].caName);
      d('CA initialized done');

      d('Start enrolling Orderer CA Registrar...');
      await OrdererCertsGenerator._generateCAAdmin(membership, ordererMspId);
      d('Enrolling Orderer CA Registrar done !!!');

      // copy ca tls certs if secure enabled
      const ordOrgRootPath = getOrdererOrganizationRootPath(rootPath, this.options.org.fullName);
      const tlsCaCerts = `${this.network.options.networkConfigPath}/organizations/fabric-ca/${this.network.ordererOrganization[0].name}/crypto/ca-cert.pem`;
      if(this.network.ordererOrganization[0].isSecure) {
        await SysWrapper.copyFile(tlsCaCerts, `${ordOrgRootPath}/tlsca/tlsca.${this.network.ordererOrganization[0].domainName}-cert.pem`);
        await SysWrapper.copyFile(tlsCaCerts, `${ordOrgRootPath}/msp/tlscacerts/tlsca.${this.network.ordererOrganization[0].domainName}-cert.pem`);
      }

      d('Start enrolling Orderer Admin user...');
      const ordererAdminEnrollment = await this._generateOrdererAdminFiles(membership, ordererMspId);
      let ordAdminCert;
      let ordAdminRootCert;
      let ordAdminKey;



     /* const {
        key: ordAdminKey,
        certificate: ordAdminCert,
        rootCertificate: ordAdminRootCert
      } = ordererAdminEnrollment.enrollment;

      */
      if(ordererAdminEnrollment != null) {
        ordAdminKey = ordererAdminEnrollment.enrollment.key;
        ordAdminCert = ordererAdminEnrollment.enrollment.certificate;
        ordAdminRootCert = ordererAdminEnrollment.enrollment.rootCertificate;

        const adminMspPath = `${ordOrgRootPath}/users/${this.network.ordererOrganization[0].adminUserFull}/msp`;
        await SysWrapper.createFile(`${adminMspPath}/admincerts/${this.network.ordererOrganization[0].adminUserFull}-cert.pem`, ordAdminCert);
        await SysWrapper.createFile(`${adminMspPath}/cacerts/ca.${domain}-cert.pem`, ordAdminRootCert);
        await SysWrapper.createFile(`${adminMspPath}/keystore/priv_sk`, ordAdminKey.toBytes());
        await SysWrapper.createFile(`${adminMspPath}/signcerts/${this.network.ordererOrganization[0].adminUserFull}-cert.pem`, ordAdminCert);
        if(this.network.ordererOrganization[0].isSecure) {
          await SysWrapper.copyFile(tlsCaCerts, `${adminMspPath}/tlscacerts/tlsca.${this.network.ordererOrganization[0].domainName}-cert.pem`);
        }
        d('Enrolling Orderer Admin user done !!!');

      } else {
        d('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! ALREADY HAVE ADMIN !!!!!!!!!!!!!!!!!!!!!!!')
        const adminMspPath = `${ordOrgRootPath}/users/${this.network.ordererOrganization[0].adminUserFull}/msp`;
        ordAdminCert = await getFile(`${adminMspPath}/admincerts/${this.network.ordererOrganization[0].adminUserFull}-cert.pem`);
        ordAdminRootCert = await getFile(`${adminMspPath}/cacerts/ca.${domain}-cert.pem`)
        d('Enrolling Orderer Admin user done !!!');
      }
   /*   const adminMspPath = `${ordOrgRootPath}/users/${this.network.ordererOrganization[0].adminUserFull}/msp`;
      await SysWrapper.createFile(`${adminMspPath}/admincerts/${this.network.ordererOrganization[0].adminUserFull}-cert.pem`, ordAdminCert);
      await SysWrapper.createFile(`${adminMspPath}/cacerts/ca.${domain}-cert.pem`, ordAdminRootCert);
      await SysWrapper.createFile(`${adminMspPath}/keystore/priv_sk`, ordAdminKey.toBytes());
      await SysWrapper.createFile(`${adminMspPath}/signcerts/${this.network.ordererOrganization[0].adminUserFull}-cert.pem`, ordAdminCert);
      if(this.network.ordererOrganization[0].isSecure) {
        await SysWrapper.copyFile(tlsCaCerts, `${adminMspPath}/tlscacerts/tlsca.${this.network.ordererOrganization[0].domainName}-cert.pem`);
      }
      d('Enrolling Orderer Admin user done !!!');

    */

     // Store orderer msp folder files
     await SysWrapper.createFile(`${ordOrgRootPath}/msp/admincerts/${this.network.ordererOrganization[0].adminUserFull}-cert.pem`, ordAdminCert);
     await SysWrapper.createFile(`${ordOrgRootPath}/msp/cacerts/ca.${domain}-cert.pem`, ordAdminRootCert);
     await SysWrapper.createFile(`${ordOrgRootPath}/ca/ca.${domain}-cert.pem`, ordAdminRootCert);

     console.log("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFf", ordAdminRootCert)
      console.log('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFff', ordAdminCert)

     d('Start register & enroll Orderers...');
     for (const orderer of this.network.ordererOrganization[0].orderers) {
       // get peer csr
       const certificateCsr = new CertificateCsr(this.network);
       const csr = await certificateCsr.generateCsrHost(orderer);

       const ordererEnrollment = await this._generateOrdererMspFiles(orderer, membership, ordererMspId, csr);
       

       if(ordererEnrollment != null){
         const ordererCert = ordererEnrollment.enrollment.certificate;
         const ordererKey = csr ? csr.key : ordererEnrollment.enrollment.key.toBytes();
/*
         console.log('NOOOOOOOOOOT NUUUUUUUUULLLLLLLLLLLLLLLLLLL')
         console.log(ordererCert)
         console.log(ordererKey)
         console.log(ordAdminRootCert)
         console.log(ordAdminCert)

 */
         const baseOrdererPath = `${this.network.options.networkConfigPath}/organizations/ordererOrganizations/${this.options.org.fullName}/orderers`;
         const ordererMspPath = `${baseOrdererPath}/${orderer.fullName}/msp`;

         await SysWrapper.createFile(`${ordererMspPath}/admincerts/${this.network.ordererOrganization[0].adminUserFull}-cert.pem`, ordAdminCert);
         await SysWrapper.createFile(`${ordererMspPath}/cacerts/ca.${domain}-cert.pem`, ordAdminRootCert);
         await SysWrapper.createFile(`${ordererMspPath}/keystore/priv_sk`, ordererKey);
         await SysWrapper.createFile(`${ordererMspPath}/signcerts/${orderer.fullName}-cert.pem`, ordererCert);

         // Generate TLS file if it's enabled
         if (this.network.ordererOrganization[0].isSecure || this.network.options.consensus === ConsensusType.RAFT) {
           await SysWrapper.copyFile(tlsCaCerts, `${ordererMspPath}/tlscacerts/tlsca.${this.network.ordererOrganization[0].domainName}-cert.pem`);
          //  console.log('GOING TO GENERATEEEE TLSSSSSSSSSSSSSSSSS')
           const ordererTlsEnrollment = await this._generateOrdererTlsFiles(orderer, membership, ordererEnrollment.secret, csr);
           const ordererTlsCertificate = ordererTlsEnrollment.certificate;
           const ordererTlsKey = csr ? csr.key : ordererTlsEnrollment.key.toBytes();
           // console.log('heeeeeeeeeeeeeere', ordererTlsCertificate)
           const ordererTlsPath = `${baseOrdererPath}/${orderer.fullName}/tls`;
           await SysWrapper.copyFile(tlsCaCerts, `${ordererTlsPath}/ca.crt`);
           await SysWrapper.createFile(`${ordererTlsPath}/server.crt`, ordererTlsCertificate);
           await SysWrapper.createFile(`${ordererTlsPath}/server.key`, ordererTlsKey);
         }
       } else {
         console.log('IN ELSEEEEEEEEEEEEEEEEEEEEE')
         d(`Already Enrolled ${orderer.fullName}`)
       }

     }
     d('Register & Enroll Organization orderers done !!!');



      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  async buildCertificateWithORGCA(): Promise<boolean> {
    try {
      await this.save();
      await this.createMSPDirectories();

      const rootPath = this.network.options.networkConfigPath;
      const domain = this.network.ordererOrganization[0].domainName;
      const ordererMspId = this.network.ordererOrganization[0].mspName;

      // Instantiate the CA instance
      d('Initiate CA Client services');
      const config: ClientConfig = {
        networkProfile: this.filePath,
        admin: {
          name: this.admin.name,
          secret: this.admin.password
        }
      };
      const membership = new Membership(config);

      await membership.initCaClient(this.network.ordererOrganization[0].caName);
      const ordOrgRootPath = getOrdererOrganizationRootPath(rootPath, this.options.org.fullName);
      //COPY organizations/fabric-ca/org1/crypto to the ordererOrganizationorg1/crypto
      let src = `${rootPath}/organizations/fabric-ca/${this.options.org.name}/crypto`
      let dest = `${rootPath}/organizations/fabric-ca/${this.network.ordererOrganization[0].name}/crypto`
      await SysWrapper.copyFolderRecursively(src, dest)

      //COPY the admin id under wallets
      let adminIdentity = `${rootPath}/wallets/organizations/${this.options.org.fullName}/${this.options.org.ca.options.user}.id`
      let destAdmin = `${rootPath}/wallets/organizations/${this.network.ordererOrganization[0].name}.${domain}/${this.options.org.ca.options.user}.id`
      await SysWrapper.copyFile(adminIdentity, destAdmin)
      let adminIdentityOrg = `${rootPath}/wallets/organizations/${this.options.org.fullName}/${this.options.org.adminUser}.id`
      let destAdminOrde = `${rootPath}/wallets/organizations/${this.network.ordererOrganization[0].name}.${domain}/${this.network.ordererOrganization[0].adminUser}.id`
      await SysWrapper.copyFile(adminIdentityOrg, destAdminOrde)
      // copy ca tls certs if secure enabled
      const tlsCaCerts = `${this.network.options.networkConfigPath}/organizations/fabric-ca/${this.options.org.name}/crypto/ca-cert.pem`;
      if(this.network.ordererOrganization[0].isSecure) {
        await SysWrapper.copyFile(tlsCaCerts, `${ordOrgRootPath}/tlsca/tlsca.${this.network.ordererOrganization[0].domainName}-cert.pem`);
        await SysWrapper.copyFile(tlsCaCerts, `${ordOrgRootPath}/msp/tlscacerts/tlsca.${this.network.ordererOrganization[0].domainName}-cert.pem`);
      }

      let res = await membership.getUserIdentity(this.network.ordererOrganization[0].adminUser)
      let ordAdminCert;
      let ordAdminPrivKey;

      let res1 = JSON.stringify(res)
      let myobj = JSON.parse(res1)
      ordAdminCert = myobj.credentials.certificate;
      ordAdminPrivKey = myobj.credentials.privateKey;
      const adminMspPath = `${ordOrgRootPath}/users/${this.network.ordererOrganization[0].adminUserFull}/msp`;
      await SysWrapper.createFile(`${adminMspPath}/admincerts/${this.network.ordererOrganization[0].adminUserFull}-cert.pem`, ordAdminCert);
      await SysWrapper.copyFile(tlsCaCerts, `${adminMspPath}/cacerts/ca.${domain}-cert.pem`);
      await SysWrapper.createFile(`${adminMspPath}/keystore/priv_sk`, ordAdminPrivKey);
      await SysWrapper.createFile(`${adminMspPath}/signcerts/${this.network.ordererOrganization[0].adminUserFull}-cert.pem`, ordAdminCert);

      if(this.network.ordererOrganization[0].isSecure) {
        await SysWrapper.copyFile(tlsCaCerts, `${adminMspPath}/tlscacerts/tlsca.${this.network.ordererOrganization[0].domainName}-cert.pem`);
      }

      d('Done copying files for ord Admin')

      await SysWrapper.createFile(`${ordOrgRootPath}/msp/admincerts/${this.network.ordererOrganization[0].adminUserFull}-cert.pem`, ordAdminCert);
      await SysWrapper.copyFile(tlsCaCerts, `${ordOrgRootPath}/msp/cacerts/ca.${domain}-cert.pem`);
      await SysWrapper.copyFile(tlsCaCerts, `${ordOrgRootPath}/ca/ca.${domain}-cert.pem`);

      d('Start register & enroll Orderers...');
      for (const orderer of this.network.ordererOrganization[0].orderers) {
        // get peer csr
        const certificateCsr = new CertificateCsr(this.network);
        const csr = await certificateCsr.generateCsrHost(orderer);

        const ordererEnrollment = await this._generateOrdererMspFiles(orderer, membership, ordererMspId, csr);
        const ordererCert = ordererEnrollment.enrollment.certificate;
        const ordererKey = csr ? csr.key : ordererEnrollment.enrollment.key.toBytes();

        const baseOrdererPath = `${this.network.options.networkConfigPath}/organizations/ordererOrganizations/${this.options.org.fullName}/orderers`;
        const ordererMspPath = `${baseOrdererPath}/${orderer.fullName}/msp`;

        await SysWrapper.createFile(`${ordererMspPath}/admincerts/${this.network.ordererOrganization[0].adminUserFull}-cert.pem`, ordAdminCert);
        await SysWrapper.copyFile(tlsCaCerts, `${ordererMspPath}/cacerts/ca.${domain}-cert.pem`);
        await SysWrapper.createFile(`${ordererMspPath}/keystore/priv_sk`, ordererKey);
        await SysWrapper.createFile(`${ordererMspPath}/signcerts/${orderer.fullName}-cert.pem`, ordererCert);

        // Generate TLS file if it's enabled
        if (this.network.ordererOrganization[0].isSecure || this.network.options.consensus === ConsensusType.RAFT) {
          await SysWrapper.copyFile(tlsCaCerts, `${ordererMspPath}/tlscacerts/tlsca.${this.network.ordererOrganization[0].domainName}-cert.pem`);

          const ordererTlsEnrollment = await this._generateOrdererTlsFiles(orderer, membership, ordererEnrollment.secret, csr);
          const ordererTlsCertificate = ordererTlsEnrollment.certificate;
          const ordererTlsKey = csr ? csr.key : ordererTlsEnrollment.key.toBytes();

          const ordererTlsPath = `${baseOrdererPath}/${orderer.fullName}/tls`;
          await SysWrapper.copyFile(tlsCaCerts, `${ordererTlsPath}/ca.crt`);
          await SysWrapper.createFile(`${ordererTlsPath}/server.crt`, ordererTlsCertificate);
          await SysWrapper.createFile(`${ordererTlsPath}/server.key`, ordererTlsKey);
        }
      }
      d('Register & Enroll Organization orderers done !!!');



      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }
  /**
   * Create folder needed for the MSP configuration for orderer entities
   */
  async createMSPDirectories(): Promise<boolean> {
    try {
      const orderOrgRootPath = getOrdererOrganizationRootPath(this.network.options.networkConfigPath, this.options.org.fullName);

      await ensureDir(orderOrgRootPath);

      await SysWrapper.createFolder(`${orderOrgRootPath}/ca`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/tlsca`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/msp`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/msp/admincerts`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/msp/cacerts`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/msp/tlscacerts`);

      // create user admin folder msp
      await SysWrapper.createFolder(`${orderOrgRootPath}/users`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/users/${this.network.ordererOrganization[0].adminUserFull}`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/users/${this.network.ordererOrganization[0].adminUserFull}/msp`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/users/${this.network.ordererOrganization[0].adminUserFull}/msp/admincerts`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/users/${this.network.ordererOrganization[0].adminUserFull}/msp/cacerts`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/users/${this.network.ordererOrganization[0].adminUserFull}/msp/keystore`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/users/${this.network.ordererOrganization[0].adminUserFull}/msp/signcerts`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/users/${this.network.ordererOrganization[0].adminUserFull}/msp/tlscacerts`);

      // create msp folder for every orderer
      for (let orderer of this.network.ordererOrganization[0].orderers) {
        const ordererMspPath = getOrdererMspRootPath(this.network.options.networkConfigPath, this.options.org.fullName, orderer);

        await SysWrapper.createFolder(`${ordererMspPath}`);
        await SysWrapper.createFolder(`${ordererMspPath}/admincerts`);
        await SysWrapper.createFolder(`${ordererMspPath}/cacerts`);
        await SysWrapper.createFolder(`${ordererMspPath}/keystore`);
        await SysWrapper.createFolder(`${ordererMspPath}/signcerts`);
        await SysWrapper.createFolder(`${ordererMspPath}/tlscacerts`);

        const ordererTlsPath = `${getOrdererTlsRootPath(this.network.options.networkConfigPath, this.options.org.fullName, orderer)}`;
        await SysWrapper.createFolder(`${ordererTlsPath}`);
      }

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  /**
   * Enroll default admin account
   * @param membership
   * @param mspId
   * @private
   */
  private static async _generateCAAdmin(membership: Membership, mspId: string): Promise<IEnrollResponse> {
    try {
      // Generate & store admin certificate
      const adminEnrollment: IEnrollResponse = await membership.enrollCaAdmin(mspId);

      d(`The admin account is enrolled (${!!adminEnrollment})`);

      return adminEnrollment;
    } catch (err) {
      e(err);
      return null;
    }
  }

  /**
   * Generate the MSP Files for the selected orderer
   * Generate and store the NodeOU's files into peer MSP Path
   * @param orderer
   * @param membership
   * @param mspId
   * @param csr
   * @private
   */
  private async _generateOrdererMspFiles(orderer: Orderer, membership: Membership, mspId: string, csr?: CSR): Promise<IEnrollSecretResponse> {
    try {
      // enroll & store orderer crypto credentials
      const params: UserParams = {
        enrollmentID: `${orderer.fullName}`,
        enrollmentSecret: `${orderer.name}pw`,
        role: HLF_CLIENT_ACCOUNT_ROLE.orderer,
        maxEnrollments: MAX_ENROLLMENT_COUNT,
        affiliation: ''
      };
      const ordererEnrollmentResponse = await membership.addUser(params, mspId, csr);
      d(`Orderer ${orderer.name} is enrolled successfully`);

      console.log('here is response', ordererEnrollmentResponse)

      return ordererEnrollmentResponse;
    } catch (err) {
      e(`Error enrolling the orderer ${orderer.name}`);
      e(err);
      throw err;
    }
  }

  /**
   * Generate the TLS Files for the selected orderer
   * @param orderer
   * @param membership
   * @param secret
   * @param csr
   * @private
   */
  private async _generateOrdererTlsFiles(orderer: Orderer, membership: Membership, secret: string, csr?: CSR): Promise<IEnrollResponse> {
    try {
      // enroll & store peer crypto credentials
      const request: IEnrollmentRequest = {
        enrollmentID: `${orderer.fullName}`,
        enrollmentSecret: secret,
        profile: 'tls'
      };
      const ordererTlsEnrollment = await membership.enrollTls(request, csr);
      d(`Orderer TLS ${orderer.name} is enrolled successfully`);

      return ordererTlsEnrollment;
    } catch (err) {
      e(`Error tls enrolling the orderer ${orderer.name}`);
      e(err);
      throw err;
    }
  }

  /**
   * Generate orderer organization admin user
   * @param membership
   * @param mspId
   * @private
   */
  private async _generateOrdererAdminFiles(membership: Membership, mspId: string): Promise<IEnrollSecretResponse> {
    try {
      // enroll & store orderer admin user crypto credentials
      const params: UserParams = {
        enrollmentID: `${this.network.ordererOrganization[0].adminUser}`,
        enrollmentSecret: `${this.network.ordererOrganization[0].adminUserPass}`,
        role: HLF_CLIENT_ACCOUNT_ROLE.admin,
        maxEnrollments: MAX_ENROLLMENT_COUNT,
        affiliation: ''
      };
      const ordererEnrollmentResponse = await membership.addUser(params, mspId);
      d(`Orderer Admin is enrolled successfully`);

      return ordererEnrollmentResponse;
    } catch (err) {
      e(`Error enrolling the orderer admin user`);
      e(err);
      throw err;
    }
  }
}
