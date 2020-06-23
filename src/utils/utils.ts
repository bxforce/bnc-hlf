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

import { exec } from 'shelljs';
import { Peer } from '../models/peer';
import { Organization } from '../models/organization';
import { Orderer } from '../models/orderer';
import { BNC_TOOL_NAME } from './constants';
import * as sudo from 'sudo-prompt';
import * as chalk from 'chalk';
import { e } from './logs';
import { OrdererOrganization } from '../models/ordererOrganization';

/**
 * Common utils functions
 *
 * @author wassim.znaidi@gmail.com
 */
export namespace Utils {
  export function toPascalCase(text: string): string {
    return text.match(/[a-z]+/gi)
      .map(function(word) {
        return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
      })
      .join('');
  }

  export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  export function changeOwnerShipWithPassword(folder: string, password = 'wassim'): Promise<boolean> {
    const command = `echo '${password}' | sudo -kS chown -R $USER:$USER ${folder}`;

    return new Promise((resolved, rejected) => {
      exec(command, { silent: true }, function(code, stdout, stderr) {
        return code === 0 ? resolved() : rejected();
      });
    });
  }

  export function changeOwnership(folder: string): Promise<boolean> {
    const options = {
      name: BNC_TOOL_NAME
    };

    const command = `chown -R 1001:1001 ${folder}`;

    return new Promise((resolved, rejected) => {
      sudo.exec(command, options, (error, stdout, stderr) => {
        if (error) {
          rejected(error);
        }

        if (stderr) {
          console.error(chalk.red(stderr));
          e(stderr);
        }

        resolved(true);
      });
    });
  }

  /**
   * Retrieve the peer msp path
   * @param rootPath
   * @param organization
   * @param peer
   */
  export function getPeerMspPath(rootPath: string, organization: Organization, peer: Peer): string {
    const basePeerPath = `${rootPath}/organizations/peerOrganizations/${organization.fullName}/peers`;
    return `${basePeerPath}/${peer.name}.${organization.fullName}/msp`;
  }

  /**
   * Retrieve the peer tls path
   * @param rootPath
   * @param organization
   * @param peer
   */
  export function getPeerTlsPath(rootPath: string, organization: Organization, peer: Peer): string {
    const basePeerPath = `${rootPath}/organizations/peerOrganizations/${organization.fullName}/peers`;
    return `${basePeerPath}/${peer.name}.${organization.fullName}/tls`;
  }

  /**
   * Retrieve the organization msp path
   */
  export function getOrganizationMspPath(rootPath: string, organization: Organization): string {
    return `${rootPath}/organizations/peerOrganizations/${organization.fullName}/msp`;
  }

  /**
   * Return the full path MSP Orderer Organization path
   * @param rootPath
   * @param ordererDomain
   */
  export function getOrdererOrganizationRootPath(rootPath: string, ordererDomain: string): string {
    return `${rootPath}/organizations/ordererOrganizations/${ordererDomain}`;
  }

  /**
   * Return Orderer Entity MSP Path
   * @param rootPath
   * @param ordererOrganization
   * @param orderer
   */
  export function getOrdererMspPath(rootPath: string, ordererOrganization: OrdererOrganization, orderer: Orderer): string {
    const ordererFullName = ordererOrganization.ordererFullName(orderer);
    return `${rootPath}/organizations/ordererOrganizations/${ordererOrganization?.domainName}/orderers/${ordererFullName}/msp`;

  }

  /**
   * Return Orderer Entity MSP Path
   * @param rootPath
   * @param ordererOrganization
   * @param orderer
   */
  export function getOrdererTlsPath(rootPath: string, ordererOrganization: OrdererOrganization, orderer: Orderer): string {
    const ordererFullName = ordererOrganization.ordererFullName(orderer);
    return `${rootPath}/organizations/ordererOrganizations/${ordererOrganization?.domainName}/orderers/${ordererFullName}/tls`;
  }

  /**
   * Return the hyperledger fabric binaries full folder path
   * @param rootPath
   * @param fabricVersion
   */
  export function getHlfBinariesPath(rootPath: string, fabricVersion: string): string {
    return `${rootPath}/fabric-binaries/${fabricVersion}/bin`;
  }

  export function getArtifactsPath(rootPath: string): string {
    return `${rootPath}/artifacts`;
  }

  export function getDockerComposePath(rootPath: string): string {
    return `${rootPath}/docker-compose`;
  }

  export function getPropertiesPath(rootPath: string): string {
    return `${rootPath}/settings`;
  }
}
