import { BaseGenerator } from '../base';
import { DockerComposeYamlOptions } from '../../utils/data-type';
import { DockerEngine } from '../../agents/docker-agent';
import { e } from '../../utils/logs';
import * as sudo from 'sudo-prompt';
import * as chalk from 'chalk';

export class DockerComposeCaGenerator extends BaseGenerator {
  contents = `
version: '2'

networks:
  ${this.options.composeNetwork}:
    external: true

services:
  ca.${this.options.org.name}.tls:
    container_name: ca.${this.options.org.name}.tls
    image: hyperledger/fabric-ca
    command: sh -c 'fabric-ca-server start -d -b tls-ca-admin:tls-ca-adminpw --port 7052 --cfg.identities.allowremove'
    environment:
      - FABRIC_CA_SERVER_HOME=/tmp/hyperledger/fabric-ca/crypto
      - FABRIC_CA_SERVER_CA_NAME=ca.${this.options.org.name}.tls
      - FABRIC_CA_SERVER_TLS_ENABLED=false
      - FABRIC_CA_SERVER_CSR_CN=ca.${this.options.org.name}.tls
      - FABRIC_CA_SERVER_CSR_HOSTS=0.0.0.0
      # - FABRIC_CA_SERVER_CA_KEYFILE=/tmp/hyperledger/fabric-ca/ca/ca.tls-key.pem
      # - FABRIC_CA_SERVER_CA_CERTFILE=/tmp/hyperledger/fabric-ca/ca/ca.tls-cert.pem
      - FABRIC_CA_SERVER_DEBUG=true
    ports:
      - "7052:7052"
    volumes:
      - ${this.options.networkRootPath}/${this.options.org.name}/tls/ca:/tmp/hyperledger/fabric-ca
    networks:
      - ${this.options.composeNetwork}    

  
  rca.${this.options.org.name}:
    container_name: rca.${this.options.org.name}
    image: hyperledger/fabric-ca
    command: sh -c 'fabric-ca-server start -d -b rca-${this.options.org.name}-admin:rca-${this.options.org.name}-adminpw --port 7054 --cfg.identities.allowremove'
    environment:
      - FABRIC_CA_SERVER_HOME=/tmp/hyperledger/fabric-ca/crypto
      - FABRIC_CA_SERVER_CA_NAME=rca.${this.options.org.name}
      - FABRIC_CA_SERVER_TLS_ENABLED=false
      - FABRIC_CA_SERVER_CSR_CN=ca.tls
      - FABRIC_CA_SERVER_CSR_HOSTS=0.0.0.0
      - FABRIC_CA_SERVER_DEBUG=true
    ports:
      - "7054:7054"
    volumes:
      - ${this.options.networkRootPath}/${this.options.org.name}/ca:/tmp/hyperledger/fabric-ca
    networks:
      - ${this.options.composeNetwork}    
  `;

  constructor(filename: string, path: string, private options?: DockerComposeYamlOptions, private readonly dockerEngine?: DockerEngine) {
    super(filename, path);
    if (!this.dockerEngine) {
      this.dockerEngine = new DockerEngine({ socketPath: '/var/run/docker.sock' });
    }
  }

  async startTlsCa() {
    try {
      await this.dockerEngine.composeOne(`ca.${this.options.org.name}.tls`, { cwd: this.path, config: this.filename });
      await this.changeOwnership(`${this.options.networkRootPath}/${this.options.org.name}`);
    } catch (err) {
      e(err);
    }
  }

  async startOrgCa() {
    try {
      await this.dockerEngine.composeOne(`rca.${this.options.org.name}`, { cwd: this.path, config: this.filename });
      await this.changeOwnership(`${this.options.networkRootPath}/${this.options.org.name}`);
    } catch (err) {
      e(err);
    }
  }

  private changeOwnership(folder: string) {
    const options = {
      name: 'BNC'
    };

    const command = `chown -R 1001:1001 ${folder}`;

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
}
