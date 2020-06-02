import { ensureDir } from 'fs-extra';
import { DockerComposeYamlOptions } from '../../utils/data-type';
import { d, e } from '../../utils/logs';
import { SysWrapper } from '../../utils/sysWrapper';
import { BaseGenerator } from '../base';
import { ClientConfig } from '../../core/hlf/helpers';
import { EnrollmentResponse, Membership, UserParams } from '../../core/hlf/membership';
import { HLF_CLIENT_ACCOUNT_ROLE } from '../../utils/constants';
import { Peer } from '../../models/peer';
import { IEnrollmentRequest, IEnrollResponse } from 'fabric-ca-client';
import createFile = SysWrapper.createFile;
import { Orderer } from '../../models/orderer';
import { Utils } from '../../utils/utils';
import getPeerMspPath = Utils.getPeerMspPath;
import getOrdererMspPath = Utils.getOrdererMspPath;
import getPeerTlsPath = Utils.getPeerTlsPath;
import getOrganizationMspPath = Utils.getOrganizationMspPath;
import getOrdererTlsPath = Utils.getOrdererTlsPath;

export interface AdminCAAccount {
  name: string;
  password: string;
}

/**
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
    url: http://${this.options.org.engineHost(this.options.org.ca.options.engineName)}:${this.options.org.ca.options.ports}
    httpOptions:
      verify: false
    tlsCACerts:
      path: ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/ca
    registrar:
      - enrollId: ${this.admin.name}
        enrollSecret: ${this.admin.password}
    caName: ${this.options.org.caName}    
 `;

  constructor(filename: string,
              path: string,
              private options?: DockerComposeYamlOptions,
              private admin: AdminCAAccount = { name: 'admin', password: 'adminpw' }) {
    super(filename, path);
  }

  /**
   * Build all certificates for the network to be started
   */
  async buildCertificate(): Promise<Boolean> {
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
      const {
        key: caAdminKey,
        certificate: caAdminCertificate,
        rootCertificate: caAdminRootCertificate
      } = caAdminEnrollment;
      d('Enroll CA Registrar done !!!');

      d('Create Organization MSP');
      const orgMspPath = getOrganizationMspPath(this.options.networkRootPath, this.options.org);
      await createFile(`${orgMspPath}/cacerts/ca.${this.options.org.fullName}-cert.pem`, caAdminRootCertificate);
      await this.generateConfigOUFile(`${orgMspPath}/config.yaml`);

      // generate NodeOU & enroll & store peer crypto credentials
      d('Register & Enroll Organization peers');
      for (const peer of this.options.org.peers) {
        const peerMspPath = getPeerMspPath(this.options.networkRootPath, this.options.org, peer);
        const peerEnrollment = await this._generatePeerMspFiles(peer, membership, orgMspId);
        // TODO check enrollment
        const {
          key: peerKey,
          certificate: peerCertificate,
          rootCertificate: peerRootCertificate
        } = peerEnrollment.enrollment;

        // Store all generated files
        await createFile(`${peerMspPath}/admincerts/admin@${this.options.org.fullName}-cert.pem`, caAdminCertificate);
        await createFile(`${peerMspPath}/cacerts/ca.${this.options.org.fullName}-cert.pem`, caAdminRootCertificate);
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

      // enroll & store orderer crypto credentials
      d('Register & Enroll Organization orderers');
      for (const orderer of this.options.org.orderers) {
        const ordererMspPath = getOrdererMspPath(this.options.networkRootPath, this.options.org, orderer);
        const ordererEnrollment = await this._generateOrdererMspFiles(orderer, membership, orgMspId);
        // TODO check enrollment
        const {
          key: ordererKey,
          certificate: ordererCertificate,
          rootCertificate: ordererRootCertificate
        } = ordererEnrollment.enrollment;

        await createFile(`${ordererMspPath}/admincerts/admin@${this.options.org.fullName}-cert.pem`, caAdminCertificate);
        await createFile(`${ordererMspPath}/cacerts/ca.${this.options.org.fullName}-cert.pem`, caAdminRootCertificate);
        await createFile(`${ordererMspPath}/keystore/priv_sk`, ordererKey.toBytes());
        await createFile(`${ordererMspPath}/signcerts/${orderer.name}.${this.options.org.fullName}-cert.pem`, ordererCertificate);

        // Generate TLS files if it's enabled
        if(this.options.org.isSecure) {
          const ordererTlsEnrollment = await this._generateOrdererTlsFiles(orderer, membership, ordererEnrollment.secret);
          const {
            key: ordererTlsKey,
            certificate: ordererTlsCertificate,
            rootCertificate: ordererTlsRootCertificate
          } = ordererTlsEnrollment;

          const ordererTlsPath = getOrdererTlsPath(this.options.networkRootPath, this.options.org, orderer);
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
   * Create folder needed for the MSP configuration for entities (user, peer, orderer)
   */
  async createMSPDirectories(): Promise<boolean> {
    try {
      const basePeerPath = `${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers`;

      // create base peer
      await ensureDir(basePeerPath);

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

      // Orderer section
      const baseOrdererPath = `${this.options.networkRootPath}/organizations/ordererOrganizations/${this.options.org.fullName}/orderers`;

      // create base peer
      await ensureDir(baseOrdererPath);

      await SysWrapper.createFolder(`${this.options.networkRootPath}/organizations/ordererOrganizations/${this.options.org.fullName}/ca`);
      await SysWrapper.createFolder(`${this.options.networkRootPath}/organizations/ordererOrganizations/${this.options.org.fullName}/msp`);
      await SysWrapper.createFolder(`${this.options.networkRootPath}/organizations/ordererOrganizations/${this.options.org.fullName}/msp/admincerts`);
      await SysWrapper.createFolder(`${this.options.networkRootPath}/organizations/ordererOrganizations/${this.options.org.fullName}/msp/cacerts`);
      await SysWrapper.createFolder(`${this.options.networkRootPath}/organizations/ordererOrganizations/${this.options.org.fullName}/msp/tlscacerts`);

      // create msp folder for every orderer
      for (let orderer of this.options.org.orderers) {
        await SysWrapper.createFolder(`${baseOrdererPath}/${orderer.name}.${this.options.org.fullName}`);
        await SysWrapper.createFolder(`${baseOrdererPath}/${orderer.name}.${this.options.org.fullName}/tls`);
        await SysWrapper.createFolder(`${baseOrdererPath}/${orderer.name}.${this.options.org.fullName}/msp`);
        await SysWrapper.createFolder(`${baseOrdererPath}/${orderer.name}.${this.options.org.fullName}/msp/admincerts`);
        await SysWrapper.createFolder(`${baseOrdererPath}/${orderer.name}.${this.options.org.fullName}/msp/cacerts`);
        await SysWrapper.createFolder(`${baseOrdererPath}/${orderer.name}.${this.options.org.fullName}/msp/intermediatecerts`);
        await SysWrapper.createFolder(`${baseOrdererPath}/${orderer.name}.${this.options.org.fullName}/msp/crls`);
        await SysWrapper.createFolder(`${baseOrdererPath}/${orderer.name}.${this.options.org.fullName}/msp/keystore`);
        await SysWrapper.createFolder(`${baseOrdererPath}/${orderer.name}.${this.options.org.fullName}/msp/signcerts`);
        await SysWrapper.createFolder(`${baseOrdererPath}/${orderer.name}.${this.options.org.fullName}/msp/tlscacerts`);
        await SysWrapper.createFolder(`${baseOrdererPath}/${orderer.name}.${this.options.org.fullName}/msp/tlsintermediatecerts`);
      }

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
  private async _generateCAAdminOrgMspFiles(membership: Membership, mspId: string): Promise<IEnrollResponse> {
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
        enrollmentID: `${orderer.name}.${this.options.org.fullName}`,
        enrollmentSecret: `${orderer.name}pw`,
        role: HLF_CLIENT_ACCOUNT_ROLE.orderer,
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
        enrollmentID: `${orderer.name}.${this.options.org.fullName}`,
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
