import {BaseGenerator} from './base';
import {Organization} from '../models/organization';

export class DockerComposeOrdererYamlOptions {
  networkRootPath: string;
  composeNetwork: string;
  org: Organization;
  envVars: {
    FABRIC_VERSION: string,
    THIRDPARTY_VERSION: string
  };
}

export class DockercomposeOrdererYamlGenerator extends BaseGenerator {
  contents = `version: '2'
networks:
  ${this.options.composeNetwork}:

services:
    # Orderer
    orderer.${this.options.org.domainName}:
        container_name: orderer.${this.options.org.domainName}
        image: hyperledger/fabric-orderer:${this.options.envVars.FABRIC_VERSION}
        environment:
            - ORDERER_GENERAL_LOGLEVEL=debug
            - ORDERER_GENERAL_LISTENADDRESS=0.0.0.0
            - ORDERER_GENERAL_GENESISMETHOD=file
            - ORDERER_GENERAL_GENESISFILE=/etc/hyperledger/configtx/genesis.block
            - ORDERER_GENERAL_LOCALMSPID=OrdererMSP
            - ORDERER_GENERAL_LOCALMSPDIR=/etc/hyperledger/msp/orderer/msp
        working_dir: /opt/gopath/src/github.com/hyperledger/fabric/orderer
        command: orderer
        ports:
            - 7050:7050
        volumes:
            - ${this.options.networkRootPath}/artifacts/config/:/etc/hyperledger/configtx
            - ${this.options.networkRootPath}/artifacts/crypto-config/ordererOrganizations/${this.options.org.domainName}/orderers/orderer.${this.options.org.domainName}/:/etc/hyperledger/msp/orderer
            - ${this.options.networkRootPath}/artifacts/crypto-config/peerOrganizations/${this.options.org.name}.${this.options.org.domainName}/peers/peer0.${this.options.org.name}.${this.options.org.domainName}/:/etc/hyperledger/msp/peer${this.options.org.name}
        networks:
            - ${this.options.composeNetwork}
    `;

  constructor(filename: string, path: string, private options: DockerComposeOrdererYamlOptions) {
    super(filename, path);
  }

  // async discoverCert(org: Organization): Promise<string> {
  //   let files = await SysWrapper.enumFilesInFolder(join(this.options.networkRootPath,
  //     `/artifacts/crypto-config/peerOrganizations/${org.name}.${org.domainName}/ca`));
  //
  //   return files.find(x => x.indexOf('_sk') !== -1);
  // }
}