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

import { BaseGenerator } from '../base';
import { DockerComposeYamlOptions } from '../../utils/datatype';
import { e, l } from '../../utils/logs';
import { DockerEngine } from '../../utils/dockerAgent';
import { Peer } from '../../parser/model/peer';
import { Utils } from '../../utils/helper';
import getDockerComposePath = Utils.getDockerComposePath;
import { ENABLE_CONTAINER_LOGGING } from '../../utils/constants';
const fs = require('fs');
const yaml = require('js-yaml')


/**
 * Class responsible to generate Peer compose file
 *
 * @author wassim.znaidi@gmail.com
 */
export class DockerComposePeerGenerator extends BaseGenerator {

  /* docker compose content for peers */
  contents = `
version: '2'

volumes:
${this.options.org.peers
    .map(peer => `
  ${peer.name}.${this.options.org.fullName}:
`).join('')}

networks:
  ${this.options.composeNetwork}:
    external: true

services:
${this.options.org.peers
    .map((peer, index) => `
  ${peer.name}.${this.options.org.fullName}:
    container_name: ${peer.name}.${this.options.org.fullName}
    extends:
      file:  ${this.options.networkRootPath}/docker-compose/base/docker-compose-base.yaml
      service: peer-base
    environment:
      - CORE_PEER_ID=${peer.name}.${this.options.org.fullName}
      - CORE_PEER_ADDRESS=${peer.name}.${this.options.org.fullName}:${peer.options.ports[0]}
      - CORE_PEER_LISTENADDRESS=0.0.0.0:${peer.options.ports[0]}
      - CORE_PEER_CHAINCODEADDRESS=${peer.name}.${this.options.org.fullName}:${peer.options.ports[1]}
      - CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:${peer.options.ports[1]}
      - CORE_PEER_GOSSIP_BOOTSTRAP=${this.options.org.gossipPeer(index)}
      - CORE_PEER_GOSSIP_EXTERNALENDPOINT=${peer.name}.${this.options.org.fullName}:${peer.options.ports[0]}
      - CORE_PEER_LOCALMSPID=${this.options.org.mspName}
      - CORE_LEDGER_STATE_STATEDATABASE=CouchDB
      - CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=${peer.name}.${this.options.org.fullName}.couchdb:5984
      # The CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME and CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD
      # provide the credentials for ledger to connect to CouchDB.  The username and password must
      # match the username and password set for the associated CouchDB.
      - CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME=${peer.name}User
      - CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD=${peer.name}Pwd
      # Enable operation service (prometheus metrics) ${peer.options.ports.length > 3 ? `
      - CORE_OPERATIONS_LISTENADDRESS=${peer.name}.${this.options.org.fullName}:${peer.options.ports[3]}
      - CORE_METRICS_PROVIDER=prometheus`:``}
      ## Logging level
      #- CORE_LOGGING_LEVEL=INFO
      #- CORE_CHAINCODE_LOGLEVEL=INFO
    labels:
      - "bnc=hlf"
    ports:
      - ${peer.options.ports[0]}:${peer.options.ports[0]}
      - ${peer.options.ports[3]}:${peer.options.ports[3]}
    volumes:
      - /var/run/:/host/var/run/
      - ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/msp:/etc/hyperledger/fabric/msp
      - ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls:/etc/hyperledger/fabric/tls
      - ${peer.name}.${this.options.org.fullName}:/var/hyperledger/production
${this.options.ips && this.options.ips.length > 0 ?  `
    extra_hosts:
${this.options.ips
        .map(host => `
      - "${host.ip}"
`).join('')}
`: ``}
    depends_on:
      - ${peer.name}.${this.options.org.fullName}.couchdb
    networks:
      - ${this.options.composeNetwork}
    
  ${peer.name}.${this.options.org.fullName}.couchdb:
    container_name: ${peer.name}.${this.options.org.fullName}.couchdb
    image: couchdb:2.3
    # Populate the COUCHDB_USER and COUCHDB_PASSWORD to set an admin user and password
    # for CouchDB.  This will prevent CouchDB from operating in an "Admin Party" mode.
    environment:
      - COUCHDB_USER=${peer.name}User
      - COUCHDB_PASSWORD=${peer.name}Pwd
    # Comment the port mapping IN ORDER to hide/expose the CouchDB service!!!!!
    ports:
      - ${peer.options.couchDbPort}:5984
    networks:
      - ${this.options.composeNetwork}
`).join('')}
  
  `;

  /**
   * Constructor
   * @param filename
   * @param options
   */
  constructor(filename: string, 
              private options: DockerComposeYamlOptions,
              private readonly dockerEngine: DockerEngine) {
    super(filename, getDockerComposePath(options.networkRootPath));
  }

  /**
   * Save the docker compose template file
   * @return true if successful, false otherwise
   */
  async createTemplatePeers(): Promise<Boolean> {
    try {
      await this.save();

      return true;
    } catch(err) {
      e(err);
      return false;
    }
  }

  /**
   * Start a single peer container
   * @param peer
   */
  async startPeer(peer: Peer): Promise<boolean> {
    try {
      const serviceName =  `${peer.name}.${this.options.org.fullName}`;

      l(`Starting Peer ${serviceName}...`);

      //const engine = this.options.org.getEngine(peer.options.engineName);
      //const docker = new DockerEngine({ host: engine.options.url, port: engine.options.port });

      await this.dockerEngine.composeOne(serviceName, { cwd: this.path, config: this.filename, log: ENABLE_CONTAINER_LOGGING });

      l(`Service Peer ${serviceName} started successfully !!!`);

      return true;
    } catch(err) {
      e(err);
      return false;
    }
  }

  /**
   * Start all peer container with the provided organization
   */
  async startPeers() {
    for(const peer of this.options.org.peers) {
      await this.startPeer(peer);
    }
  }
}
