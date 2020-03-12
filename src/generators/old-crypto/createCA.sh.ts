import * as chalk from 'chalk';
import * as sudo from 'sudo-prompt';
import { BaseGenerator } from '../base';
import { DockerComposeYamlOptions } from '../../utils/data-type';
import { DockerEngine } from '../../agents/docker-agent';
import { e } from '../../utils/logs';

export class CreateCAShGenerator extends BaseGenerator {
  contents = `
export REGISTRAR_DIR=${this.options.networkRootPath}
export FABRIC_CA_CLIENT_HOME=$REGISTRAR_DIR

export PATH=${this.options.networkRootPath}/fabric-binaries/${this.options.envVars.FABRIC_VERSION}/bin:${this.options.networkRootPath}:$PATH
export FABRIC_CFG_PATH=${this.options.networkRootPath}

export ORG_DIR=${this.options.networkRootPath}/crypto-config/peerOrganizations/${this.options.org.fullName}
export PEER_TLS=${this.options.networkRootPath}/peertls
export PEER_DIR=$ORG_DIR/peers/${this.options.org.firstPeerFullName}
export REGISTRAR_DIR=$ORG_DIR/users/admin
export ADMIN_DIR=$ORG_DIR/users/Admin@${this.options.org.fullName}
export TLS=$ORG_DIR/tlsca
mkdir -p $ORG_DIR/ca $ORG_DIR/msp $PEER_DIR $REGISTRAR_DIR $ADMIN_DIR $TLS
mkdir ${this.options.networkRootPath}/certsICA

fabric-ca-client enroll -m admin -u http://adminCA:adminpw@0.0.0.0:7054 

fabric-ca-client register --id.name ca.interm.${this.options.org.fullName} --id.type client \\
 --id.secret adminpw --csr.names C=ES,ST=Madrid,L=Madrid,O=${this.options.org.fullName} \\
 --csr.cn ica.dummyOrg -m ca.interm.${this.options.org.fullName} --id.attrs  '"hf.IntermediateCA=true"' -u http://0.0.0.0:7054 
`;

  dockerEngine: DockerEngine;

  constructor(filename: string, path: string, private options: DockerComposeYamlOptions, private engine?: DockerEngine) {
    super(filename, path);
    this.dockerEngine = engine ? engine : new DockerEngine({ socketPath: '/var/run/docker.sock' });
  }

  copyAsRoot() {
    const options = {
      name: 'BNC'
    };

    const command = `cp -r ${this.options.networkRootPath}/certsICA/* ${this.options.networkRootPath}/crypto-config/peerOrganizations/${this.options.org.fullName}/ca`;

    return new Promise((resolved, rejected) => {
      sudo.exec(command, options, (error, stdout, stderr) => {
        if (error) {
          rejected(error);
        }

        if (stderr) {
          console.error(chalk.red(stderr));
        }

        resolved(true);
      });
    });
  }

  async buildCaCertificate() {
    try {
      // register the ca root admin (save and execute the shell file
      await this.save();
      await this.run();

      // start the intermediate ca container
      await this.dockerEngine.composeOne(`ca.interm.${this.options.org.fullName}`, {
        cwd: this.path,
        config: this.filename
      });

      // Copy
      this.copyAsRoot();
    } catch (err) {
      e(err);
    }
  }
}
