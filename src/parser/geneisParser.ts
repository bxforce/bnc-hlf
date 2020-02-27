import { Organization } from '../models/organization';
import { Network } from '../models/network';
import { BaseParser } from './base';
import { Orderer } from '../models/orderer';
import { Peer } from '../models/peer';
import { ConsensusType, EXTERNAL_HLF_VERSION, HLF_VERSION } from '../utils/constants';

export class GenesisParser extends BaseParser {
  constructor(public genesisFilePath: string) {
    super(genesisFilePath);
  }

  async parse(): Promise<Network> {
    const parsedYaml = await this.parseRaw();
    const genesisBlock = parsedYaml['genesis'];

    const { template_folder, consensus, organisations } = genesisBlock;
    const networkConsensus = consensus as ConsensusType;

    // parse the organization
    const orgs = [];
    for (const org of organisations) {
      const { organisation: orgName, domain_name: orgDomain, orderers, anchorPeer } = org;

      // get Anchor peer
      const { host_name: anchorHost, port: anchorPort } = anchorPeer;
      const anchorP = new Peer('anchor-peer', {
        number: 0,
        host: anchorHost,
        ports: [anchorPort]
      });

      // parse the orderers
      const ords = [];
      for (const ord of orderers) {
        const { orderer: ordererName, host_name: ordererHost, port: ordererPort } = ord;
        ords.push(
          new Orderer(ordererName, {
            consensus,
            host: ordererHost,
            ports: [ordererPort]
          })
        );
      }

      //append to orgs
      orgs.push(
        new Organization(orgName, {
          domainName: orgDomain,
          peers: [anchorP],
          orderers: ords
        })
      );
    }

    // fill and return the network object
    const network = new Network('genesis-network', {
      networkConfigPath: template_folder,
      hyperledgerVersion: HLF_VERSION.HLF_2,
      externalHyperledgerVersion: EXTERNAL_HLF_VERSION.EXT_HLF_2,
      inside: false,
      consensus: networkConsensus
    });
    network.organizations = orgs;

    return network;
  }
}
