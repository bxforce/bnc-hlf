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

var ByteBuffer = require("bytebuffer");
import {join} from 'path';
import {Organization} from '../parser/model/organization';
import {Peer} from '../parser/model/peer';
import {Network} from '../parser/model/network';
import {ChannelGenerator} from '../generators/artifacts/channelGenerator';
import {OrgGenerator} from '../generators/artifacts/orgGenerator';
import {ConfigtxYamlGenerator} from '../generators/artifacts/configtxGenerator';
import {ConnectionProfileGenerator} from '../generators/artifacts/clientGenerator';
import {d, e, l} from '../utils/logs';
import {Utils} from '../utils/helper';
import getHlfBinariesPath = Utils.getHlfBinariesPath;
import getArtifactsPath = Utils.getArtifactsPath;
import getNewOrgRequestSignaturesPath = Utils.getNewOrgRequestSignaturesPath;
import getAddOrdererSignaturesPath = Utils.getAddOrdererSignaturesPath;
import getOrdererTlsCrt = Utils.getOrdererTlsCrt;
import { SysWrapper } from '../utils/sysWrapper';
import { AdminCAAccount } from '../generators/crypto/createOrgCerts';
import getPropertiesPath = Utils.getPropertiesPath;
import { ClientConfig } from '../core/hlf/client';
import { Membership, UserParams } from '../core/hlf/membership';
import getFile = SysWrapper.getFile;
var base64 = require('base-64');
var utf8 = require('utf8');

import {
    NETWORK_ROOT_PATH
} from '../utils/constants';
import { Helper } from './helper';
var btoa = require('btoa');

/**
 * Main tools orchestrator
 *
 * @author wassim.znaidi@gmail.com
 * @author sahar fehri
 * @author ahmed souissi
 */
export class ChannelOrchestrator {

    /**
     * Generate configtx yaml file
     * @param configGenesisFilePath
     */
    static async generateConfigtx(configGenesisFilePath: string) {
        const network: Network = await Helper._parseGenesis(configGenesisFilePath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }

        // Check if HLF binaries exists
        const binariesFolderPath = getHlfBinariesPath(network.options.networkConfigPath, network.options.hyperledgerVersion);
        const binariesFolderExists = await SysWrapper.existsFolder(binariesFolderPath);
        if (!binariesFolderExists) {
            l('[channel config]: start downloading HLF binaries...');
            const isDownloaded = await Helper._downloadBinaries(`${network.options.networkConfigPath}/scripts`, network);
            if (!isDownloaded) {
                e('[channel config]: Error while downloading HLF binaries files');
                return;
            }
            l('[channel config]: HLF binaries downloaded !!!');
        }

        l('[configtx] Start generating configtx.yaml file...');
        const configTx = new ConfigtxYamlGenerator('configtx.yaml', path, network);
        await configTx.save();
        l('[configtx] Configtx.yaml file saved !!!');
    }


    /**
     * Generate the Channel configuration file
     * @param configGenesisFilePath
     */
    static async generateChannelConfig(configGenesisFilePath: string) {
        const network: Network = await Helper._parseGenesis(configGenesisFilePath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();

        l('[channel config]: start generating channel configuration...');
        const configTx = new ConfigtxYamlGenerator('configtx.yaml', path, network);

        const gen = await configTx.generateConfigTx(network.channel.name);
        l(`[channel config]: configuration of channel ${network.channel.name} generated --> ${gen} !!!`);
    }
    
    /**
     *
     * @param channelName
     * @param deploymentConfigPath
     */
    static async createChannel(deploymentConfigPath: string, hostsConfigPath: string, channelName: string): Promise<void> {
        l(`[Channel] - Request to create a new channel (${channelName})`);
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();

        const channelGenerator = new ChannelGenerator(`connection-profile-create-channel-${network.organizations[0].name}.yaml`, path, network);
        const created = await channelGenerator.setupChannel(channelName, `${getArtifactsPath(path)}/${channelName}.tx`);

        const profileGenerator = new ConnectionProfileGenerator(`connection-${network.organizations[0].name}.json`, path+"/settings/", network, channelName);
        const created2 = await profileGenerator.createConnectionProfile()

        l(`[Channel] - Exit create channel request (${created && created2}) !!!`);
    }

    /**
     * Join peers to the selected channel
     * @param channelName
     * @param deploymentConfigPath
     */
    static async joinChannel(deploymentConfigPath: string, hostsConfigPath: string, channelName: string): Promise<void> {
        l(`[Channel] - Request to join a new channel (${channelName})`);
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();

        const channelGenerator = new ChannelGenerator(`connection-profile-join-channel-${network.organizations[0].name}.yaml`, path, network);
        const joined = await channelGenerator.joinChannel(channelName);

        l(`[Channel] - Exit create channel request (${joined}) !!!`);
    }

    /**
     * update channel
     * @param channelName
     * @param deploymentConfigPath
     */

    static async updateChannel(deploymentConfigPath: string, hostsConfigPath: string, channelName: string): Promise<void> {
        l(`[Channel] - Request to update  a channel (${channelName})`);
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();

        const channelGenerator = new ChannelGenerator('connection-profile-channel.yaml', path, network);
        const updated = await channelGenerator.updateChannel(channelName, `${getArtifactsPath(path)}/${network.organizations[0].mspName}anchors.tx`);

        l(`[Channel] - Exit update channel request (${updated}) !!!`);
    }
    
    static async generateNewOrgDefinition(deploymentConfigPath: string, hostsConfigPath: string) {
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        l('Validate input configuration file');
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
        const organization: Organization = network.organizations[0];
        l('[End] Blockchain configuration files parsed');
        //we will generate new configtx.yaml using orgConfigYaml and not configtxYaml because the new org yaml file struct is different from
        //the one in configtxYaml also the orderer generation will be handled later
        const configTxOrg = new OrgGenerator('configtx.yaml', path, network, organization);
        await configTxOrg.save()
        //generate new org definition
        await configTxOrg.generateDefinition();
        await configTxOrg.generateAnchorDefinition();
    }

    static async generateCustomChannelDef(deploymentConfigPath: string, hostsConfigPath: string, orgDefinition, anchorDefinition, channelName) {
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
        const channelGenerator = new ChannelGenerator(`connection-profile-join-channel-${network.organizations[0].name}.yaml`, path, network);
        try{
            await channelGenerator.generateCustomChannelDef(orgDefinition, anchorDefinition, channelName)
        }catch(err){
            e('ERROR generating new channel DEF')
            e(err)
            return ;
        }
    }

    static async signCustomChannelDef(deploymentConfigPath: string, hostsConfigPath: string, channelDef, channelName, isAddOrdererReq) {
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();

        const channelGenerator = new ChannelGenerator(`connection-profile-join-channel-${network.organizations[0].name}.yaml`, path, network);
        try{
            const signature = await channelGenerator.signConfig(channelDef);
            //save the sig to a file
            var bufSig = Buffer.from(JSON.stringify(signature));
            let pathSig;
            if(isAddOrdererReq){
                pathSig = `${getAddOrdererSignaturesPath(network.options.networkConfigPath, channelName)}/${network.organizations[0].name}_sign.json`
            } else {
                pathSig = `${getNewOrgRequestSignaturesPath(network.options.networkConfigPath, channelName)}/${network.organizations[0].name}_sign.json`
            }
            await SysWrapper.createFile(pathSig, JSON.stringify(signature));
        }catch(err) {
            e('error signing channel definition')
            e(err)
            return ;
        }
    }

    static async submitCustomChannelDef(deploymentConfigPath: string, hostsConfigPath: string, channelDef, signaturesFolder, channelName) {
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();

        const channelGenerator = new ChannelGenerator(`connection-profile-join-channel-${network.organizations[0].name}.yaml`, path, network);

        let allSignatures=[];
        let sigFiles = await SysWrapper.enumFilesInFolder(signaturesFolder)
        for(let myFile of sigFiles){
            let tmp =  await SysWrapper.getJSON(`${signaturesFolder}/${myFile}`);
            let signature_header_buff = tmp.signature_header.buffer;
            let signature_buff = tmp.signature.buffer;

            let sig_header_wrapped =  ByteBuffer.wrap(signature_header_buff.data);
            let sig_wraped =  ByteBuffer.wrap(signature_buff.data);

            let sig_obj_wrapped = {
                signature_header:sig_header_wrapped,
                signature: sig_wraped
            }
            allSignatures.push(sig_obj_wrapped)
        }
        try{
            await channelGenerator.submitChannelUpdate(channelDef, allSignatures, channelName);
        }catch(err){
            e('ERROR submitting channel def')
            e(err)
            return ;
        }
    }

    static async addOrderer (deploymentConfigPath: string, hostsConfigPath: string, systemChannel){
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
        const channelGenerator = new ChannelGenerator(`connection-profile-orderer-client.yaml`, path, network);
        try{
            let name = "orderer7.bnc.com";
            let port = "10050"
            //Need TLS certificates of orderer + endpoint
          /*  d('Initiate CA Client services');
            let admin: AdminCAAccount = { name: 'admin', password: 'adminpw' }
            console.log(admin.name)
            console.log(join(getPropertiesPath(path), 'connection-profile-orderer-client.yaml'))
            const config: ClientConfig = {
                networkProfile: join(getPropertiesPath(path), 'connection-profile-orderer-client.yaml'),          admin: {
                    name: admin.name,
                    secret: admin.password
                }
            };
            const membership = new Membership(config);
            console.log(network.ordererOrganization[0].caName)
            await membership.initCaClient(network.ordererOrganization[0].caName);
            
           */

            const ordererTlsPath = getOrdererTlsCrt(network.options.networkConfigPath, network.organizations[0].fullName, name);
            console.log(ordererTlsPath);
            let tlsCrt = await getFile(ordererTlsPath);
            console.log(Buffer.from(tlsCrt).toString('base64'));
            let ordererTLSConverted = Buffer.from(tlsCrt).toString('base64');
            const ordererJsonConsenter = {
                    "client_tls_cert": `${ordererTLSConverted}`,
                    "host": `${name}`,
                    "port": `${port}`,
                    "server_tls_cert": `${ordererTLSConverted}`
                }
                
            await channelGenerator.addOrdererToSystemChannel(ordererJsonConsenter, name, port);


          //  await channelGenerator.addOrderer(orgDefinition, anchorDefinition, channelName)
        }catch(err){
            e('ERROR generating new channel DEF')
            e(err)
            return ;
        }
    }
    
}
