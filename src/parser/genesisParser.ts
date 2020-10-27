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

import {Organization} from '../parser/model/organization';
import {Network} from '../parser/model/network';
import {BaseParser} from './base';
import {Orderer} from '../parser/model/orderer';
import {Peer} from '../parser/model/peer';
import {ConsensusType, HLF_DEFAULT_VERSION} from '../utils/constants';
import {Ca} from '../parser/model/ca';
import {OrdererOrganization} from '../parser/model/ordererOrganization';
import {Channel} from '../parser/model/channel';

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export class GenesisParser extends BaseParser {
    constructor(public genesisFilePath: string) {
        super(genesisFilePath);
    }

    async parse(): Promise<Network> {
        const parsedYaml = await this.parseRaw();
        const genesisBlock = parsedYaml['genesis'];

        const {template_folder, consensus, ordererDomain, ca, channel, organisations} = genesisBlock;
        const networkConsensus = consensus as ConsensusType;
        const networkChannel = new Channel(channel);
        
        // Parse CA
        const {type, url, port, settings} = ca;
        const caEntity = new Ca('ca.orderer', {
            number: 0,
            port: port,
            host: url,
            user: 'admin',
            password: 'adminpw',
            isSecure: false,
        });

        // parse the organization
        const orgs = [];
        for (const org of organisations) {
            const {organisation: orgName, domain_name: orgDomain, orderers, anchorPeer} = org;

            // get Anchor peer
            const {host_name: anchorHost, port: anchorPort} = anchorPeer;
            const anchorP = new Peer('anchor-peer', {
                number: 0,
                host: anchorHost,
                ports: [anchorPort]
            });

            // parse the orderers
            const ords = [];
            for (const ord of orderers) {
                const {orderer: ordererName, host_name: ordererHost, port: ordererPort} = ord;
                ords.push(
                    new Orderer(ordererName, {
                        consensus,
                        domainName: orgDomain,
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
            hyperledgerVersion: HLF_DEFAULT_VERSION.FABRIC,
            hyperledgerCAVersion: HLF_DEFAULT_VERSION.CA,
            hyperledgerThirdpartyVersion : HLF_DEFAULT_VERSION.THIRDPARTY,
            inside: false,
            consensus: networkConsensus,
            forDeployment: false,
        });
        network.organizations = orgs;

        const ordererOrganization = new OrdererOrganization(`ordererOrganization`, {
            domainName: ordererDomain,
            ca: caEntity
        });

        for (const org of network.organizations) {
            ordererOrganization.orderers.push(...org.orderers);
        }

        network.ordererOrganization = ordererOrganization;

        // Raft consensus must be always secure
        if (network.options.consensus === ConsensusType.RAFT) {
            network.ordererOrganization.isSecure = true;
        }

        network.channel = networkChannel;

        return network;
    }
}
