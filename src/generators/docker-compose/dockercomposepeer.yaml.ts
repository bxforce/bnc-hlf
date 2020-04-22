import { BaseGenerator } from '../base';
import { DockerComposeYamlOptions } from '../../utils/data-type';
import { e } from '../../utils/logs';

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
      - CORE_PEER_CHAINCODEADDRESS=peer0.org1.example.com:${peer.options.ports[1]}
      - CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:${peer.options.ports[1]}
      #- CORE_PEER_GOSSIP_BOOTSTRAP=${this.options.org.gossipPeer(index)}
      - CORE_PEER_GOSSIP_EXTERNALENDPOINT=${peer.name}.${this.options.org.fullName}:${peer.options.ports[0]}
      - CORE_PEER_LOCALMSPID=${this.options.org.mspName}
      - CORE_LEDGER_STATE_STATEDATABASE=CouchDB
      - CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=${peer.name}.${this.options.org.fullName}.couchdb:${peer.options.couchDbPort}
      # The CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME and CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD
      # provide the credentials for ledger to connect to CouchDB.  The username and password must
      # match the username and password set for the associated CouchDB.
      - CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME=${peer.name}User
      - CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD=${peer.name}Pwd
    ports:
      - ${peer.options.ports[0]}:${peer.options.ports[0]}
    volumes:
      - /var/run/:/host/var/run/
      - ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/msp:/etc/hyperledger/fabric/msp
      - ${this.options.networkRootPath}/organizations/peerOrganizations/${this.options.org.fullName}/peers/${peer.name}.${this.options.org.fullName}/tls:/etc/hyperledger/fabric/tls
      - ${peer.name}.${this.options.org.fullName}:/var/hyperledger/production
    extra_hosts:
${this.options.org.peers
      .map(peerHost => `
      - "${peerHost.name}.${this.options.org.fullName}:${this.options.org.engineHost(peerHost.options.engineName)}"
`).join('')}
${this.options.org.orderers
      .map(ordererHost => `
      - "${ordererHost.name}.${this.options.org.fullName}:${this.options.org.engineHost(ordererHost.options.engineName)}"
`).join('')}
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
      - "${peer.options.couchDbPort}:${peer.options.couchDbPort}"
    networks:
      - ${this.options.composeNetwork}
`).join('')}
  
  `;

  /**
   *
   * @param filename
   * @param path
   * @param options
   */
  constructor(filename: string, path: string,  private options: DockerComposeYamlOptions) {
    super(filename, path);
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
}
