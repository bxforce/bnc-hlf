import { BaseGenerator } from '../base';
import { DockerComposeYamlOptions } from '../../utils/data-type';
import { e } from '../../utils/logs';

export class CreateIdentCertsShGenerator extends BaseGenerator {
  contents = `
export PATH=${this.options.networkRootPath}/fabric-binaries/${this.options.envVars.FABRIC_VERSION}/bin:${this.options.networkRootPath}:$PATH
export FABRIC_CFG_PATH=${this.options.networkRootPath}
mkdir -p 

echo "[Step 1] Enroling client and registering peer and user identitities"

# export FABRIC-CA_CLIENT_TLS_CERTFILES=${this.options.networkRootPath}/${this.options.org.name}/tls/ca/crypto/ca-cert.pem
export FABRIC_CA_CLIENT_HOME=${this.options.networkRootPath}/${this.options.org.name}/ca/admin
fabric-ca-client enroll -d -u http://rca-${this.options.org.name}-admin:rca-${this.options.org.name}-adminpw@0.0.0.0:7054
fabric-ca-client register --id.name ${this.options.org.firstPeerFullName} --id.secret peerPasswd --id.type peer --id.affiliation ${this.options.org.name} -u http://0.0.0.0:7054
fabric-ca-client register --id.name Admin@${this.options.org.fullName} --id.secret adminPasswd --id.type user --id.affiliation ${this.options.org.name} -u http://0.0.0.0:7054
fabric-ca-client register --id.name user@${this.options.org.fullName} --id.secret userPasswd --id.type user --id.affiliation ${this.options.org.name} -u http://0.0.0.0:7054

echo "[Step 2] Creating peer certs"
# enroll also again profile TLS (fabric-ca ==> operation guide)

export FABRIC_CA_CLIENT_HOME=${this.options.networkRootPath}/${this.options.org.name}/peer0
export FABRIC_CA_CLIENT_MSPDIR=msp
fabric-ca-client enroll -d -m ${this.options.org.firstPeerFullName} -u http://${this.options.org.firstPeerFullName}:peerPasswd@0.0.0.0:7054

echo "[Step 3] Creating org admin certs"
export FABRIC_CA_CLIENT_HOME=${this.options.networkRootPath}/${this.options.org.name}/admin
export FABRIC_CA_CLIENT_MSPDIR=msp
fabric-ca-client enroll -d -m Admin@${this.options.org.fullName} -u http://Admin@${this.options.org.fullName}:adminPasswd@0.0.0.0:7054

mkdir ${this.options.networkRootPath}/${this.options.org.name}/admin/msp/admincerts
cp ${this.options.networkRootPath}/${this.options.org.name}/admin/msp/signcerts/*.pem ${this.options.networkRootPath}/${this.options.org.name}/admin/msp/admincerts/

mkdir ${this.options.networkRootPath}/${this.options.org.name}/peer0/msp/admincerts
cp ${this.options.networkRootPath}/${this.options.org.name}/admin/msp/signcerts/*.pem ${this.options.networkRootPath}/${this.options.org.name}/peer0/msp/admincerts/${this.options.org.name}-admin-cert.pem

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
