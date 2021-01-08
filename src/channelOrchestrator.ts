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
import {DeploymentParser} from './parser/deploymentParser';
import {HostsParser} from './parser/hostsParser';
import {CommitParser} from './parser/commitParser';
import {GenesisParser} from './parser/genesisParser';
import {Organization} from './parser/model/organization';
import {Peer} from './parser/model/peer';
import {Network} from './parser/model/network';
import {ConfigurationValidator} from './parser/validator/configurationValidator';
import {ChannelGenerator} from './generators/artifacts/channelGenerator';
import {OrgGenerator} from './generators/artifacts/orgGenerator';
import {ConfigtxYamlGenerator} from './generators/artifacts/configtxGenerator';
import {ConnectionProfileGenerator} from './generators/artifacts/clientGenerator';
import {DockerComposeEntityBaseGenerator} from './generators/docker-compose/dockerComposeBase.yaml';
import {DownloadFabricBinariesGenerator} from './generators/utils/downloadFabricBinaries';
import {d, e, l} from './utils/logs';
import {Utils} from './utils/helper';
import getHlfBinariesPath = Utils.getHlfBinariesPath;
import getArtifactsPath = Utils.getArtifactsPath;
import getNewOrgRequestSignaturesPath = Utils.getNewOrgRequestSignaturesPath;
import { SysWrapper } from './utils/sysWrapper';
import {
    NETWORK_ROOT_PATH
} from './utils/constants';

/**
 * Main tools orchestrator
 *
 * @author wassim.znaidi@gmail.com
 * @author sahar fehri
 * @author ahmed souissi
 */
export class ChannelOrchestrator {

    /**
     * Parse & validate deployment configuration file
     * @param deploymentConfigPath
     * @param hostsConfigPath
     * @private
     */
    private static async _parse(deploymentConfigPath: string, hostsConfigPath: string): Promise<Network> {
        l('[Start] Start parsing the blockchain configuration file');
        l('Validate input configuration file');
        const validator = new ConfigurationValidator();
        const isValid = validator.isValidDeployment(deploymentConfigPath);

        if (!isValid) {
            e('Configuration file is invalid');
            return;
        }
        l('Configuration file valid');

        let configParser = new DeploymentParser(deploymentConfigPath);
        const network = await configParser.parse();

        //set hosts
        if (hostsConfigPath) {
            let hostsParser = new HostsParser(hostsConfigPath);
            network.hosts = await hostsParser.parse();
        }
        l('[End] Blockchain configuration files parsed');

        return network;
    }

    /**
     * Parse & validate genesis configuration file
     * @param genesisConfigPath
     * @private
     */
    private static async _parseGenesis(genesisConfigPath: string): Promise<Network | undefined> {
        try {
            l('Parsing genesis input file');
            const validator = new ConfigurationValidator();
            const isValid = validator.isValidGenesis(genesisConfigPath);
            if (!isValid) {
                e('Genesis configuration input file is invalid');
                return;
            }
            l('Input genesis file validated');

            l('Start parsing genesis input file');
            const parser = new GenesisParser(genesisConfigPath);
            const network: Network = await parser.parse();
            l('Genesis input file parsed');

            return network;
        } catch (err) {
            e(err);
            return null;

        }
    }

    /**
     * download hyperledger fabric binaries
     * @param folderPath folder where to store files
     * @param network
     * @private
     */
    private static async _downloadBinaries(folderPath: string, network: Network): Promise<boolean> {
        try {
            l('[Start] Download fabric binaries...');
            const downloadFabricBinariesGenerator = new DownloadFabricBinariesGenerator('downloadFabric.sh', folderPath, network);
            await downloadFabricBinariesGenerator.save();
            await downloadFabricBinariesGenerator.run();
            l('[End] Ran Download fabric binaries');

            return true;
        } catch (err) {
            e(err);
            return false;
        }
    }

    /**
     * Return the default path where to store all files and materials
     * @private
     */
    private static _getDefaultPath(): string {
        const homedir = require('os').homedir();
        return join(homedir, NETWORK_ROOT_PATH);
    }

    /**
     * Generate configtx yaml file
     * @param configGenesisFilePath
     */
    static async generateConfigtx(configGenesisFilePath: string) {
        const network: Network = await ChannelOrchestrator._parseGenesis(configGenesisFilePath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? this._getDefaultPath();
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }

        // Check if HLF binaries exists
        const binariesFolderPath = getHlfBinariesPath(network.options.networkConfigPath, network.options.hyperledgerVersion);
        const binariesFolderExists = await SysWrapper.existsFolder(binariesFolderPath);
        if (!binariesFolderExists) {
            l('[channel config]: start downloading HLF binaries...');
            const isDownloaded = await ChannelOrchestrator._downloadBinaries(`${network.options.networkConfigPath}/scripts`, network);
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
        const network: Network = await ChannelOrchestrator._parseGenesis(configGenesisFilePath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

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
        const network: Network = await ChannelOrchestrator._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

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
        const network: Network = await ChannelOrchestrator._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

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
        const network: Network = await ChannelOrchestrator._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        const channelGenerator = new ChannelGenerator('connection-profile-channel.yaml', path, network);
        const updated = await channelGenerator.updateChannel(channelName, `${getArtifactsPath(path)}/${network.organizations[0].mspName}anchors.tx`);

        l(`[Channel] - Exit update channel request (${updated}) !!!`);
    }
    
    static async generateNewOrgDefinition(deploymentConfigPath: string, hostsConfigPath: string) {
        const network: Network = await ChannelOrchestrator._parse(deploymentConfigPath, hostsConfigPath);
        l('Validate input configuration file');
        const path = network.options.networkConfigPath ?? this._getDefaultPath();
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
        const network: Network = await ChannelOrchestrator._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? this._getDefaultPath();
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

    static async signCustomChannelDef(deploymentConfigPath: string, hostsConfigPath: string, channelDef, channelName) {
        const network: Network = await ChannelOrchestrator._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        const channelGenerator = new ChannelGenerator(`connection-profile-join-channel-${network.organizations[0].name}.yaml`, path, network);
        try{
            const signature = await channelGenerator.signConfig(channelDef);
            //save the sig to a file
            var bufSig = Buffer.from(JSON.stringify(signature));
            let pathSig = `${getNewOrgRequestSignaturesPath(network.options.networkConfigPath, channelName)}/${network.organizations[0].name}_sign.json`
            await SysWrapper.createFile(pathSig, JSON.stringify(signature));
        }catch(err) {
            e('error signing channel definition')
            e(err)
            return ;
        }
    }

    static async submitCustomChannelDef(deploymentConfigPath: string, hostsConfigPath: string, channelDef, signaturesFolder, channelName) {
        const network: Network = await ChannelOrchestrator._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

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
    
}
