import { BaseGenerator } from '../base';
import { DockerComposeYamlOptions } from '../../utils/data-type';
import { DockerEngine } from '../../agents/docker-agent';

export class DockerComposePeerGenerator extends BaseGenerator {
  contents = `
version: '2'

networks:
  ${this.options.composeNetwork}:
    external: true

services:
  ${this.options.org.firstPeerFullName}:
    container_name: ${this.options.org.firstPeerFullName}
    image: hyperledger/fabric-peer
    environment:
      - CORE_PEER_ID=${this.options.org.firstPeerFullName}
      - CORE_PEER_ADDRESS=${this.options.org.firstPeerFullName}:7051
      - CORE_PEER_LOCALMSPID=${this.options.org.mspName}
      - CORE_PEER_MSPCONFIGPATH=/tmp/hyperledger/${this.options.org.name}/peer0/msp
      - CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock
      - CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=${this.options.composeNetwork}
      - FABRIC_LOGGING_SPEC=debug
      - CORE_PEER_TLS_ENABLED=false
      - CORE_PEER_TLS_CERT_FILE=/tmp/hyperledger/org1/peer1/tls-msp/signcerts/cert.pem
      - CORE_PEER_TLS_KEY_FILE=/tmp/hyperledger/org1/peer1/tls-msp/keystore/key.pem
      - CORE_PEER_TLS_ROOTCERT_FILE=/tmp/hyperledger/org1/peer1/tls-msp/tlscacerts/tls-0-0-0-0-7052.pem
      - CORE_PEER_GOSSIP_USELEADERELECTION=true
      - CORE_PEER_GOSSIP_ORGLEADER=false
      - CORE_PEER_GOSSIP_EXTERNALENDPOINT=${this.options.org.firstPeerFullName}:7051
      - CORE_PEER_GOSSIP_SKIPHANDSHAKE=true
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric/peer
    volumes:
      - /var/run:/host/var/run
      - ${this.options.networkRootPath}/${this.options.org.name}/peer0:/tmp/hyperledger/${this.options.org.name}/peer0
    networks:
      - ${this.options.composeNetwork}
  `;

  constructor(filename: string, path: string, private options: DockerComposeYamlOptions, private dockerEngine?: DockerEngine) {
    super(filename, path);

    if (!this.dockerEngine) {
      // TODO fix the default local docker engine
      this.dockerEngine = new DockerEngine({ socketPath: '/var/run/docker.sock' });
    }
  }

  async startPeers() {
    await this.dockerEngine.composeOne(`ca.${this.options.org.name}.tls`, {
      cwd: this.path,
      config: this.filename
    });
  }
}
