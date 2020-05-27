import { ensureDir } from 'fs-extra';
import { DockerComposeYamlOptions } from '../../utils/data-type';
import { d, e } from '../../utils/logs';
import { SysWrapper } from '../../utils/sysWrapper';
// import {CaClient} from '../../core/hlf/ca_client';
import { BaseGenerator } from '../base';
import { ClientConfig } from '../../core/hlf/helpers';
import { Membership, UserParams } from '../../core/hlf/membership';

export interface AdminCAAccount {
  name: string;
  password: string;
}

// TODO update the ca name from the config input file
/**
 *
 */
export class OrgCertsGenerator extends BaseGenerator {
  contents = `
name: "bnc"
x-type: "hlfv1"
description: "Blockchain network composer"
version: "1.0"

client:
  # organization: Org1
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

  // async registerPeers(caClient: CaClient) {
  //   for (const peer of this.options.org.peers) {
  //     const id = peer.name + '.' + this.options.org.fullName;
  //     const secret = peer.name + 'pw';
  //     const affiliation = this.options.org.fullName; // TODO to be verified
  //     const role = 'peer';
  //     const mspId = this.options.org.name + 'MSP'; // TODO to be verified
  //     const attrs = [{hf: {Registrar: {Roles: 'peer'}}}];
  //     const adminId = 'rca-' + this.options.org.name + '-admin';
  //     await caClient.registerUser(id, secret, affiliation, mspId, role, adminId, attrs);
  //   }
  // }
  //
  // async enrollCaAdmin(caClient: CaClient, adminId: string, adminSecret: string){
  //   const id = adminId ? adminId : 'rca-' + this.options.org.name + '-admin';
  //   const secret = adminSecret ? adminSecret : 'rca-' + this.options.org.name + '-adminpw';
  //   const mspId = this.options.org.name + 'MSP'; // TODO to be verified
  //   const caCertPath = this.options.networkRootPath + '/organizations/fabric-ca/' + this.options.org.name + '/crypto/tls-cert.pem';
  //   const enrollment = await caClient.enrollAdmin(id, secret, mspId, caCertPath);
  //   // TODO build the crypto tree based on the enrollment object
  //   /*l('certificate\n' + enrollment.certificate); // admin certificate
  //   l('rootCertificate\n' + enrollment.rootCertificate); // ca certificate
  //   l('toBytes\n' + enrollment.key.toBytes()); // admin private key */
  // }

  async buildCertificate(): Promise<Boolean> {
    try {
      await this.save();
      await this.createDirectories();

      const config: ClientConfig = {
        networkProfile: this.filePath,
        admin: {
          name: this.admin.name,
          secret: this.admin.password
        }
      };
      const membership = new Membership(config);
      await membership.initCaClient(this.options.org.caName);

      const isEnrolled = await membership.enrollCaAdmin();
      d(`The admin account is enrolled ${isEnrolled}`);

      // Enroll the peers
      // const orgMspId = ;
      // for (const peer of this.options.org.peers) {
      //   const params: UserParams = {
      //     enrollmentID: x,
      //     enrollmentSecret:,
      //     role: ,
      //     affiliation: ,
      //     attrs: ,
      //   };
      //   await membership.addUser()
      //
      //
      //
      //
      //   const id = peer.name + '.' + this.options.org.fullName;
      //   const secret = peer.name + 'pw';
      //   const affiliation = this.options.org.fullName; // TODO to be verified
      //   const role = 'peer';
      //   const mspId = this.options.org.name + 'MSP'; // TODO to be verified
      //   const attrs = [{ hf: { Registrar: { Roles: 'peer' } } }];
      //   const adminId = 'rca-' + this.options.org.name + '-admin';
      //   await caClient.registerUser(id, secret, affiliation, mspId, role, adminId, attrs);
      // }

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
}
