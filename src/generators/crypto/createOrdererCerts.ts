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
import { CSR, IEnrollSecretResponse } from '../../utils/datatype';
import { CertificateCsr } from '../utils/certificateCsr';
import { Utils } from '../../utils/helper';
import getOrdererOrganizationRootPath = Utils.getOrdererOrganizationRootPath;
import getOrdererMspPath = Utils.getOrdererMspPath;
import getOrdererTlsPath = Utils.getOrdererTlsPath;
import getPropertiesPath = Utils.getPropertiesPath;
import { SysWrapper } from '../../utils/sysWrapper';
import { d, e } from '../../utils/logs';

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
  organization: ${this.network.ordererOrganization.name}
  credentialStore:
    path: ${this.network.options.networkConfigPath}/wallets/organizations/${this.network.ordererOrganization.fullName}
    cryptoStore:
      path: ${this.network.options.networkConfigPath}/wallets/organizations/${this.network.ordererOrganization.fullName}

certificateAuthorities:
  ${this.network.ordererOrganization.caName}:
    url: http${this.network.ordererOrganization.isSecure ? 's' : ''}://${this.network.ordererOrganization.ca.options.host}:${this.network.ordererOrganization.ca.options.port}
    httpOptions:
      verify: false
    tlsCACerts:
      path: ${this.network.options.networkConfigPath}/organizations/ordererOrganizations/${this.network.ordererOrganization.domainName}/msp/tlscacerts
    registrar:
      - enrollId: ${this.admin.name}
        enrollSecret: ${this.admin.password}
    caName: ${this.network.ordererOrganization.caName}  
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
      const domain = this.network.ordererOrganization.domainName;
      const ordererMspId = this.network.ordererOrganization.mspName;

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
      await membership.initCaClient(this.network.ordererOrganization.caName);
      d('CA initialized done');

      d('Start enrolling Orderer CA Registrar...');
      await OrdererCertsGenerator._generateCAAdmin(membership, ordererMspId);
      d('Enrolling Orderer CA Registrar done !!!');

      // copy ca tls certs if secure enabled
      const ordOrgRootPath = getOrdererOrganizationRootPath(rootPath, this.network.ordererOrganization.domainName);
      const tlsCaCerts = `${this.network.options.networkConfigPath}/organizations/fabric-ca/${this.network.ordererOrganization.name}/crypto/ca-cert.pem`;
      if(this.network.ordererOrganization.isSecure) {
        await SysWrapper.copyFile(tlsCaCerts, `${ordOrgRootPath}/tlsca/tlsca.${this.network.ordererOrganization.domainName}-cert.pem`);
        await SysWrapper.copyFile(tlsCaCerts, `${ordOrgRootPath}/msp/tlscacerts/tlsca.${this.network.ordererOrganization.domainName}-cert.pem`);
      }

      d('Start enrolling Orderer Admin user...');
      const ordererAdminEnrollment = await this._generateOrdererAdminFiles(membership, ordererMspId);
      const {
        key: ordAdminKey,
        certificate: ordAdminCert,
        rootCertificate: ordAdminRootCert
      } = ordererAdminEnrollment.enrollment;

      const adminMspPath = `${ordOrgRootPath}/users/${this.network.ordererOrganization.adminUserFull}/msp`;
      await SysWrapper.createFile(`${adminMspPath}/admincerts/${this.network.ordererOrganization.adminUserFull}-cert.pem`, ordAdminCert);
      await SysWrapper.createFile(`${adminMspPath}/cacerts/ca.${domain}-cert.pem`, ordAdminRootCert);
      await SysWrapper.createFile(`${adminMspPath}/keystore/priv_sk`, ordAdminKey.toBytes());
      await SysWrapper.createFile(`${adminMspPath}/signcerts/${this.network.ordererOrganization.adminUserFull}-cert.pem`, ordAdminCert);
      if(this.network.ordererOrganization.isSecure) {
        await SysWrapper.copyFile(tlsCaCerts, `${adminMspPath}/tlscacerts/tlsca.${this.network.ordererOrganization.domainName}-cert.pem`);
      }
      d('Enrolling Orderer Admin user done !!!');

      // Store orderer msp folder files
      await SysWrapper.createFile(`${ordOrgRootPath}/msp/admincerts/${this.network.ordererOrganization.adminUserFull}-cert.pem`, ordAdminCert);
      await SysWrapper.createFile(`${ordOrgRootPath}/msp/cacerts/ca.${domain}-cert.pem`, ordAdminRootCert);
      await SysWrapper.createFile(`${ordOrgRootPath}/ca/ca.${domain}-cert.pem`, ordAdminRootCert);

      d('Start register & enroll Orderers...');
      for (const orderer of this.network.ordererOrganization.orderers) {
        // get peer csr
        const certificateCsr = new CertificateCsr(this.network);
        const csr = await certificateCsr.generateCsrHost(orderer);

        const ordererEnrollment = await this._generateOrdererMspFiles(orderer, membership, ordererMspId, csr);
        const ordererCert = ordererEnrollment.enrollment.certificate;
        const ordererKey = csr ? csr.key : ordererEnrollment.enrollment.key.toBytes();

        const baseOrdererPath = `${this.network.options.networkConfigPath}/organizations/ordererOrganizations/${domain}/orderers`;
        const ordererMspPath = `${baseOrdererPath}/${orderer.fullName}/msp`;

        await SysWrapper.createFile(`${ordererMspPath}/admincerts/${this.network.ordererOrganization.adminUserFull}-cert.pem`, ordAdminCert);
        await SysWrapper.createFile(`${ordererMspPath}/cacerts/ca.${domain}-cert.pem`, ordAdminRootCert);
        await SysWrapper.createFile(`${ordererMspPath}/keystore/priv_sk`, ordererKey);
        await SysWrapper.createFile(`${ordererMspPath}/signcerts/${orderer.fullName}-cert.pem`, ordererCert);

        // Generate TLS file if it's enabled
        if (this.network.ordererOrganization.isSecure || this.network.options.consensus === ConsensusType.RAFT) {
          await SysWrapper.copyFile(tlsCaCerts, `${ordererMspPath}/tlscacerts/tlsca.${this.network.ordererOrganization.domainName}-cert.pem`);

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
      const orderOrgRootPath = getOrdererOrganizationRootPath(this.network.options.networkConfigPath, this.network.ordererOrganization.domainName);

      await ensureDir(orderOrgRootPath);

      await SysWrapper.createFolder(`${orderOrgRootPath}/ca`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/tlsca`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/msp`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/msp/admincerts`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/msp/cacerts`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/msp/tlscacerts`);

      // create user admin folder msp
      await SysWrapper.createFolder(`${orderOrgRootPath}/users`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/users/${this.network.ordererOrganization.adminUserFull}`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/users/${this.network.ordererOrganization.adminUserFull}/msp`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/users/${this.network.ordererOrganization.adminUserFull}/msp/admincerts`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/users/${this.network.ordererOrganization.adminUserFull}/msp/cacerts`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/users/${this.network.ordererOrganization.adminUserFull}/msp/keystore`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/users/${this.network.ordererOrganization.adminUserFull}/msp/signcerts`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/users/${this.network.ordererOrganization.adminUserFull}/msp/tlscacerts`);

      // create msp folder for every orderer
      for (let orderer of this.network.ordererOrganization.orderers) {
        const ordererMspPath = getOrdererMspPath(this.network.options.networkConfigPath, this.network.ordererOrganization, orderer);

        await SysWrapper.createFolder(`${ordererMspPath}`);
        await SysWrapper.createFolder(`${ordererMspPath}/admincerts`);
        await SysWrapper.createFolder(`${ordererMspPath}/cacerts`);
        await SysWrapper.createFolder(`${ordererMspPath}/keystore`);
        await SysWrapper.createFolder(`${ordererMspPath}/signcerts`);
        await SysWrapper.createFolder(`${ordererMspPath}/tlscacerts`);

        const ordererTlsPath = `${getOrdererTlsPath(this.network.options.networkConfigPath, this.network.ordererOrganization, orderer)}`;
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
        enrollmentID: `${this.network.ordererOrganization.adminUser}`,
        enrollmentSecret: `${this.network.ordererOrganization.adminUserPass}`,
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
