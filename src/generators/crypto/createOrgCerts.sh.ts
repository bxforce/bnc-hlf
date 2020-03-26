import { BaseGenerator } from '../base';
import { DockerComposeYamlOptions } from '../../utils/data-type';
import { e } from '../../utils/logs';
import { SysWrapper } from '../../utils/sysWrapper';
import execContent = SysWrapper.execContent;

export class CreateOrgCertsShGenerator extends BaseGenerator {
  contents = `
export PATH=${this.options.networkRootPath}/fabric-binaries/${this.options.envVars.FABRIC_VERSION}/bin:${this.options.networkRootPath}:$PATH
export FABRIC_CFG_PATH=${this.options.networkRootPath}  
  
echo "Enroll the CA admin"
mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/
export FABRIC_CA_CLIENT_HOME=${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/
fabric-ca-client enroll -u https://rca-${this.options.org.name}-admin:rca-${this.options.org.name}-adminpw@localhost:7054 --caname rca.${
    this.options.org.name
  } --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/tls-cert.pem

${this.options.org.peers
  .map(
    peer =>
      `
        echo "Register ${peer.name}"
        fabric-ca-client register --caname rca.${this.options.org.name} --id.name ${peer.name}.${this.options.org.fullName} --id.secret ${peer.name}pw --id.type peer --id.attrs '"hf.Registrar.Roles=peer"' --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/tls-cert.pem
`
  )
  .join(' ')}        

echo "Register user"
fabric-ca-client register --caname rca.${this.options.org.name} --id.name ${this.options.org.name}User1 --id.secret ${
    this.options.org.name
  }User1Pw --id.type client --id.attrs '"hf.Registrar.Roles=client"' --tls.certfiles ${
    this.options.networkRootPath
  }/organizations/fabric-ca/${this.options.org.name}/tls-cert.pem

echo "Register the org admin"
fabric-ca-client register --caname rca.${this.options.org.name} --id.name ${this.options.org.name}Admin --id.secret ${
    this.options.org.name
  }AdminPw --id.type admin --id.attrs '"hf.Registrar.Roles=admin"' --tls.certfiles ${
    this.options.networkRootPath
  }/organizations/fabric-ca/${this.options.org.name}/tls-cert.pem


mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers
${this.options.org.peers
  .map(
    peer =>
      `
        mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}
        
         echo "## Generate the ${peer.name} msp"
        fabric-ca-client enroll -u https://${peer.name}.${this.options.org.fullName}:${peer.name}pw@0.0.0.0:7054 --caname rca.${this.options.org.name} -M ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/msp --csr.hosts ${peer.name}.${this.options.org.fullName} --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/tls-cert.pem

        cp ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/msp/config.yaml ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/msp/config.yaml

        echo "## Generate the ${peer.name}-tls certificates"
        fabric-ca-client enroll -u https://${peer.name}.${this.options.org.fullName}:${peer.name}pw@0.0.0.0:7054 --caname rca.${this.options.org.name} -M ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls --enrollment.profile tls --csr.hosts ${peer.name}.${this.options.org.fullName} --csr.hosts localhost --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/tls-cert.pem
        
        
        cp ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls/tlscacerts/* ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls/ca.crt
        cp ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls/signcerts/* ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls/server.crt
        cp ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls/keystore/* ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls/server.key

        mkdir ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/msp/tlscacerts
        cp ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls/tlscacerts/* ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/msp/tlscacerts/ca.crt

        mkdir ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/tlsca
        cp ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls/tlscacerts/* ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/tlsca/tlsca.${this.options.org.fullName}-cert.pem

        mkdir ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/ca
        cp ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/msp/cacerts/* ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/ca/ca.${this.options.org.fullName}-cert.pem

`
  )
  .join(' ')}      

mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/users
mkdir -p ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/users/${this.options.org.name}User1@${
    this.options.org.fullName
  }

echo "## Generate the ${this.options.org.name} user msp"
fabric-ca-client enroll -u https://${this.options.org.name}User1:${this.options.org.name}User1Pw@0.0.0.0:7054 --caname rca.${
    this.options.org.name
  } -M ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/users/User1@${
    this.options.org.fullName
  }/msp --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/tls-cert.pem

mkdir -p organizations/peerOrganizations/${this.options.org.fullName}/users/${this.options.org.name}Admin@${this.options.org.fullName}

echo "## Generate the ${this.options.org.name} admin msp"
fabric-ca-client enroll -u https://${this.options.org.name}Admin:${this.options.org.name}AdminPw@0.0.0.0:7054 --caname rca.${
    this.options.org.name
  } -M ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/users/${this.options.org.name}Admin@${
    this.options.org.fullName
  }/msp --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/tls-cert.pem
cp ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/msp/config.yaml ${
    this.options.networkRootPath
  }/organizations/peerOrganizations/${this.options.org.fullName}/users/${this.options.org.name}Admin@${
    this.options.org.fullName
  }/msp/config.yaml
 
  `;

  constructor(filename: string, path: string, private options?: DockerComposeYamlOptions) {
    super(filename, path);
  }

  async setBinariesInPath(): Promise<Boolean> {
    try {
      const command = `
      # export PATH=${this.options.networkRootPath}/fabric-binaries/${this.options.envVars.FABRIC_VERSION}/bin:${this.options.networkRootPath}:$PATH
      export PATH=${this.options.networkRootPath}/fabric-samples/bin:$PATH
      export FABRIC_CFG_PATH=${this.options.networkRootPath}
      `;

      await execContent(command);

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  async buildCertificate(): Promise<Boolean> {
    try {
      await this.save();
      await this.run();

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }
}
