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
import { Organization } from '../models/organization';
import { Engine } from '../models/engine';
import { Peer } from '../models/peer';
import { Orderer } from '../models/orderer';
import { BaseParser } from './base';
import { Ca } from '../models/ca';
import { Network } from '../models/network';
import { CommitConfiguration } from '../models/commitConfiguration';
import { CA_DEFAULT_PORT, ConsensusType, DEFAULT_CA_ADMIN, EXTERNAL_HLF_VERSION, HLF_CA_VERSION, HLF_VERSION, ORDERER_DEFAULT_PORT, PEER_DEFAULT_PORT } from '../utils/constants';
import { OrdererOrganization } from '../models/ordererOrganization';

/**
 * Parser class for the deployment configuration file
 *
 * @author wassim.znaidi@gmail.com
 */
export class CommitParser extends BaseParser {

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
    async parse(): Promise<CommitConfiguration> {
        l('Starting Parsing configuration file');

        const parsedYaml = await this.parseRaw();

        // Parsing chaincode definition
        const organizations: Organization[] = this.buildOrganisations(parsedYaml['chaincode']);
        // build the network instance
        const { template_folder, channel, chaincode, root_path_chaincode, path_chaincode, version } = parsedYaml['chaincode'];
        const conf: CommitConfiguration = new CommitConfiguration(this.fullFilePath, channel, chaincode,root_path_chaincode, path_chaincode, version);
        conf.organizations = organizations;
        return conf;
    }



    /**
     * Parse the organization section within the deployment configuration file
     * @param yamlOrganisations
     */
    private buildOrganisations(yamlOrganisations): Organization[] {
        const organizations: Organization[] = [];
        const { template_folder, organisations } = yamlOrganisations;

        organisations.forEach(org => {
            const { organisation, domain_name, peers } = org;
            const ords = [];
            // peer parsing
            const parsedPeers: Peer[] = [];
            peers.forEach((pe, index) => {
                const { peer: peerName, port: peerPort } = pe;
                parsedPeers.push(
                    new Peer(peerName, {
                        number: index,
                        ports: [
                            peerPort
                        ],
                    })
                );
            });

            organizations.push(
                new Organization(organisation, {
                    orderers: ords,
                    peers: parsedPeers,
                    templateFolder: template_folder,
                    domainName: domain_name,
                })
            );
        });

        return organizations;
    }
}
