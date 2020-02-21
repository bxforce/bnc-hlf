import { BaseGenerator } from '../base';

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
    container_name: ca.root`;

  constructor(filename: string, path: string) {
    super(filename, path);
  }
}
