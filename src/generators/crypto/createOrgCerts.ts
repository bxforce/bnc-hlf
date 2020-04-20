import {ensureDir} from 'fs-extra';
import {DockerComposeYamlOptions} from '../../utils/data-type';
import {e} from '../../utils/logs';
import {SysWrapper} from '../../utils/sysWrapper';
import {Caclient} from '../../core/hlf/ca_client';

export class OrgCertsGenerator {
  // replaced or to be replaced commands
  contents = `
export PATH=${this.options.networkRootPath}/fabric-binaries/${this.options.envVars.FABRIC_VERSION}/bin:${this.options.networkRootPath}:$PATH
export FABRIC_CFG_PATH=${this.options.networkRootPath}  
  
echo "Enroll the CA admin"
*--------* mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/
*--------* export FABRIC_CA_CLIENT_HOME=${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/
fabric-ca-client enroll 
  -u https://rca-${this.options.org.name}-admin:rca-${this.options.org.name}-adminpw@0.0.0.0:7054 \
  --caname rca.${this.options.org.name} \
  --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/crypto/tls-cert.pem


${this.options.org.peers
    .map(peer => `
echo "Register ${peer.name}"
fabric-ca-client register -u https://0.0.0.0:7054 \
  --caname rca.${this.options.org.name} \
  --id.name ${peer.name}.${this.options.org.fullName} \
  --id.secret ${peer.name}pw \
  --id.type peer \
  --id.attrs '"hf.Registrar.Roles=peer"' \
  --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/crypto/tls-cert.pem
`).join(' ')}

    
 `;

  constructor(private options?: DockerComposeYamlOptions) { }

  async registerPeers(caclient: Caclient) {
    for (const peer of this.options.org.peers) {
      const id = peer.name + '.' + this.options.org.fullName;
      const secret = peer.name + 'pw';
      const affiliation = this.options.org.fullName; // TODO to be verified
      const role = 'peer';
      const mspId = this.options.org.name + 'MSP'; // TODO to be verified
      const attrs = [{hf: {Registrar: {Roles: 'peer'}}}];
      const adminId = 'rca-' + this.options.org.name + '-admin';
      await caclient.registerUser(id, secret, affiliation, mspId, role, adminId, attrs);
    }
  }

  async enrollCaAdmin(caclient: Caclient){
    const id = 'rca-' + this.options.org.name + '-admin';
    const secret = 'rca-' + this.options.org.name + '-adminpw';
    const mspId = this.options.org.name + 'MSP'; // TODO to be verified
    const caCertPath = this.options.networkRootPath + '/organizations/fabric-ca/' + this.options.org.name + '/crypto/tls-cert.pem';
    const enrollment = await caclient.enrollAdmin(id, secret, mspId, caCertPath);
    // TODO build the crypto tree based on the enrollment object
    /*l('certificate\n' + enrollment.certificate); // admin certificate
    l('rootCertificate\n' + enrollment.rootCertificate); // ca certificate
    l('toBytes\n' + enrollment.key.toBytes()); // admin private key */
  }

  async buildCertificate(): Promise<Boolean> {
    try {
      await this.createDirectories();
      const ccpPath = '/home/ahmed/projects/bnc-tools/tests/templates/ccp-test.yaml';
      const walletDirectoryName = 'wallets';
      const caclient = new Caclient('rca-'+this.options.org.name, walletDirectoryName, ccpPath);
      await this.enrollCaAdmin(caclient);
      await this.registerPeers(caclient);

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  async createDirectories(): Promise<Boolean> {
    try {
      // await createFolder(`${this.options.networkRootPath}/organizations`);
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
