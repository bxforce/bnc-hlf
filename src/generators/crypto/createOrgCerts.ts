import { ensureDir } from 'fs-extra';
import { DockerComposeYamlOptions } from '../../utils/data-type';
import { d, e } from '../../utils/logs';
import { SysWrapper } from '../../utils/sysWrapper';
import { BaseGenerator } from '../base';
import { ClientConfig } from '../../core/hlf/helpers';
import { Membership, UserParams } from '../../core/hlf/membership';
import { HLF_CLIENT_ACCOUNT_ROLE } from '../../utils/constants';
import { Peer } from '../../models/peer';
import { IEnrollResponse } from 'fabric-ca-client';
import createFile = SysWrapper.createFile;

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
      // await this.createDirectories();
      await this.createMSPDirectories();

      // Instantiate Membership instance
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

      // Generate & store admin certificate
      const caAdminEnrollment = await this._generateCAAdminOrgMspFiles(membership, orgMspId);
      const {
        key: caAdminKey,
        certificate: caAdminCertificate,
        rootCertificate: caAdminRootCertificate
      } = caAdminEnrollment;

      // generate NodeOU & enroll & store peer crypto credentials
      for (const peer of this.options.org.peers) {
        const peerMspPath = this._getPeerMspPath(peer);
        const peerEnrollment = await this._generateMspFiles(peer, membership, orgMspId);
        // TODO check enrollment
        const {
          key: peerKey,
          certificate: peerCertificate,
          rootCertificate: peerRootCertificate
        } = peerEnrollment;

        await createFile(`${peerMspPath}/admincerts/admin@${this.options.org.fullName}-cert.pem`, caAdminCertificate);
        await createFile(`${peerMspPath}/cacerts/ca.${this.options.org.fullName}-cert.pem`, caAdminRootCertificate);

        await createFile(`${peerMspPath}/keystore/priv_sk`, peerKey.toBytes());
        await createFile(`${peerMspPath}/signcerts/${peer.name}.${this.options.org.fullName}-cert.pem`, peerCertificate);
      }

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  async createDirectories(): Promise<Boolean> {
    try {
      await ensureDir(`${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers`);

      for (let peer of this.options.org.peers) {
        await SysWrapper.createFolder(
          `${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}`
        );
        await SysWrapper.createFolder(
          `${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/msp/tlscacerts`
        );
        await SysWrapper.createFolder(`${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/tlsca`);
        await SysWrapper.createFolder(`${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/ca`);
      }

      await SysWrapper.createFolder(
        `${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/users/${this.options.org.name}User1@${this.options.org.fullName}`
      );
      await SysWrapper.createFolder(
        `${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/users/${this.options.org.name}Admin@${this.options.org.fullName}`
      );

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

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  /**
   * File defining NoeOU configuration
   * @param peer
   */
  async generateConfigOUFile(/*filePath: string,*/ peer: Peer): Promise<boolean> {
    const peerMspPath = this._getPeerMspPath(peer);
    const filePath = `${peerMspPath}/config.yaml`;

    const content = `
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/0.0.0.0-7054-${this.options.org.caName}.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/0.0.0.0-7054-${this.options.org.caName}.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/0.0.0.0-7054-${this.options.org.caName}.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/0.0.0.0-7054-${this.options.org.caName}.pem
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
    } catch(err) {
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
  private async _generateMspFiles(peer: Peer, membership: Membership, mspId: string): Promise<IEnrollResponse> {
    try {
      // add config.yaml file
      await this.generateConfigOUFile(peer);

      // enroll & store peer crypto credentials
      const params: UserParams = {
        enrollmentID: `${peer.name}.${this.options.org.fullName}`,
        enrollmentSecret: `${peer.name}pw`,
        role: HLF_CLIENT_ACCOUNT_ROLE.peer,
        affiliation: ''
      };
      const peerEnrollment = await membership.addUser(params, mspId);
      d(`Peer ${peer.name} is enrolled successfully`);

      // const {
      //   key: peerKey,
      //   certificate: peerCertificate,
      //   rootCertificate: peerRootCertificate
      // } = peerEnrollment;
      // await createFile(`${peerMspPath}/keystore/priv_sk`, peerKey.toBytes());
      // await createFile(`${peerMspPath}/signcerts/${peer.name}.${this.options.org.fullName}-cert.pem`, peerCertificate);

      return peerEnrollment;
    } catch(err) {
      e(`Error enrolling the peer ${peer.name}`);
      e(err);
      throw err;
    }
  }

  /**
   * Retrieve the peer msp path
   * @param peer
   * @private
   */
  private _getPeerMspPath(peer: Peer): string {
    const basePeerPath = this._getMspPath();
    return `${basePeerPath}/${peer.name}.${this.options.org.fullName}/msp`;
  }

  /**
   * Get the root msp path of peers
   * @private
   */
  private _getMspPath(): string {
    return `${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers`;
  }
}
