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

import { BaseGenerator } from '../base';
import { AdminCAAccount } from './createOrgCerts';
import { Network } from '../../models/network';
import { d, e } from '../../utils/logs';
import { ensureDir } from 'fs-extra';
import { SysWrapper } from '../../utils/sysWrapper';
import { Orderer } from '../../models/orderer';
import { EnrollmentResponse, Membership, UserParams } from '../../core/hlf/membership';
import { ConsensusType, HLF_CLIENT_ACCOUNT_ROLE, MAX_ENROLLMENT_COUNT } from '../../utils/constants';
import { IEnrollmentRequest, IEnrollResponse } from 'fabric-ca-client';
import { ClientConfig } from '../../core/hlf/helpers';
import { Utils } from '../../utils/utils';
import createFile = SysWrapper.createFile;
import getOrdererOrganizationRootPath = Utils.getOrdererOrganizationRootPath;
import getOrdererMspPath = Utils.getOrdererMspPath;
import getOrdererTlsPath = Utils.getOrdererTlsPath;

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
    url: http${this.network.ordererOrganization.isSecure ? 's' : ''}://${this.network.ordererOrganization.ca.options.host}:${this.network.ordererOrganization.ca.options.ports}
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
    super(filename, path);
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

      d('Enroll Orderer CA Registrar & Create Orderer global MSP credentials');
      const caAdminEnrollment = await OrdererCertsGenerator._generateCAAdmin(membership, ordererMspId);
      const {
        key: adminKey,
        certificate: adminCert,
        rootCertificate: adminRootCert
      } = caAdminEnrollment;

      const ordOrgRootPath = getOrdererOrganizationRootPath(rootPath, this.network.ordererOrganization.domainName);
      await createFile(`${ordOrgRootPath}/msp/admincerts/admin@${domain}-cert.pem`, adminCert);
      await createFile(`${ordOrgRootPath}/msp/cacerts/ca.${domain}-cert.pem`, adminRootCert);
      await createFile(`${ordOrgRootPath}/ca/ca.${domain}-cert.pem`, adminRootCert);
      // TODO add here tls certificate in case secure

      d('Register & Enroll orderers');
      for (const orderer of this.network.ordererOrganization.orderers) {
        const ordererEnrollment = await this._generateOrdererMspFiles(orderer, membership, ordererMspId);
        const {
          key: ordererKey,
          certificate: ordererCert,
          rootCertificate: ordererRootCert
        } = ordererEnrollment.enrollment;

        const baseOrdererPath = `${this.network.options.networkConfigPath}/organizations/ordererOrganizations/${domain}/orderers`;
        const ordererMspPath = `${baseOrdererPath}/${this.network.ordererOrganization.ordererFullName(orderer)}/msp`;
        const ordererFullName = this.network.ordererOrganization.ordererFullName(orderer);

        await createFile(`${ordererMspPath}/admincerts/admin@${domain}-cert.pem`, adminCert);
        await createFile(`${ordererMspPath}/cacerts/ca.${domain}-cert.pem`, adminRootCert);
        await createFile(`${ordererMspPath}/keystore/priv_sk`, ordererKey.toBytes());
        await createFile(`${ordererMspPath}/signcerts/${ordererFullName}-cert.pem`, ordererCert);

        // Generate TLS file if it's enabled
        if (this.network.ordererOrganization.isSecure || this.network.options.consensus === ConsensusType.RAFT) {
          const ordererTlsEnrollment = await this._generateOrdererTlsFiles(orderer, membership, ordererEnrollment.secret);
          const {
            key: ordererTlsKey,
            certificate: ordererTlsCertificate,
            rootCertificate: ordererTlsRootCertificate
          } = ordererTlsEnrollment;

          const ordererTlsPath = `${baseOrdererPath}/${this.network.ordererOrganization.ordererFullName(orderer)}/tls`;
          await createFile(`${ordererTlsPath}/ca.crt`, ordererTlsRootCertificate);
          await createFile(`${ordererTlsPath}/server.crt`, ordererTlsCertificate);
          await createFile(`${ordererTlsPath}/server.key`, ordererTlsKey.toBytes());
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
      await SysWrapper.createFolder(`${orderOrgRootPath}/msp`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/msp/admincerts`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/msp/cacerts`);
      await SysWrapper.createFolder(`${orderOrgRootPath}/msp/tlscacerts`);

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
   * @private
   */
  private async _generateOrdererMspFiles(orderer: Orderer, membership: Membership, mspId: string): Promise<EnrollmentResponse> {
    try {
      // enroll & store orderer crypto credentials
      const params: UserParams = {
        enrollmentID: `${this.network.ordererOrganization.ordererFullName(orderer)}`,
        enrollmentSecret: `${orderer.name}pw`,
        role: HLF_CLIENT_ACCOUNT_ROLE.orderer,
        maxEnrollments: MAX_ENROLLMENT_COUNT,
        affiliation: ''
      };
      const ordererEnrollmentResponse = await membership.addUser(params, mspId);
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
   * @private
   */
  private async _generateOrdererTlsFiles(orderer: Orderer, membership: Membership, secret: string): Promise<IEnrollResponse> {
    try {
      // enroll & store peer crypto credentials
      const request: IEnrollmentRequest = {
        enrollmentID: `${this.network.ordererOrganization.ordererFullName(orderer)}`,
        enrollmentSecret: secret,
        profile: 'tls'
      };
      const ordererTlsEnrollment = await membership.enrollTls(request);
      d(`Orderer TLS ${orderer.name} is enrolled successfully`);

      return ordererTlsEnrollment;
    } catch (err) {
      e(`Error tls enrolling the orderer ${orderer.name}`);
      e(err);
      throw err;
    }
  }
}
