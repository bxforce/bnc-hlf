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
import { Peer } from '../../parser/model/peer';
import { Organization } from '../../parser/model/organization';
import { Network } from '../../parser/model/network';
import { ClientConfig } from '../../core/hlf/client';
import { Membership, UserParams } from '../../core/hlf/membership';
import { CertificateCsr } from '../utils/certificateCsr';
import { CSR, DockerComposeYamlOptions, IEnrollmentResponse, IEnrollSecretResponse } from '../../utils/datatype';
import { HLF_CLIENT_ACCOUNT_ROLE, MAX_ENROLLMENT_COUNT } from '../../utils/constants';
import { Utils } from '../../utils/helper';
import getPeerMspPath = Utils.getPeerMspPath;
import getPeerTlsPath = Utils.getPeerTlsPath;
import getOrganizationMspPath = Utils.getOrganizationMspPath;
import getPropertiesPath = Utils.getPropertiesPath;
import getOrganizationUsersPath = Utils.getOrganizationUsersPath;
import { SysWrapper } from '../../utils/sysWrapper';
import { d, e } from '../../utils/logs';


import getOrdererOrganizationRootPath = Utils.getOrdererOrganizationRootPath;
import getOrdererMspRootPath = Utils.getOrdererMspRootPath;
import getOrdererTlsRootPath = Utils.getOrdererTlsRootPath;

import { ensureDir } from 'fs-extra'; // TODO: fix

export interface AdminCAAccount {
  name: string;
  password: string;
}

/**
 * Class responsible to generate organization keys and certificates credentials
 *
 * @author wassim.znaidi@gmail.com
 * @author ahmed.souissi@irt-systemx.fr
 */
export class OrgCertsGenerator extends BaseGenerator {
  contents = `
name: "bnc"
x-type: "hlfv1"
description: "Blockchain network composer"
version: "1.0"

client:
  organization: ${this.options.org.name}
  credentialStore:
    path: ${this.options.networkRootPath}/wallets/organizations/${this.options.org.fullName}
    cryptoStore:
      path: ${this.options.networkRootPath}/wallets/organizations/${this.options.org.fullName}

certificateAuthorities:
  ${this.options.org.caName}:
    url: http${this.options.org.isSecure ? 's' : ''}://${this.options.org.caName}:${this.options.org.ca.options.port}
    httpOptions:
      verify: false
    tlsCACerts:
      path: ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/msp/tlscacerts
    registrar:
      - enrollId: ${this.admin.name}
        enrollSecret: ${this.admin.password}
    caName: ${this.options.org.caName}    
 `;

  constructor(filename: string,
              path: string,
              private network: Network,
              private options?: DockerComposeYamlOptions,
              private admin: AdminCAAccount = { name: 'admin', password: 'adminpw' }) {
    super(filename, getPropertiesPath(path));
  }

  /**
   * Build all certificates for the network to be started
   */
  async buildCertificate(): Promise<boolean> {
    try {
      // Generate connection-profile & MSP folder structure
      await this.save();
      await this.createMSPDirectories();

      // Instantiate Membership instance
      d('Initiate CA Client services');
      const orgMspId = this.options.org.mspName;
      const config: ClientConfig = {
        networkProfile: this.filePath,
        admin: {
          name: this.admin.name,
          secret: this.admin.password
        }
      };
      const membership = new Membership(config);
      await membership.initCaClient(this.options.org.caName);
      d('Initiate CA Client services done !!!');

      // Generate & store admin certificate
      d('Enroll CA Registrar');
      await this._generateCAAdminOrgMspFiles(membership, orgMspId);
      d('Enroll CA Registrar done !!!');

      // copy ca tls certs if secure enabled
      const orgMspPath = getOrganizationMspPath(this.options.networkRootPath, this.options.org);
      const fromTlsCaCerts = `${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/crypto/ca-cert.pem`;
      if(this.options.org.isSecure) {
        const toFile = `${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/tlsca/tlsca.${this.options.org.fullName}-cert.pem`;
        await SysWrapper.copyFile(fromTlsCaCerts, toFile);
      }

      d('Start register & enroll organization admin');
      const orgAdminEnrollment = await this._generateAdminOrgFiles(this.options.org, membership, orgMspId);
      if (orgAdminEnrollment) { // TODO: fetch Admin already generated certs instead of skipping
        const {
          key: orgAdminKey,
          certificate: orgAdminCertificate,
          rootCertificate: orgAdminRootCertificate
        } = orgAdminEnrollment.enrollment;
  
        // Store generated files
        const organizationUserPath = getOrganizationUsersPath(this.options.networkRootPath, this.options.org);
        const mspAdminPath = `${organizationUserPath}/Admin@${this.options.org.fullName}/msp`;
        await SysWrapper.createFile(`${mspAdminPath}/cacerts/ca.${this.options.org.fullName}-cert.pem`, orgAdminRootCertificate);
        await SysWrapper.createFile(`${mspAdminPath}/keystore/priv_sk`, orgAdminKey.toBytes());
        await SysWrapper.createFile(`${mspAdminPath}/signcerts/Admin@${this.options.org.fullName}-cert.pem`, orgAdminCertificate);
        if(this.options.org.isSecure) {
          await SysWrapper.copyFile(fromTlsCaCerts, `${mspAdminPath}/tlscacerts/tlsca.${this.options.org.fullName}-cert.pem`);
          await SysWrapper.copyFile(fromTlsCaCerts, `${orgMspPath}/tlscacerts/tlsca.${this.options.org.fullName}-cert.pem`);
        }
      
        d('Register & enroll organization admin dne !!!');
  
        d('Create Organization MSP');
        await SysWrapper.createFile(`${orgMspPath}/cacerts/ca.${this.options.org.fullName}-cert.pem`, orgAdminRootCertificate);
        await SysWrapper.createFile(`${orgMspPath}/admincerts/Admin@${this.options.org.fullName}-cert.pem`, orgAdminCertificate);
        await this.generateConfigOUFile(`${orgMspPath}/config.yaml`);
  
        // generate NodeOU & enroll & store peer crypto credentials
        d('Start register & enroll Organization peers...');
        for (const peer of this.options.org.peers) {
          const peerMspPath = getPeerMspPath(this.options.networkRootPath, this.options.org, peer);
  
          // get peer csr
          const certificateCsr = new CertificateCsr(this.network);
          const csr = await certificateCsr.generateCsrHost(peer);
  
          const peerEnrollment = await this._generatePeerMspFiles(peer, membership, orgMspId, csr);
          if (peerEnrollment) {
            const peerCertificate = peerEnrollment.enrollment.certificate;
            const peerKeyPem =  csr ? csr.key : peerEnrollment.enrollment.key.toBytes();
    
            // Store all generated files
            await SysWrapper.createFile(`${peerMspPath}/admincerts/Admin@${this.options.org.fullName}-cert.pem`, orgAdminCertificate);
            await SysWrapper.createFile(`${peerMspPath}/cacerts/ca.${this.options.org.fullName}-cert.pem`, orgAdminRootCertificate);
            await SysWrapper.createFile(`${peerMspPath}/keystore/priv_sk`, peerKeyPem);
            await SysWrapper.createFile(`${peerMspPath}/signcerts/${peer.name}.${this.options.org.fullName}-cert.pem`, peerCertificate);
            
            // Generate TLS if it'w enabled
            if(this.options.org.isSecure) {
              await SysWrapper.copyFile(fromTlsCaCerts, `${peerMspPath}/tlscacerts/tlsca.${this.options.org.fullName}-cert.pem`);
    
              const peerTlsEnrollment = await this._generatePeerTlsFiles(peer, membership, peerEnrollment.secret, csr);
              const {
                certificate: peerTlsCertificate,
                rootCertificate: peerTlsRootCertificate
              } = peerTlsEnrollment;
              const peerTlsKey = csr ? csr.key : peerTlsEnrollment.key.toBytes();
    
              const peerTlsPath = getPeerTlsPath(this.options.networkRootPath, this.options.org, peer);
              await SysWrapper.createFile(`${peerTlsPath}/ca.crt`, peerTlsRootCertificate);
              await SysWrapper.createFile(`${peerTlsPath}/server.crt`, peerTlsCertificate);
              await SysWrapper.createFile(`${peerTlsPath}/server.key`, peerTlsKey);
            }
          }
        }
      }
      d('Register & Enroll Organization peers done !!!');

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  async buildCertificateORDERER(): Promise<boolean> {
    try {
     // await this.save();
      console.log(this.network.ordererOrganization[0].adminUserFull)
      await this.createMSPDirectoriesORDERER();

     const rootPath = this.network.options.networkConfigPath;
      const domain = this.network.ordererOrganization[0].domainName;
      const ordererMspId = this.network.ordererOrganization[0].mspName;
   /*
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
      const {
        key: ordAdminKey,
        certificate: ordAdminCert,
        rootCertificate: ordAdminRootCert
      } = ordererAdminEnrollment.enrollment;

      const adminMspPath = `${ordOrgRootPath}/users/${this.network.ordererOrganization[0].adminUserFull}/msp`;
      await SysWrapper.createFile(`${adminMspPath}/admincerts/${this.network.ordererOrganization[0].adminUserFull}-cert.pem`, ordAdminCert);
      await SysWrapper.createFile(`${adminMspPath}/cacerts/ca.${domain}-cert.pem`, ordAdminRootCert);
      await SysWrapper.createFile(`${adminMspPath}/keystore/priv_sk`, ordAdminKey.toBytes());
      await SysWrapper.createFile(`${adminMspPath}/signcerts/${this.network.ordererOrganization[0].adminUserFull}-cert.pem`, ordAdminCert);
      if(this.network.ordererOrganization[0].isSecure) {
        await SysWrapper.copyFile(tlsCaCerts, `${adminMspPath}/tlscacerts/tlsca.${this.network.ordererOrganization[0].domainName}-cert.pem`);
      }
      d('Enrolling Orderer Admin user done !!!');

      // Store orderer msp folder files
      await SysWrapper.createFile(`${ordOrgRootPath}/msp/admincerts/${this.network.ordererOrganization[0].adminUserFull}-cert.pem`, ordAdminCert);
      await SysWrapper.createFile(`${ordOrgRootPath}/msp/cacerts/ca.${domain}-cert.pem`, ordAdminRootCert);
      await SysWrapper.createFile(`${ordOrgRootPath}/ca/ca.${domain}-cert.pem`, ordAdminRootCert);

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
        await SysWrapper.createFile(`${ordererMspPath}/cacerts/ca.${domain}-cert.pem`, ordAdminRootCert);
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


  */

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  /**
   * Create folder needed for the MSP configuration for orderer entities
   */
  async createMSPDirectoriesORDERER(): Promise<boolean> {
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
   * Create folder needed for the MSP configuration for entities (user, peer, orderer)
   */
  async createMSPDirectories(): Promise<boolean> {
    try {
      const basePeerPath = `${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers`;

      // create base peer
      await ensureDir(basePeerPath);

      //create the tlsca folder
      await ensureDir(`${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/tlsca`);

      // create msp folder for every peer
      for (let peer of this.options.org.peers) {
        await SysWrapper.createFolder(`${basePeerPath}/${peer.name}.${this.options.org.fullName}`);
        await SysWrapper.createFolder(`${basePeerPath}/${peer.name}.${this.options.org.fullName}/tls`);
        await SysWrapper.createFolder(`${basePeerPath}/${peer.name}.${this.options.org.fullName}/msp`);
        await SysWrapper.createFolder(`${basePeerPath}/${peer.name}.${this.options.org.fullName}/msp/admincerts`);
        await SysWrapper.createFolder(`${basePeerPath}/${peer.name}.${this.options.org.fullName}/msp/cacerts`);
        await SysWrapper.createFolder(`${basePeerPath}/${peer.name}.${this.options.org.fullName}/msp/intermediatecerts`);
        await SysWrapper.createFolder(`${basePeerPath}/${peer.name}.${this.options.org.fullName}/msp/crls`);
        await SysWrapper.createFolder(`${basePeerPath}/${peer.name}.${this.options.org.fullName}/msp/keystore`);
        await SysWrapper.createFolder(`${basePeerPath}/${peer.name}.${this.options.org.fullName}/msp/signcerts`);
        await SysWrapper.createFolder(`${basePeerPath}/${peer.name}.${this.options.org.fullName}/msp/tlscacerts`);
        await SysWrapper.createFolder(`${basePeerPath}/${peer.name}.${this.options.org.fullName}/msp/tlsintermediatecerts`);
      }

      // create organization msp folder
      const organizationMspPath = getOrganizationMspPath(this.options.networkRootPath, this.options.org);
      await SysWrapper.createFolder(`${organizationMspPath}`);
      await SysWrapper.createFolder(`${organizationMspPath}/admincerts`);
      await SysWrapper.createFolder(`${organizationMspPath}/cacerts`);
      await SysWrapper.createFolder(`${organizationMspPath}/tlscacerts`);

      // create user admin folder
      const organizationUserPath = getOrganizationUsersPath(this.options.networkRootPath, this.options.org);
      await SysWrapper.createFolder(`${organizationUserPath}`);
      await SysWrapper.createFolder(`${organizationUserPath}/${this.options.org.adminUserFull}`);
      await SysWrapper.createFolder(`${organizationUserPath}/${this.options.org.adminUserFull}/msp`);
      await SysWrapper.createFolder(`${organizationUserPath}/${this.options.org.adminUserFull}/msp/cacerts`);
      await SysWrapper.createFolder(`${organizationUserPath}/${this.options.org.adminUserFull}/msp/keystore`);
      await SysWrapper.createFolder(`${organizationUserPath}/${this.options.org.adminUserFull}/msp/signcerts`);
      await SysWrapper.createFolder(`${organizationUserPath}/${this.options.org.adminUserFull}/msp/tlscacerts`);

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }


  /**
   * File defining NoeOU configuration
   * @param filePath
   */
  async generateConfigOUFile(filePath: string): Promise<boolean> {
    const content = `
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/ca.${this.options.org.fullName}-cert.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/ca.${this.options.org.fullName}-cert.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/ca.${this.options.org.fullName}-cert.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/ca.${this.options.org.fullName}-cert.pem
    OrganizationalUnitIdentifier: orderer
        `;

    try {
      await SysWrapper.createFile(filePath, content);
      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  /**
   * Generate MSP files for the CA Admin
   * @param membership
   * @param mspId
   * @private
   */
  async _generateCAAdminOrgMspFiles(membership: Membership, mspId: string): Promise<IEnrollResponse> {
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
   * Generate the MSP Files for the selected peer
   * Generate and store the NodeOU's files into peer MSP Path
   * @param peer
   * @param membership
   * @param mspId
   * @param csr
   * @private
   */
  private async _generatePeerMspFiles(peer: Peer, membership: Membership, mspId: string, csr?: CSR): Promise<IEnrollSecretResponse> {
    try {
      // add config.yaml file
      await this.generateConfigOUFile(`${getPeerMspPath(this.options.networkRootPath, this.options.org, peer)}/config.yaml`);

      // enroll & store peer crypto credentials
      const params: UserParams = {
        enrollmentID: `${peer.name}.${this.options.org.fullName}`,
        enrollmentSecret: `${peer.name}pw`,
        role: HLF_CLIENT_ACCOUNT_ROLE.peer,
        maxEnrollments: MAX_ENROLLMENT_COUNT,
        affiliation: ''
      };
      
      const peerEnrollmentResponse = await membership.addUser(params, mspId, csr);
      d(`Peer ${peer.name} is enrolled successfully`);
      
      return peerEnrollmentResponse;
      
    } catch (err) {
      e(`Error enrolling the peer ${peer.name}`);
      e(err);
      throw err;
    }
  }

  /**
   * Generate the TLS Files for the selected peer
   * Generate and store the NodeOU's files into peer MSP Path
   * @param peer
   * @param membership
   * @param secret
   * @param csr
   * @private
   */
  private async _generatePeerTlsFiles(peer: Peer, membership: Membership, secret: string, csr?: CSR): Promise<IEnrollmentResponse> {
    try {
      // enroll & store peer crypto credentials
      const request: IEnrollmentRequest = {
        enrollmentID: `${peer.name}.${this.options.org.fullName}`,
        enrollmentSecret: secret,
        profile: 'tls',
      };
      const peerTlsEnrollment = await membership.enrollTls(request, csr);
      d(`Peer TLS ${peer.name} is enrolled successfully`);

      return peerTlsEnrollment;
    } catch (err) {
      e(`Error tls enrolling the peer ${peer.name}`);
      e(err);
      throw err;
    }
  }

  /**
   * Generate the MSP file for the organization admin
   * @param organization
   * @param membership
   * @param mspId
   * @private
   */
  private async _generateAdminOrgFiles(organization: Organization, membership: Membership, mspId: string): Promise<IEnrollSecretResponse> {
    try {
      const organizationUserPath = getOrganizationUsersPath(this.options.networkRootPath, this.options.org);
      const mspAdminPath = `${organizationUserPath}/${this.options.org.adminUserFull}/msp`;

      // add config.yaml file
      await this.generateConfigOUFile(`${mspAdminPath}/config.yaml`);

      // enroll & store organization admin credentials
      const params: UserParams = {
        enrollmentID: `${organization.adminUser}`,
        enrollmentSecret: `${organization.adminUserPass}`,
        role: HLF_CLIENT_ACCOUNT_ROLE.admin,
        maxEnrollments: MAX_ENROLLMENT_COUNT,
        affiliation: ''
      };
      
      const orgAdminEnrollmentResponse = await membership.addUser(params, mspId);
      d(`Admin Organization is enrolled successfully`);
      return orgAdminEnrollmentResponse;
      
    } catch (err) {
      e(`Error enrolling the organization admin`);
      e(err);
      throw err;
    }
  }



}
