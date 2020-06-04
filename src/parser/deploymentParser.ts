import { l } from '../utils/logs';
import { Organization } from '../models/organization';
import { Engine } from '../models/engine';
import { Peer } from '../models/peer';
import { Orderer } from '../models/orderer';
import { BaseParser } from './base';
import { Ca } from '../models/ca';
import { Network } from '../models/network';
import { ConsensusType, EXTERNAL_HLF_VERSION, HLF_CA_VERSION, HLF_VERSION } from '../utils/constants';

/**
 * Parser class for the deployment configuration file
 *
 * @author wassim.znaidi@gmail.com
 */
export class DeploymentParser extends BaseParser {

  /**
   * Constructor
   * @param fullFilePath deployment configuration full path
   */
  constructor(public fullFilePath: string) {
    super(fullFilePath);
  }

  /**
   * Parse the provided deployment configuration file
   * @return {@link Network} instance with parsed information
   */
  async parse(): Promise<Network> {
    l('Starting Parsing configuration file');

    const parsedYaml = await this.parseRaw();

    // Parsing chains definition
    const organizations: Organization[] = this.buildOrganisations(parsedYaml['chains']);

    // Parsing engine
    const engines: Engine[] = DeploymentParser.buildEngine(parsedYaml['engines']);

    // Set engine for every organization
    organizations.map(organization => {
      organization.engines = engines.filter(eng => eng.orgName === organization.engineOrgName);
    });

    l('Finish Parsing configuration file');

    // build the network instance
    const { template_folder, fabric, consensus } = parsedYaml['chains'];
    const network: Network = new Network(this.fullFilePath, {
      hyperledgerVersion: fabric as HLF_VERSION,
      hyperledgerCAVersion: HLF_CA_VERSION.HLF_2,
      externalHyperledgerVersion: EXTERNAL_HLF_VERSION.EXT_HLF_2,
      consensus: consensus as ConsensusType,
      inside: false,
      networkConfigPath: template_folder,
    });
    network.organizations = organizations;

    return network;
  }

  /**
   * Parse the engine section within the deployment configuration file
   * @param yamlEngine
   */
  private static buildEngine(yamlEngine): Engine[] {
    const engines = [];

    for (const engineEntry of yamlEngine) {
      const { engine, hosts } = engineEntry;

      for (const hostEntry of hosts) {
        const { host, type, url, port, settings } = hostEntry;
        engines.push(new Engine(host, { url, port, type, settings }, engine));
      }
    }

    return engines;
  }

  /**
   * Parse the organization section within the deployment configuration file
   * @param yamlOrganisations
   */
  private buildOrganisations(yamlOrganisations): Organization[] {
    const organizations: Organization[] = [];
    const { template_folder, fabric, tls, consensus, db, organisations } = yamlOrganisations;

    organisations.forEach(org => {
      const { organisation, engineOrg, domain_name, ca, orderers, peers } = org;

      // parse CA
      const { name: caName, engine_name: caEngineName } = ca;
      const caEntity = new Ca(caName, {
        engineName: caEngineName,
        ports: '7054',
        number: 0,
        user: 'admin',
        password: 'adminpw'
      });

      // parse & store orderers
      const ords = [];
      orderers.forEach((ord, index) => {
        const { orderer, engine_name: ordererEngineName } = ord;
        ords.push(
          new Orderer(orderer, {
            engineName: ordererEngineName,
            consensus,
            ports: [`8${index}50`],
            number: index,
          })
        );
      });

      // peer parsing
      const parsedPeers: Peer[] = [];
      peers.forEach((pe, index) => {
        const { peer: peerName, engine_name: peerEngineName } = pe;

        // TODO check if db leveldb or couchdb

        parsedPeers.push(
          new Peer(peerName, {
            engineName: peerEngineName,
            number: index,
            ports: [`7${index}51`, `7${index}52`, `7${index}53`],
            couchDbPort: `5${index}84`,
            couchDB: db
          })
        );
      });

      organizations.push(
        new Organization(organisation, {
          ca: caEntity,
          orderers: ords,
          peers: parsedPeers,
          templateFolder: template_folder,
          fabricVersion: fabric,
          tls,
          domainName: domain_name,
          engineOrgName: engineOrg
        })
      );
    });

    return organizations;
  }
}
