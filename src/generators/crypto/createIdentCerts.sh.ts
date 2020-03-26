import { BaseGenerator } from '../base';
import { DockerComposeYamlOptions } from '../../utils/data-type';
import { e } from '../../utils/logs';

export class CreateIdentCertsShGenerator extends BaseGenerator {
  contents = `
export PATH=${this.options.networkRootPath}/fabric-binaries/${this.options.envVars.FABRIC_VERSION}/bin:${this.options.networkRootPath}:$PATH
export FABRIC_CFG_PATH=${this.options.networkRootPath}

echo "[Step 1] Enroling client and registering peer and user identitities"

# export FABRIC-CA_CLIENT_TLS_CERTFILES=${this.options.networkRootPath}/${this.options.org.name}/tls/ca/crypto/ca-cert.pem
mkdir -p ${this.options.networkRootPath}/${this.options.org.name}/ca/admin/msp
export FABRIC_CA_CLIENT_HOME=${this.options.networkRootPath}/${this.options.org.name}/ca/admin
fabric-ca-client enroll -d -u http://rca-${this.options.org.name}-admin:rca-${this.options.org.name}-adminpw@0.0.0.0:7054

${this.options.org.peers
  .map(
    peer =>
      `fabric-ca-client register --id.name ${peer.name}.${this.options.org.fullName} --id.secret ${peer.name}Passwd --id.type peer --id.affiliation ${this.options.org.name} -u http://0.0.0.0:7054`
  )
  .join('')}
    
fabric-ca-client register --id.name Admin@${this.options.org.fullName} --id.secret adminPasswd --id.type user --id.affiliation ${
    this.options.org.name
  } -u http://0.0.0.0:7054
fabric-ca-client register --id.name user@${this.options.org.fullName} --id.secret userPasswd --id.type user --id.affiliation ${
    this.options.org.name
  } -u http://0.0.0.0:7054

echo "[Step 2] Creating peer certs"
# enroll also again profile TLS (fabric-ca ==> operation guide)

${this.options.org.peers
  .map(
    peer =>
      `
mkdir ${this.options.networkRootPath}/${this.options.org.name}/${peer.name}/msp
export FABRIC_CA_CLIENT_HOME=${this.options.networkRootPath}/${this.options.org.name}/${peer.name}
export FABRIC_CA_CLIENT_MSPDIR=msp
fabric-ca-client enroll -d -m ${peer.name}.${this.options.org.fullName} -u http://${peer.name}.${this.options.org.fullName}:${peer.name}Passwd@0.0.0.0:7054
`
  )
  .join(' ')}

echo "[Step 3] Creating org admin certs"
mkdir ${this.options.networkRootPath}/${this.options.org.name}/Admin@${this.options.org.fullName}/msp
export FABRIC_CA_CLIENT_HOME=${this.options.networkRootPath}/${this.options.org.name}/Admin@${this.options.org.fullName}
export FABRIC_CA_CLIENT_MSPDIR=msp
fabric-ca-client enroll -d -m Admin@${this.options.org.fullName} -u http://Admin@${this.options.org.fullName}:adminPasswd@0.0.0.0:7054

mkdir ${this.options.networkRootPath}/${this.options.org.name}/Admin@${this.options.org.fullName}/msp/admincerts
cp ${this.options.networkRootPath}/${this.options.org.name}/Admin@${this.options.org.fullName}/msp/signcerts/*.pem ${
    this.options.networkRootPath
  }/${this.options.org.name}/Admin@${this.options.org.fullName}/msp/admincerts/

mkdir ${this.options.networkRootPath}/${this.options.org.name}/peer0/msp/admincerts
cp ${this.options.networkRootPath}/${this.options.org.name}/admin/msp/signcerts/*.pem ${this.options.networkRootPath}/${
    this.options.org.name
  }/peer0/msp/admincerts/${this.options.org.name}-admin-cert.pem

# fabric-ca-client certificate list --id Admin@po1.fabric.com --store $FABRIC_CFG_PATH/crypto-config/peerOrganizations/po1.fabric.com/users/Admin@po1.fabric.com/msp/admincerts

echo "[Step] Completed"
  `;

  constructor(filename: string, path: string, private options?: DockerComposeYamlOptions) {
    super(filename, path);
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
