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

import { ensureDir } from 'fs-extra';
import { DockerComposeYamlOptions } from '../../utils/data-type';
import { d, e } from '../../utils/logs';
import { SysWrapper } from '../../utils/sysWrapper';
import { BaseGenerator } from '../base';
import { ClientConfig } from '../../core/hlf/helpers';
import { EnrollmentResponse, Membership, UserParams } from '../../core/hlf/membership';
import { HLF_CLIENT_ACCOUNT_ROLE, MAX_ENROLLMENT_COUNT } from '../../utils/constants';
import { Peer } from '../../models/peer';
import { IEnrollmentRequest, IEnrollResponse } from 'fabric-ca-client';
import createFile = SysWrapper.createFile;
import { Utils } from '../../utils/utils';
import getPeerMspPath = Utils.getPeerMspPath;
import getPeerTlsPath = Utils.getPeerTlsPath;
import getOrganizationMspPath = Utils.getOrganizationMspPath;
import getPropertiesPath = Utils.getPropertiesPath;
import copyFile = SysWrapper.copyFile;
import getOrganizationUsersPath = Utils.getOrganizationUsersPath;
import { Organization } from '../../models/organization';

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
    url: http${this.options.org.isSecure ? 's' : ''}://${this.options.org.engineHost(this.options.org.ca.options.engineName)}:${this.options.org.ca.options.ports}
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
      const caAdminEnrollment = await this._generateCAAdminOrgMspFiles(membership, orgMspId);
      // const {
      //   key: caAdminKey,
      //   certificate: caAdminCertificate,
      //   rootCertificate: caAdminRootCertificate
      // } = caAdminEnrollment;
      d('Enroll CA Registrar done !!!');

      // copy ca tls certs if secure enabled
      const orgMspPath = getOrganizationMspPath(this.options.networkRootPath, this.options.org);
      const fromTlsCaCerts = `${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/crypto/ca-cert.pem`;
      if(this.options.org.isSecure) {
        const toFile = `${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/tlsca/tlsca.${this.options.org.fullName}-cert.pem`;
        await copyFile(fromTlsCaCerts, toFile);
      }

      d('Start register & enroll organization admin');
      const orgAdminEnrollment = await this._generateAdminOrgFiles(this.options.org, membership, orgMspId);
      const {
        key: orgAdminKey,
        certificate: orgAdminCertificate,
        rootCertificate: orgAdminRootCertificate
      } = orgAdminEnrollment.enrollment;

      // Store generated files
      const organizationUserPath = getOrganizationUsersPath(this.options.networkRootPath, this.options.org);
      const mspAdminPath = `${organizationUserPath}/Admin@${this.options.org.fullName}/msp`;
      await createFile(`${mspAdminPath}/cacerts/ca.${this.options.org.fullName}-cert.pem`, orgAdminRootCertificate);
      await createFile(`${mspAdminPath}/keystore/priv_sk`, orgAdminKey.toBytes());
      await createFile(`${mspAdminPath}/signcerts/Admin@${this.options.org.fullName}-cert.pem`, orgAdminCertificate);
      if(this.options.org.isSecure) {
        await copyFile(fromTlsCaCerts, `${mspAdminPath}/tlscacerts/tlsca.${this.options.org.fullName}-cert.pem`);
        await copyFile(fromTlsCaCerts, `${orgMspPath}/tlscacerts/tlsca.${this.options.org.fullName}-cert.pem`);
      }
      d('Register & enroll organization admin dne !!!');

      d('Create Organization MSP');
      await createFile(`${orgMspPath}/cacerts/ca.${this.options.org.fullName}-cert.pem`, orgAdminRootCertificate);
      await createFile(`${orgMspPath}/admincerts/Admin@${this.options.org.fullName}-cert.pem`, orgAdminCertificate);
      await this.generateConfigOUFile(`${orgMspPath}/config.yaml`);

      // generate NodeOU & enroll & store peer crypto credentials
      d('Start register & enroll Organization peers...');
      for (const peer of this.options.org.peers) {
        const peerMspPath = getPeerMspPath(this.options.networkRootPath, this.options.org, peer);
        const peerEnrollment = await this._generatePeerMspFiles(peer, membership, orgMspId);
        const {
          key: peerKey,
          certificate: peerCertificate,
          rootCertificate: peerRootCertificate
        } = peerEnrollment.enrollment;

        // Store all generated files
        await createFile(`${peerMspPath}/admincerts/Admin@${this.options.org.fullName}-cert.pem`, orgAdminCertificate);
        await createFile(`${peerMspPath}/cacerts/ca.${this.options.org.fullName}-cert.pem`, orgAdminRootCertificate);
        await createFile(`${peerMspPath}/keystore/priv_sk`, peerKey.toBytes());
        await createFile(`${peerMspPath}/signcerts/${peer.name}.${this.options.org.fullName}-cert.pem`, peerCertificate);

        // Generate TLS if it'w enabled
        if(this.options.org.isSecure) {
          const peerTlsEnrollment = await this._generatePeerTlsFiles(peer, membership, peerEnrollment.secret);
          const {
            key: peerTlsKey,
            certificate: peerTlsCertificate,
            rootCertificate: peerTlsRootCertificate
          } = peerTlsEnrollment;

          const peerTlsPath = getPeerTlsPath(this.options.networkRootPath, this.options.org, peer);
          await createFile(`${peerTlsPath}/ca.crt`, peerTlsRootCertificate);
          await createFile(`${peerTlsPath}/server.crt`, peerTlsCertificate);
          await createFile(`${peerTlsPath}/server.key`, peerTlsKey.toBytes());
        }
      }
      d('Register & Enroll Organization peers done !!!');

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
      await createFile(filePath, content);
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
   * @private
   */
  private async _generatePeerMspFiles(peer: Peer, membership: Membership, mspId: string): Promise<EnrollmentResponse> {
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
      const peerEnrollmentResponse = await membership.addUser(params, mspId);
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
   * @private
   */
  private async _generatePeerTlsFiles(peer: Peer, membership: Membership, secret: string): Promise<IEnrollResponse> {
    try {
      // enroll & store peer crypto credentials
      const request: IEnrollmentRequest = {
        enrollmentID: `${peer.name}.${this.options.org.fullName}`,
        enrollmentSecret: secret,
        profile: 'tls'
      };
      const peerTlsEnrollment = await membership.enrollTls(request);
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
  private async _generateAdminOrgFiles(organization: Organization, membership: Membership, mspId: string): Promise<EnrollmentResponse> {
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
