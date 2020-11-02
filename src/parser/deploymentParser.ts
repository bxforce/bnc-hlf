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

import { l } from '../utils/logs';
import { Organization } from '../parser/model/organization';
import { Engine } from '../parser/model/engine';
import { Peer } from '../parser/model/peer';
import { Orderer } from '../parser/model/orderer';
import { BaseParser } from './base';
import { Ca } from '../parser/model/ca';
import { Network } from '../parser/model/network';
import { CA_DEFAULT_PORT, ConsensusType, DEFAULT_CA_ADMIN, HLF_DEFAULT_VERSION, ORDERER_DEFAULT_PORT, PEER_DEFAULT_PORT } from '../utils/constants';
import { OrdererOrganization } from '../parser/model/ordererOrganization';

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
    //const engines: Engine[] = DeploymentParser.buildEngine(parsedYaml['engines']);

    // parse IPS
    const ips = parsedYaml['ips'];

    // Set engine for every organization
    /*
    organizations.map(organization => {
      organization.engines = engines;
      organization.expandEngine(true, true);
    });
    */
    l('Finish Parsing configuration file');

    // build the network instance
    const { template_folder, fabric, consensus } = parsedYaml['chains'];
    const network: Network = new Network(this.fullFilePath, {
      hyperledgerVersion: fabric != null ? fabric : HLF_DEFAULT_VERSION.FABRIC,
      hyperledgerCAVersion: HLF_DEFAULT_VERSION.CA,
      hyperledgerThirdpartyVersion : HLF_DEFAULT_VERSION.THIRDPARTY,
      consensus: consensus as ConsensusType,
      networkConfigPath: template_folder,
      inside: false,
      forDeployment: true
    });
    network.organizations = organizations;

    // set a default ordererOrganization
    const ordererOrganization = new OrdererOrganization(`ordererOrganization`, {
      domainName: organizations[0].domainName,
      ca: new Ca('ca.orderer', {})
    });
    for(const org of network.organizations) {
      ordererOrganization.orderers.push(...org.orderers);
    }
    network.ordererOrganization = ordererOrganization;
    //set ips
    network.ips = ips;

    return network;
  }

  /**
   * Parse the engine section within the deployment configuration file
   * @param yamlEngine
  
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
  */

  /**
   * Parse the organization section within the deployment configuration file
   * @param yamlOrganisations
   */
  private buildOrganisations(yamlOrganisations): Organization[] {
    const organizations: Organization[] = [];
    const { template_folder, fabric, tls, consensus, db, organisations } = yamlOrganisations;

    organisations.forEach(org => {
      const { organisation, domain_name, ca, orderers, peers } = org;

      // parse CA
      const { name: caName, engine_name: engineName, port: caPort } = ca;
      const caEntity = new Ca(caName, {
        engineName: engineName,
        port: caPort ?? CA_DEFAULT_PORT,
        number: 0,
        user: DEFAULT_CA_ADMIN.name,
        password: DEFAULT_CA_ADMIN.password
      });

      // parse & store orderers
      const ords = [];
      orderers.forEach((ord, index) => {
        const { orderer, engine_name: engineName, port: ordererPort, metrics: ordererMetrics } = ord;
        ords.push(
          new Orderer(orderer, {
            domainName: domain_name,
            engineName: engineName,
            consensus,
            ports: [
              ordererPort ?? `${ORDERER_DEFAULT_PORT.main}`,
              ordererMetrics ?? `${ORDERER_DEFAULT_PORT.operations}`
              /*
              ordererPort ?? `${index*1000+ORDERER_DEFAULT_PORT.main}`,
              `${index*1000+ORDERER_DEFAULT_PORT.operations}`
              */
            ],
            number: index
          })
        );
      });

      // peer parsing
      const parsedPeers: Peer[] = [];
      peers.forEach((pe, index) => {
        const { peer: peerName, engine_name: engineName, port: peerPort, metrics: peerMetrics } = pe; // TODO check if db leveldb or couchdb
        parsedPeers.push(
          new Peer(peerName, {
            engineName: engineName,
            number: index,
            ports: [
              peerPort ?? `${PEER_DEFAULT_PORT.event}`,
              peerPort+1 ?? `${PEER_DEFAULT_PORT.event_chaincode}`,
              peerPort+2 ?? `${PEER_DEFAULT_PORT.event_hub}`,
              peerMetrics ?? `${PEER_DEFAULT_PORT.operations}`
              /*
              peerPort ?? `${index*1000+PEER_DEFAULT_PORT.event}`,
              peerPort+1 ?? `${index*1000+PEER_DEFAULT_PORT.event_chaincode}`,
              peerPort+2 ?? `${index*1000+PEER_DEFAULT_PORT.event_hub}`,
              `${index*1000+PEER_DEFAULT_PORT.operations}`
              */
            ],
            couchDbPort: `${PEER_DEFAULT_PORT.couchdb}`, //`${5+orgIndex}${index}84`,
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
          domainName: domain_name,
          tls
        })
      );
    });

    return organizations;
  }
}
