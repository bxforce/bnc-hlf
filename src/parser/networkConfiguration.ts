import { safeLoad } from 'js-yaml';
import { SysWrapper } from '../utils/sysWrapper';
import { l } from '../utils/logs';
import {Organization} from '../models/organization';
import {Engine} from '../models/engine';
import {Peer} from '../models/peer';
import {Orderer} from '../models/orderer';

export class NetworkConfiguration {
  constructor(public fullFilePath: string) {}

  async parse() {
    l('Starting Parsing configuration file');

    // const file = fs.readFileSync(this.fullFilePath, 'utf8');
    // const content = yaml.safeLoad(file);

    const configContent = await SysWrapper.getFile(this.fullFilePath);
    const parsedYaml = safeLoad(configContent);

    // const organisations = new Organization('org');

    // Parsing engine
    const engines: Engine[] = this.buildEngine(parsedYaml['engines']);

    // Parsing chains definition
    const organizations: Organization[] = this.buildOrganisations(parsedYaml['chains']);

    // Set engine for every organization
    organizations.map((organization) => {
      organization.engines = engines.filter(eng => eng.name === organization.name);
    });

    l('Finish Parsing configuration file');

    return organizations;
  }

  private buildEngine(yamlEngine): Engine[] {
    const engines = [];

    yamlEngine.forEach((eng) => {
      const orgEngineName = Object.keys(eng)[0];
      const orgEngines = eng[orgEngineName];

      orgEngines.forEach((hosts) => {
        const hostName = Object.keys(hosts)[0];
        const hostEngines = hosts[hostName];
        const [ {type}, {ip}, {port}, {settings}] = hostEngines;

        const engine = new Engine(hostName, { ip, port, type, settings }, orgEngineName);

        engines.push(engine);
      });
    });

    return engines;
  }

  private buildOrganisations(yamlOrganisations): Organization[] {
    const organizations: Organization[] = [];
    const [{template_folder}, {fabric}, {organisations}] = yamlOrganisations;

    organisations.forEach((org) => {
      const orgName = Object.keys(org)[0];
      const organisation = org[orgName];
      const [{tls}, {couchdb}, {domain_name}, {ca}, orderers, peers] = organisation;

      // parse & store orderers
      const[{consensus}, {engine_name: ordererEngineName}] = orderers[Object.keys(orderers)[0]];
      const ords = [];
      ords.push(new Orderer(`orderer_${orgName}`, {
        engineName: ordererEngineName,
        consensus
      }));

      // peer parsing
      const parsedPeers = [];
      peers[Object.keys(peers)[0]].forEach((p, index) => {
        const peerName = Object.keys(p)[0];
        const peer = p[peerName];

        const [{engine_name: peerEngineName}] = peer;

        // store the parsed peer
        parsedPeers.push(new Peer(peerName, {
          engineName: peerEngineName,
          number: index,
          ports: [`7${index}51`, `7${index}52`, `7${index}53`],
          couchDbPort: `5${index}84`,
          couchDB: couchdb
        }));
      });

      organizations.push(new Organization(orgName, {
        orderers: ords,
        peers: parsedPeers,
        templateFolder: template_folder,
        fabricVersion: fabric,
        tls,
        domainName: domain_name
      }));
    });

    return organizations;
  }
}
