import { safeLoad } from 'js-yaml';
import { SysWrapper } from '../utils/sysWrapper';
import { l } from '../utils/logs';
import { Organization } from '../models/organization';
import { Engine } from '../models/engine';
import { Peer } from '../models/peer';
import { Orderer } from '../models/orderer';

export class NetworkConfiguration {
  constructor(public fullFilePath: string) {}

  async parse() {
    l('Starting Parsing configuration file');

    const configContent = await SysWrapper.getFile(this.fullFilePath);
    const parsedYaml = safeLoad(configContent);

    // Parsing chains definition
    const organizations: Organization[] = this.buildOrganisations(parsedYaml['chains']);

    // Parsing engine
    const engines: Engine[] = this.buildEngine(parsedYaml['engines']);

    // Set engine for every organization
    organizations.map(organization => {
      organization.engines = engines.filter(eng => eng.orgName === organization.engineOrgName);
    });

    l('Finish Parsing configuration file');

    return organizations;
  }

  private buildEngine(yamlEngine): Engine[] {
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

  private buildOrganisations(yamlOrganisations): Organization[] {
    const organizations: Organization[] = [];
    const { template_folder, fabric, tls, consensus, db, organisations } = yamlOrganisations;

    organisations.forEach(org => {
      const { organisation, engineOrg, domain_name, ca, orderers, peers } = org;

      // parse & store orderers
      const ords = [];
      orderers.forEach(ord => {
        const { orderer, engine_name: ordererEngineName } = ord;
        ords.push(
          new Orderer(orderer, {
            engineName: ordererEngineName,
            consensus
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
