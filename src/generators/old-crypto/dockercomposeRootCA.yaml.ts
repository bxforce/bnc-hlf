import { exec } from 'shelljs';
import { BaseGenerator } from '../base';
import { DockerComposeYamlOptions } from '../../utils/data-type';
import { DockerEngine } from '../../agents/docker-agent';

export class DockercomposeRootCAYamlGenerator extends BaseGenerator {
  contents = `version: '2'

services:
  ca.root:
    image: hyperledger/fabric-ca
    environment:
      - FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server
      - FABRIC_CA_SERVER_CA_NAME=ca.root
      - FABRIC_CA_SERVER_TLS_ENABLED=false
      - FABRIC_LOGGING_SPEC=debug
    ports:
      - "7054:7054"
    command: sh -c 'fabric-ca-server start  -b adminCA:adminpw -d'
    container_name: ca.root

  ca.interm.${this.options.org.fullName}:
    image: hyperledger/fabric-ca
    environment:
      - FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server-config
      - FABRIC_CA_SERVER_CA_NAME=ca.interm.${this.options.org.fullName}
      - FABRIC_CA_SERVER_TLS_ENABLED=false
      - FABRIC_LOGGING_SPEC=debug
    ports:
      - "8054:7054"
    command: sh -c 'fabric-ca-server start  -b admin:adminpw -d -u http://ca.interm.${this.options.org.fullName}:adminpw@ca.root:7054'
    volumes:  
     - ${this.options.networkRootPath}/certsICA:/etc/hyperledger/fabric-ca-server
     - ${this.options.networkRootPath}/certsICA:/etc/hyperledger/fabric-ca-server-config
    container_name: ca.interm.${this.options.org.fullName}
`;

  dockerEngine: DockerEngine;

  constructor(filename: string, path: string, private options: DockerComposeYamlOptions) {
    super(filename, path);
    this.dockerEngine = new DockerEngine({ socketPath: '/var/run/docker.sock' });
  }

  async startRootCa() {
    await this.dockerEngine.composeUpAll({
      cwd: this.path,
      log: true,
      config: this.filePath
    });
    // return exec(`docker-compose -f ${this.filePath} up -d ca.root`, { silent: true });
  }

  async stopRootCa() {
    await this.dockerEngine.composeDown({
      cwd: this.path,
      log: true,
      config: this.filePath
    });
    // return exec(`docker-compose -f ${this.filePath} up -d ca.root`, { silent: true });
  }
}
