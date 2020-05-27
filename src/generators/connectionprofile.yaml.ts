import { BaseGenerator } from './base';
import { DockerComposeYamlOptions } from '../utils/data-type';
import { e } from '../utils/logs';

export class ConnectionProfileGenerator extends BaseGenerator {
  contents = `
name: "connection.${this.options.org.name}.profile"

x-type: "hlfv1"

description: "Connection profile for organization ${this.options.org.name}"

version: "1.0"

channels:
  ${this.channelName}:
    orderers:
${this.options.org.orderers
    .map(orderer => `    
      - ${orderer.name}.${this.options.org.fullName}
`).join('')}      
    peers:
${this.options.org.peers
    .map(peer => `    
      ${peer.name}.${this.options.org.fullName}:
        endorsingPeer: true
        chaincodeQuery: true
        ledgerQuery: true
        eventSource: true
`).join('')}      

organizations:
  ${this.options.org.name}:
    mspid: ${this.options.org.mspName}
    peers:
${this.options.org.peers
    .map(peer => `    
      - ${peer.name}.${this.options.org.fullName}
`).join('')}      
    certificateAuthorities:
      - ${this.options.org.caName}

orderers:
${this.options.org.orderers
    .map(orderer => `    
  ${orderer.name}.${this.options.org.fullName}:
    url: grpc${this.options.org.isSecure ? 's' : ''}://localhost:${orderer.options.ports[0]}
    grpcOptions:
      ssl-target-name-override: ${orderer.name}.${this.options.org.fullName}
`).join('')}

peers:
${this.options.org.peers
    .map(peer => `    
  ${peer.name}.${this.options.org.fullName}:
    url: grpc${this.options.org.isSecure ? 's' : ''}://localhost:${peer.options.ports[0]}
    grpcOptions:
      ssl-target-name-override: ${peer.name}.${this.options.org.fullName}
      request-timeout: 120001
`).join('')}
      
certificateAuthorities:
  ${this.options.org.caName}:
     url: http://localhost:${this.options.org.ca.options.ports}
     httpOptions:
       verify: false
     registrar:
       - enrollId: ${this.options.org.ca.options.user}
         enrollSecret: ${this.options.org.ca.options.password}
     caName: ${this.options.org.caName}
  `;

  /**
   * Constructor
   * @param filename the connection profile filename
   * @param path loction folder path where to store the connection profile
   * @param options
   * @param channelName the name of the channel to be added by default in connection profile
   */
  constructor(filename: string, path: string,  private options: DockerComposeYamlOptions, private channelName?: string) {
    super(filename, path);
  }

  /**
   * Create the Orderer docker compose template file
   */
  async createTemplateConnectionProfile(): Promise<Boolean> {
    try {
      await this.save();

      return true;
    } catch(err) {
      e(err);
      return false;
    }
  }
}
