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
import {OrdererOrgGenerator} from '../generators/artifacts/ordererOrgGenerator';
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
import { CHANNEL_RAFT_ID } from '../utils/constants';
import { DockerEngine } from '../utils/dockerAgent';
import getDockerComposePath = Utils.getDockerComposePath;
import {DockerComposeYamlOptions} from '../utils/datatype';
import {ConfigTxBatchOptions} from '../utils/datatype';
import { DockerComposeCliOrderer } from '../generators/docker-compose/dockerComposeCliOrderer.yaml';
import { OrdererBootstrap } from '../core/hlf/ordererBootstrap';
import {
    BNC_NETWORK,
    HLF_DEFAULT_VERSION,
    NETWORK_ROOT_PATH,
    BATCH_DEFAULT_PARAMS
} from '../utils/constants';
import { Helper } from './helper';
import {DockerComposeOrdererGenerator} from '../generators/docker-compose/dockerComposeOrderer.yaml';

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
    static async generateConfigtx(configGenesisFilePath: string, batchTimeout?: string, maxMessageCount?: string, absoluteMaxBytes?: string, preferredMaxBytes?:string) {
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

        const options : ConfigTxBatchOptions ={
            batchTimeout: batchTimeout? batchTimeout: BATCH_DEFAULT_PARAMS.batchTimeout,
            maxMessageCount: maxMessageCount? maxMessageCount: BATCH_DEFAULT_PARAMS.maxMessageCount,
            absoluteMaxBytes: absoluteMaxBytes? absoluteMaxBytes: BATCH_DEFAULT_PARAMS.absoluteMaxBytes,
            preferredMaxBytes: preferredMaxBytes? preferredMaxBytes: BATCH_DEFAULT_PARAMS.preferredMaxBytes
        }

        l('[configtx] Start generating configtx.yaml file...');
        const configTx = new ConfigtxYamlGenerator('configtx.yaml', path, network, options);
        await configTx.save();
        l('[configtx] Configtx.yaml file saved !!!');
    }


    /**
     * Generate the Channel configuration file
     * @param configGenesisFilePath
     */
    static async generateChannelConfig(configGenesisFilePath: string, batchTimeout?: string, maxMessageCount?: string, absoluteMaxBytes?: string, preferredMaxBytes?:string) {
        const network: Network = await Helper._parseGenesis(configGenesisFilePath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();

        const options : ConfigTxBatchOptions ={
            batchTimeout: batchTimeout? batchTimeout: BATCH_DEFAULT_PARAMS.batchTimeout,
            maxMessageCount: maxMessageCount? maxMessageCount: BATCH_DEFAULT_PARAMS.maxMessageCount,
            absoluteMaxBytes: absoluteMaxBytes? absoluteMaxBytes: BATCH_DEFAULT_PARAMS.absoluteMaxBytes,
            preferredMaxBytes: preferredMaxBytes? preferredMaxBytes: BATCH_DEFAULT_PARAMS.preferredMaxBytes
        }
        
        l('[channel config]: start generating channel configuration...');
        const configTx = new ConfigtxYamlGenerator('configtx.yaml', path, network, options);

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
    
    static async generateNewOrgDefinition(deploymentConfigPath: string, hostsConfigPath: string, addOrderer?) {
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
        // Generate the ordering organization definition
        if(addOrderer){
            const configTxOrdererOrg = new OrdererOrgGenerator('configtx.yaml', path, network,  network.ordererOrganization[0])
            await configTxOrdererOrg.save();
            await configTxOrdererOrg.generateDefinition();
            // Generating new orderer TLS information in JSON format
            let portOrderer = network.ordererOrganization[0].orderers[0].options.ports[0];
            let nameOrderer = `${ network.ordererOrganization[0].orderers[0].name}.${network.ordererOrganization[0].orderers[0].options.domainName}`
            const ordererTlsPath = getOrdererTlsCrt(network.options.networkConfigPath, network.organizations[0].fullName, nameOrderer);
            let tlsCrt = await getFile(ordererTlsPath);
            let ordererTLSConverted = Buffer.from(tlsCrt).toString('base64');
            const ordererJsonConsenter = {
                "client_tls_cert": `${ordererTLSConverted}`,
                "host": `${nameOrderer}`,
                "port": parseInt(portOrderer),
                "server_tls_cert": `${ordererTLSConverted}`
            }
            //save the file
            await SysWrapper.createFile(`${getArtifactsPath(path)}/orderer.json`, JSON.stringify(ordererJsonConsenter));
        }



    }

    static async generateCustomChannelDef(deploymentConfigPath: string, hostsConfigPath: string, orgDefinition, anchorDefinition, channelName) {
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
        let channelGenerator;
        if(channelName){
            channelGenerator = new ChannelGenerator(`connection-profile-join-channel-${network.organizations[0].name}.yaml`, path, network);

        } else {
            channelGenerator = new ChannelGenerator(`connection-profile-orderer-client.yaml`, path, network);
        }

        try{
            await channelGenerator.generateCustomChannelDef(orgDefinition, anchorDefinition, channelName)
        }catch(err){
            e('ERROR generating new channel DEF')
            e(err)
            return ;
        }
    }


    static async addNewOrdererOrganization(deploymentConfigPath: string, hostsConfigPath: string, ordererOrgPath, channelName) {
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
        let channelGenerator;
        if(channelName){
            channelGenerator = new ChannelGenerator(`connection-profile-join-channel-${network.organizations[0].name}.yaml`, path, network);

        } else {
            channelGenerator = new ChannelGenerator(`connection-profile-orderer-client.yaml`, path, network);
        }

        try{
            await channelGenerator.addNewOrdererOrganization(ordererOrgPath, channelName)
        }catch(err){
            e('ERROR generating new channel DEF')
            e(err)
            return ;
        }
    }

    static async signCustomChannelDef(deploymentConfigPath: string, hostsConfigPath: string, channelDef, channelName, isAddOrdererReq, isSystemChannel) {
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
        let channelGenerator;
        if(isAddOrdererReq || isSystemChannel){
            channelGenerator = new ChannelGenerator(`connection-profile-orderer-client.yaml`, path, network);
        } else {
            channelGenerator = new ChannelGenerator(`connection-profile-join-channel-${network.organizations[0].name}.yaml`, path, network);
        }

        try{
            const signature = await channelGenerator.signConfig(channelDef, isAddOrdererReq, isSystemChannel);
            //save the sig to a file
            var bufSig = Buffer.from(JSON.stringify(signature));
            let pathSig;
            let currentChannel = isSystemChannel? CHANNEL_RAFT_ID:channelName;
            if(isAddOrdererReq || isSystemChannel){
                pathSig = `${getAddOrdererSignaturesPath(network.options.networkConfigPath, currentChannel)}/${network.organizations[0].name}_sign.json`
            } else {
                pathSig = `${getNewOrgRequestSignaturesPath(network.options.networkConfigPath, currentChannel)}/${network.organizations[0].name}_sign.json`
            }
            await SysWrapper.createFile(pathSig, JSON.stringify(signature));
        }catch(err) {
            e('error signing channel definition')
            e(err)
            return ;
        }
    }

    static async submitCustomChannelDef(deploymentConfigPath: string, hostsConfigPath: string, channelDef, signaturesFolder, channelName, addOrererReq, systemChannel) {
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
        let  channelGenerator;
        if(addOrererReq || systemChannel){
            channelGenerator = new ChannelGenerator(`connection-profile-orderer-client.yaml`, path, network);

        } else {
            channelGenerator = new ChannelGenerator(`connection-profile-join-channel-${network.organizations[0].name}.yaml`, path, network);

        }

        let allSignatures=[];
        let sigFiles = await SysWrapper.enumFilesInFolder(signaturesFolder)
        for(let myFile of sigFiles){
            let tmp =  await SysWrapper.getJSON(`${signaturesFolder}/${myFile}`);
            let signature_header_buff = tmp.signature_header.buffer;
            let signature_buff = tmp.signature.buffer;

            let sig_header_wrapped = ByteBuffer.wrap(signature_header_buff.data);
            let sig_wraped = ByteBuffer.wrap(signature_buff.data);

            let sig_obj_wrapped = {
                signature_header:sig_header_wrapped,
                signature: sig_wraped
            }
            allSignatures.push(sig_obj_wrapped)
        }
        try{
            let currentChannel = systemChannel? CHANNEL_RAFT_ID:channelName
            await channelGenerator.submitChannelUpdate(channelDef, allSignatures, currentChannel, addOrererReq, systemChannel );
        }catch(err){
            e('ERROR submitting channel def')
            e(err)
            return ;
        }
    }

    static async addOrderer (deploymentConfigPath: string, hostsConfigPath: string, nameOrderer: string, portOrderer: string, nameChannel: string, addTLS?: boolean, addEndpoint?: boolean, systemChannel?: boolean, addOrdererOrg?){
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
        let channelGenerator;
        let ordererJsonConsenter;
        channelGenerator = new ChannelGenerator(`connection-profile-orderer-client.yaml`, path, network);
        try{
            if(!addOrdererOrg){
                const ordererTlsPath = getOrdererTlsCrt(network.options.networkConfigPath, network.organizations[0].fullName, nameOrderer);
                let tlsCrt = await getFile(ordererTlsPath);
                let ordererTLSConverted = Buffer.from(tlsCrt).toString('base64');
                ordererJsonConsenter = {
                    "client_tls_cert": `${ordererTLSConverted}`,
                    "host": `${nameOrderer}`,
                    "port": parseInt(portOrderer),
                    "server_tls_cert": `${ordererTLSConverted}`
                }
            } else {
                let newOrdererOrgJsonDef = await SysWrapper.readFile(addOrdererOrg);
                ordererJsonConsenter = JSON.parse(newOrdererOrgJsonDef);
            }


            let currentChannelName = systemChannel? CHANNEL_RAFT_ID:nameChannel;
            await channelGenerator.addOrdererToChannel(ordererJsonConsenter, nameOrderer, portOrderer, addTLS, addEndpoint, currentChannelName);
        }catch(err){
            e('ERROR generating new channel DEF')
            e(err)
            return ;
        }
    }

    static async generateNewGenesis(deploymentConfigPath: string, hostsConfigPath: string) {
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
        try{
            const organization: Organization = network.organizations[0];
            l('[End] Blockchain configuration files parsed');

            // Assign & check root path
            const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
            await SysWrapper.createFolder(path);

            // Auto-create docker-compose folder if not exists
            await SysWrapper.createFolder(getDockerComposePath(path));

            const options: DockerComposeYamlOptions = {
                networkRootPath: path,
                composeNetwork: BNC_NETWORK,
                org: network.organizations[0],
                ord: network.ordererOrganization[0],
                hosts: network.hosts,
                envVars: {
                    FABRIC_VERSION: HLF_DEFAULT_VERSION.FABRIC,
                    FABRIC_CA_VERSION: HLF_DEFAULT_VERSION.CA,
                    THIRDPARTY_VERSION: HLF_DEFAULT_VERSION.THIRDPARTY
                }
            };
            const engine = new DockerEngine({socketPath: '/var/run/docker.sock'});
            await engine.createNetwork({Name: options.composeNetwork});
            const ordererCliGenerator = DockerComposeCliOrderer.init(`docker-compose-cli-orderer.yaml`, options, engine);
            await ordererCliGenerator.createTemplateCliOrderer();
            await ordererCliGenerator.startCli()
            l(`'Starting orderer cli  container`);
            const ordererBootstrap = new OrdererBootstrap(engine);
            await ordererBootstrap.init(network.organizations[0].fullName);
            await ordererBootstrap.createGenesis();

        } catch (err) {
            e('Error generating new genesis')
            e(err)
            return ;
        }

    }
    
}
