import { BaseGenerator } from '../base';
import { DockerComposeYamlOptions } from '../../utils/data-type';
import { e } from '../../utils/logs';

export class DockerComposePeerGenerator extends BaseGenerator {
  /* docker-compose template content text */
  contents = `
version: '2'

volumes:
${this.options.org.orderers
    .map(orderer => `
  ${orderer.name}.${this.options.org.fullName}:
`).join('')}  

networks:
  ${this.options.composeNetwork}:
    external: true

services:
${this.options.org.orderers
    .map(orderer => `
  ${orderer.name}.${this.options.org.fullName}:
    extends:
      file:   base/docker-compose-base.yaml
      service: orderer-base  
    environment:
      - ORDERER_GENERAL_LOCALMSPID=${orderer.mspName}
      - ORDERER_GENERAL_LISTENPORT=${orderer.options.ports[0]}
    container_name: ${orderer.name}.${this.options.org.fullName}
    extra_hosts:
${this.options.org.peers
      .map(peerHost => `
      - "${peerHost.name}.${this.options.org.fullName}:${this.options.org.engineHost(peerHost.options.engineName)}"
`).join('')}
${this.options.org.orderers
      .map(ordererHost => `
      - "${ordererHost.name}.${this.options.org.fullName}:${this.options.org.engineHost(ordererHost.options.engineName)}"
`).join('')}
    networks:
      - ${this.options.composeNetwork}   
    volumes:
      - ${this.options.networkRootPath}/${this.options.org.fullName}/artifacts/genesis.block:/var/hyperledger/orderer/orderer.genesis.block
      - ${this.options.networkRootPath}/organizations/ordererOrganizations/${this.options.org.fullName}/orderers/${this.options.org.ordererName(orderer)}/msp:/var/hyperledger/orderer/msp
      - ${this.options.networkRootPath}/organizations/ordererOrganizations/${this.options.org.fullName}/orderers/${this.options.org.ordererName(orderer)}/tls/:/var/hyperledger/orderer/tls
      - ${orderer.name}.${this.options.org.fullName}:/var/hyperledger/production/orderer
    ports:
      - ${orderer.options.ports[0]}:${orderer.options.ports[0]}
`).join('')}  
  `;

  /**
   * Constructor
   * @param filename
   * @param path
   * @param options
   */
  constructor(filename: string, path: string,  private options: DockerComposeYamlOptions) {
    super(filename, path);
  }

  /**
   * Create the Orderer docker compose template file
   */
  async createTemplateOrderers(): Promise<Boolean> {
    try {
      await this.save();

      return true;
    } catch(err) {
      e(err);
      return false;
    }
  }
}
