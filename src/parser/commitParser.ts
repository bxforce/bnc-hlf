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
import { CommitConfiguration } from '../parser/model/commitConfiguration';
import { ConsensusType, CA_DEFAULT_PORT, DEFAULT_CA_ADMIN } from '../utils/constants';
import { OrdererOrganization } from '../parser/model/ordererOrganization';

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
        const { template_folder, channel, chaincode, root_path_chaincode, root_path_scripts, path_chaincode, version } = parsedYaml['chaincode'];
        const conf: CommitConfiguration = new CommitConfiguration(this.fullFilePath, channel, chaincode, root_path_chaincode, root_path_scripts, path_chaincode, version);
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
