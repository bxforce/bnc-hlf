/*
Copyright 2020 IRT SystemX

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { DockerComposeYamlOptions } from '../../utils/data-type';
import { BaseGenerator } from '../base';
import { e } from '../../utils/logs';
import { Utils } from '../../utils/utils';
import { Network } from '../../models/network';
import { ConsensusType } from '../../utils/constants';
import getDockerComposePath = Utils.getDockerComposePath;

/**
 * Class responsible to generate base Peer and Orderer compose file
 *
 * @author wassim.znaidi@gmail.com
 */
export class DockerComposeEntityBaseGenerator extends BaseGenerator {
  /* docker compose template content */
  contents = `
version: '2'

services:
  peer-base:
    image: hyperledger/fabric-peer:${this.options.envVars.FABRIC_VERSION}
    environment:
      - CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock
      # the following setting starts chaincode containers on the same
      # bridge network as the peers
      # https://docs.docker.com/compose/networking/
      - CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=${this.options.composeNetwork}
      - FABRIC_LOGGING_SPEC=INFO
      #- FABRIC_LOGGING_SPEC=DEBUG
      - CORE_PEER_TLS_ENABLED=${this.options.org.isSecure}
      - CORE_PEER_GOSSIP_USELEADERELECTION=true
      - CORE_PEER_GOSSIP_ORGLEADER=false
      - CORE_PEER_PROFILE_ENABLED=true
      - CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt
      - CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key
      - CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
      # Allow more time for chaincode container to build on install.
      - CORE_CHAINCODE_EXECUTETIMEOUT=300s
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric/peer
    command: peer node start

  orderer-base:
    image: hyperledger/fabric-orderer:${this.options.envVars.FABRIC_VERSION}
    environment:
      - FABRIC_LOGGING_SPEC=INFO
      - ORDERER_GENERAL_LISTENADDRESS=0.0.0.0
      - ORDERER_GENERAL_BOOTSTRAPMETHOD=file
      - ORDERER_GENERAL_BOOTSTRAPFILE=/var/hyperledger/orderer/orderer.genesis.block
      - ORDERER_GENERAL_LOCALMSPID=${this.network.ordererOrganization.mspName}
      - ORDERER_GENERAL_LOCALMSPDIR=/var/hyperledger/orderer/msp
      # enabled TLS
      - ORDERER_GENERAL_TLS_ENABLED=${this.network.options.consensus === ConsensusType.RAFT ? true : this.options.org.isSecure}
      - ORDERER_GENERAL_TLS_PRIVATEKEY=/var/hyperledger/orderer/tls/server.key
      - ORDERER_GENERAL_TLS_CERTIFICATE=/var/hyperledger/orderer/tls/server.crt
      - ORDERER_GENERAL_TLS_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]
      - ORDERER_GENERAL_CLUSTER_CLIENTCERTIFICATE=/var/hyperledger/orderer/tls/server.crt
      - ORDERER_GENERAL_CLUSTER_CLIENTPRIVATEKEY=/var/hyperledger/orderer/tls/server.key
      - ORDERER_GENERAL_CLUSTER_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric
    command: orderer
  `;

  /**
   * Constructor
   * @param options
   * @param network
   */
  constructor(private options: DockerComposeYamlOptions, private network?: Network) {
    super('docker-compose-base.yaml', `${getDockerComposePath(options.networkRootPath)}/base`);
  }

  /**
   * return the folder path where the base template is saved
   */
  getBasePath(): string {
    return `${this.options.networkRootPath}/docker-compose/base`;
  }

  /**
   * return the default docker compose file
   */
  getFileName(): string {
    return 'docker-compose-base.yaml';
  }

  /**
   * Save the docker compose template file
   * @return true if successful, false otherwise
   */
  async createTemplateBase(): Promise<Boolean> {
    try {
      await this.save();

      return true;
    } catch(err) {
      e(err);
      return false;
    }
  }
}
