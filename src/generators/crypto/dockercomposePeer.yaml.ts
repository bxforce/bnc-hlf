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
${this.options.org.peers
  .map(
    peer => `
  ${peer.name}.${this.options.org.fullName}:
    container_name: ${peer.name}.${this.options.org.fullName}
    image: hyperledger/fabric-peer
    environment:
      - CORE_PEER_ID=${peer.name}.${this.options.org.fullName}
      - CORE_PEER_ADDRESS=${peer.name}.${this.options.org.fullName}:${peer.options.ports[0]}
      - CORE_PEER_LOCALMSPID=${this.options.org.mspName}
      - CORE_PEER_MSPCONFIGPATH=/tmp/hyperledger/${this.options.org.name}/${peer.name}/msp
      - CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock
      - CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=${this.options.composeNetwork}
      - FABRIC_LOGGING_SPEC=debug
      - CORE_PEER_TLS_ENABLED=false
      - CORE_PEER_TLS_CERT_FILE=/tmp/hyperledger/${this.options.org.name}/${peer.name}/tls-msp/signcerts/cert.pem
      - CORE_PEER_TLS_KEY_FILE=/tmp/hyperledger/${this.options.org.name}/${peer.name}/tls-msp/keystore/key.pem
      - CORE_PEER_TLS_ROOTCERT_FILE=/tmp/hyperledger/${this.options.org.name}/${peer.name}/tls-msp/tlscacerts/tls-0-0-0-0-7052.pem
      - CORE_PEER_GOSSIP_USELEADERELECTION=true
      - CORE_PEER_GOSSIP_ORGLEADER=false
      - CORE_PEER_GOSSIP_EXTERNALENDPOINT=${peer.name}.${this.options.org.fullName}:${peer.options.ports[0]}
      - CORE_PEER_GOSSIP_SKIPHANDSHAKE=true
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric/peer
    volumes:
      - /var/run:/host/var/run
      - ${this.options.networkRootPath}/${this.options.org.name}/${peer.name}:/tmp/hyperledger/${this.options.org.name}/${peer.name}
    networks:
      - ${this.options.composeNetwork}
`
  )
  .join('')}
  `;

  constructor(filename: string, path: string, private options: DockerComposeYamlOptions, private readonly dockerEngine?: DockerEngine) {
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
