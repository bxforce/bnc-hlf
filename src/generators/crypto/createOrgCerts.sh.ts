import { exec } from 'shelljs';
import { ensureDir } from 'fs-extra';
import { BaseGenerator } from '../base';
import { DockerComposeYamlOptions } from '../../utils/data-type';
import { e } from '../../utils/logs';
import { SysWrapper } from '../../utils/sysWrapper';

export class CreateOrgCertsShGenerator extends BaseGenerator {
  contents = `
export PATH=${this.options.networkRootPath}/fabric-binaries/${this.options.envVars.FABRIC_VERSION}/bin:${this.options.networkRootPath}:$PATH
export FABRIC_CFG_PATH=${this.options.networkRootPath}  
  
echo "Enroll the CA admin"
mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/
export FABRIC_CA_CLIENT_HOME=${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/
fabric-ca-client enroll -u https://rca-${this.options.org.name}-admin:rca-${this.options.org.name}-adminpw@0.0.0.0:7054 \
  --caname ${this.options.org.caName} \
  --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/crypto/tls-cert.pem
    
echo 'NodeOUs:
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
    OrganizationalUnitIdentifier: orderer' > ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/msp/config.yaml

${this.options.org.peers
    .map(peer => `
echo "Register ${peer.name}"
fabric-ca-client register -u https://0.0.0.0:7054 \
  --caname ${this.options.org.caName} \
  --id.name ${peer.name}.${this.options.org.fullName} \
  --id.secret ${peer.name}pw \
  --id.type peer \
  --id.attrs '"hf.Registrar.Roles=peer"' \
  --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/crypto/tls-cert.pem
`).join(' ')}        

echo "Register user"
fabric-ca-client register \
  --caname ${this.options.org.caName} \
  --id.name ${this.options.org.name}User1 \
  --id.secret ${ this.options.org.name}User1Pw \
  --id.type client --id.attrs '"hf.Registrar.Roles=client"' \
  --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/crypto/tls-cert.pem

echo "Register the org admin"
fabric-ca-client register \
  --caname ${this.options.org.caName} \
  --id.name ${this.options.org.name}Admin \
  --id.secret ${this.options.org.name}AdminPw \
  --id.type admin --id.attrs '"hf.Registrar.Roles=admin"' \
  --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/crypto/tls-cert.pem

mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers

mkdir ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/msp/tlscacerts
mkdir ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/tlsca
mkdir ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/ca

${this.options.org.peers
    .map(peer =>`
    
mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}
        
echo "## Generate the ${peer.name} msp"
fabric-ca-client enroll \
  -u https://${peer.name}.${this.options.org.fullName}:${peer.name}pw@0.0.0.0:7054 \
  --caname ${this.options.org.caName} \
  -M ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/msp \
  --csr.hosts ${peer.name}.${this.options.org.fullName} \
  --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/crypto/tls-cert.pem

cp ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/msp/config.yaml \
  ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/msp/config.yaml

echo "## Generate the ${peer.name}-tls certificates"
fabric-ca-client enroll \
  -u https://${peer.name}.${this.options.org.fullName}:${peer.name}pw@0.0.0.0:7054 \
  --caname ${this.options.org.caName} \
  -M ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls \
  --enrollment.profile tls \
  --csr.hosts ${peer.name}.${this.options.org.fullName} \
  --csr.hosts localhost \
  --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/crypto/tls-cert.pem
        
cp ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls/tlscacerts/* \
  ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls/ca.crt
cp ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls/signcerts/* \
  ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls/server.crt
cp ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls/keystore/* \
  ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls/server.key

cp ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls/tlscacerts/* \
  ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/msp/tlscacerts/ca.crt

cp ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls/tlscacerts/* \
  ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/tlsca/tlsca.${this.options.org.fullName}-cert.pem

cp ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/msp/cacerts/* \
  ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/ca/ca.${this.options.org.fullName}-cert.pem
`).join(' ')}      

mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/users
mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/users/${this.options.org.name}User1@${this.options.org.fullName}

echo "## Generate the ${this.options.org.name} user msp"
fabric-ca-client enroll \
  -u https://${this.options.org.name}User1:${this.options.org.name}User1Pw@0.0.0.0:7054 \
  --caname ${this.options.org.caName} \
  -M ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/users/${this.options.org.name}User1@${this.options.org.fullName}/msp \
  --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/crypto/tls-cert.pem

mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/users/${this.options.org.name}Admin@${this.options.org.fullName}
echo "## Generate the ${this.options.org.name} admin msp"
fabric-ca-client enroll \
  -u https://${this.options.org.name}Admin:${this.options.org.name}AdminPw@0.0.0.0:7054 \
  --caname ${this.options.org.caName} \
  -M ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/users/${this.options.org.name}Admin@${this.options.org.fullName}/msp \
  --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/crypto/tls-cert.pem

cp ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/msp/config.yaml \
  ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/users/${this.options.org.name}Admin@${this.options.org.fullName}/msp/config.yaml
 
  `;

  /**
   * Constructor
   * @param filename
   * @param path
   * @param options
   */
  constructor(filename: string, path: string, private options?: DockerComposeYamlOptions) {
    super(filename, path);
  }

  /**
   * Create and prepare crypto folder
   */
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

  /**
   * Create directories (as above) using shell commands
   */
  async createDirectoriesShell() {
    try {
      const commands = `
      mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers
      
      ${this.options.org.peers
        .map(
          peer => `
          mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}
          mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/msp/tlscacerts
          mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/tlsca
          mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/ca
`
        )
        .join(' ')}      
      
      mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/users/${
        this.options.org.name
      }User1@${this.options.org.fullName}
      mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/users/${
        this.options.org.name
      }Admin@${this.options.org.fullName}
      `;

      return exec(commands);
    } catch (err) {
      e(err);
    }
  }

  async buildCertificate(execute = true): Promise<Boolean> {
    try {
      await this.save();
      // await this.createDirectories();
      // await this.createDirectoriesShell();

      if (execute) {
        await this.run();
      }

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }
}
