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
import { Network } from '../../parser/model/network';
import { e } from '../../utils/logs';

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export class ConnectionProfileGenerator extends BaseGenerator {
  contents = `
{
    "name": "connection.profile-${this.network.organizations[0].domainName}",
    "version": "1.0.0",
    "client": {
        "organization": "${this.network.organizations[0].name}",
        "credentialStore": { 
            "path": "${this.network.options.networkConfigPath}/wallets/organizations/${this.network.organizations[0].fullName}",
            "cryptoStore": { "path": "${this.network.options.networkConfigPath}/wallets/organizations/${this.network.organizations[0].fullName}" }
        },
        "connection": { "timeout": { "peer": { "endorser": "300" } } },
        "BCCSP": { "security": { "enabled": true, "default": { "provider": "SW" }, "hashAlgorithm": "SHA2", "softVerify": true, "level": 256 } }
    },
    "channels": {
        "${this.channel}": { 
            "peers": {
                ${this.network.organizations[0].peers.map(peer => `"${peer.name}.${this.network.organizations[0].fullName}": { "endorsingPeer": true, "chaincodeQuery": true, "ledgerQuery": true, "eventSource": true }`).join(',')}
            }
        }
    },
    "organizations": {
        "${this.network.organizations[0].name}": {
            "mspid": "${this.network.organizations[0].mspName}",
            "cryptoPath": "${this.network.options.networkConfigPath}/organizations/peerOrganizations/${this.network.organizations[0].fullName}/users/{username}@${this.network.organizations[0].fullName}/msp",
            "peers": [ ${this.network.organizations[0].peers.map(peer => `"${peer.name}.${this.network.organizations[0].fullName}"`).join(', ')} ],
            "certificateAuthorities": [ "${this.network.organizations[0].ca.name}.${this.network.organizations[0].name}" ]
        }
    },
    "peers": {
        ${this.network.organizations[0].peers.map(peer => `"${peer.name}.${this.network.organizations[0].fullName}": {
            "url": "grpc${this.network.organizations[0].isSecure ? 's' : ''}://${peer.name}.${this.network.organizations[0].fullName}:${peer.options.ports[0]}",
            "tlsCACerts": { "path": "${this.network.options.networkConfigPath}/organizations/peerOrganizations/${this.network.organizations[0].fullName}/peers/${peer.name}.${this.network.organizations[0].fullName}/msp/tlscacerts/tlsca.${this.network.organizations[0].name}.${this.network.organizations[0].domainName}-cert.pem" },
            "grpcOptions": {
              "ssl-target-name-override": "${peer.name}.${this.network.organizations[0].fullName}",
              "hostnameOverride": "${peer.name}.${this.network.organizations[0].fullName}",
              "request-timeout": 120001
            }
        }`).join(',')}
    },
    "certificateAuthorities": {
        "${this.network.organizations[0].ca.name}.${this.network.organizations[0].name}": {
            "url": "http${this.network.organizations[0].isSecure ? 's' : ''}://${this.network.organizations[0].ca.name}.${this.network.organizations[0].name}:${this.network.organizations[0].ca.options.port}",
            "caName": "${this.network.organizations[0].ca.name}.${this.network.organizations[0].name}",
            "tlsCACerts": { "path": "${this.network.options.networkConfigPath}/organizations/fabric-ca/${this.network.organizations[0].name}/crypto/ca-cert.pem" },
            "httpOptions": { "verify": false }
        }
    }
}
`;

  /**
   * Constructor
   * @param filename the connection profile filename
   * @param path loction folder path where to store the connection profile
   * @param options
   */
  constructor(filename: string,
              path: string,
              private network: Network,
              private channel: string) {
    super(filename, path);
  }
  
  /**
   * Create the Orderer docker compose template file
   */
  async createConnectionProfile(): Promise<Boolean> {
    try {
      await this.save();

      return true;
    } catch(err) {
      e(err);
      return false;
    }
  }
}
