import { exec } from 'shelljs';
import { Peer } from '../models/peer';
import { Organization } from '../models/organization';
import { Orderer } from '../models/orderer';
import { BNC_TOOL_NAME } from './constants';
import * as sudo from 'sudo-prompt';
import * as chalk from 'chalk';
import { e } from './logs';

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

  export function getPeerTlsPath(rootPath: string, organization: Organization, peer: Peer): string {
    const basePeerPath = `${rootPath}/organizations/peerOrganizations/${organization.fullName}/peers`;
    return `${basePeerPath}/${peer.name}.${organization.fullName}/tls`;
  }

  /**
   * Retrieve the orderer msp path
   * @private
   * @param rootPath
   * @param organization
   * @param orderer
   */
  export function getOrdererMspPath(rootPath: string, organization: Organization, orderer: Orderer): string {
    const baseOrdererPath = `${rootPath}/organizations/ordererOrganizations/${organization.fullName}/orderers`;
    return `${baseOrdererPath}/${orderer.name}.${organization.fullName}/msp`;
  }

  export function getOrdererTlsPath(rootPath: string, organization: Organization, orderer: Orderer): string {
    const baseOrdererPath = `${rootPath}/organizations/ordererOrganizations/${organization.fullName}/orderers`;
    return `${baseOrdererPath}/${orderer.name}.${organization.fullName}/tls`;
  }

  /**
   * Retrieve the organization msp path
   */
  export function getOrganizationMspPath(rootPath: string, organization: Organization): string {
    return `${rootPath}/organizations/peerOrganizations/${organization.fullName}/msp`;
  }

  export function getOrderersPath(rootPath: string, organization: Organization): string {
    return `${rootPath}/ordererOrganizations/${organization.fullName}`;
  }

  export function getOrderersMspPath(rootPath: string, organization: Organization): string {
    return `${rootPath}/ordererOrganizations/${organization.fullName}/msp`;
  }

}
