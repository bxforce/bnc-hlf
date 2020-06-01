import { Peer } from '../models/peer';
import { Organization } from '../models/organization';
import { Orderer } from '../models/orderer';

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
}
