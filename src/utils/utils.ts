import { exec } from 'shelljs';
import { Peer } from '../models/peer';
import { Organization } from '../models/organization';
import { Orderer } from '../models/orderer';
import { BNC_TOOL_NAME } from './constants';
import * as sudo from 'sudo-prompt';
import * as chalk from 'chalk';
import { e } from './logs';
import { OrdererOrganization } from '../models/ordererOrganization';

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
}
