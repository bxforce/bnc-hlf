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
import { CHANNEL_RAFT_ID } from '../utils/constants';
import { DockerEngine } from '../utils/dockerAgent';
import getDockerComposePath = Utils.getDockerComposePath;
import {DockerComposeYamlOptions} from '../utils/datatype';
import { DockerComposeCliOrderer } from '../generators/docker-compose/dockerComposeCliOrderer.yaml';

import {
    BNC_NETWORK,
    HLF_DEFAULT_VERSION,
    NETWORK_ROOT_PATH
} from '../utils/constants';
import { Helper } from './helper';

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

    static async signCustomChannelDef(deploymentConfigPath: string, hostsConfigPath: string, channelDef, channelName, isAddOrdererReq, isSystemChannel) {
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
        let channelGenerator;
        if(isAddOrdererReq){
            console.log("loading orderer connection profile")
            channelGenerator = new ChannelGenerator(`connection-profile-orderer-client.yaml`, path, network);

        } else {
            console.log("loading join channel connection profile")
            channelGenerator = new ChannelGenerator(`connection-profile-join-channel-${network.organizations[0].name}.yaml`, path, network);

        }

        try{
            const signature = await channelGenerator.signConfig(channelDef, isAddOrdererReq);
            //save the sig to a file
            var bufSig = Buffer.from(JSON.stringify(signature));
            let pathSig;
            let currentChannel = isSystemChannel? CHANNEL_RAFT_ID:channelName;
            console.log('CUUUUUUREENT CHAAANNEEEEL', currentChannel)
            if(isAddOrdererReq){
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
        if(addOrererReq){
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
            console.log('currenchanneeel !!!! ', currentChannel)
            await channelGenerator.submitChannelUpdate(channelDef, allSignatures, currentChannel, addOrererReq );
        }catch(err){
            e('ERROR submitting channel def')
            e(err)
            return ;
        }
    }

    static async addOrderer (deploymentConfigPath: string, hostsConfigPath: string, nameOrderer: string, portOrderer: string, nameChannel: string, addTLS?: boolean, addEndpoint?: boolean, systemChannel?: boolean){
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
        let channelGenerator;
        channelGenerator = new ChannelGenerator(`connection-profile-orderer-client.yaml`, path, network);
       /* if(systemChannel){
            console.log('loading admin orderer')
            channelGenerator = new ChannelGenerator(`connection-profile-orderer-client.yaml`, path, network);
        } else {
            console.log('loading peer admin')
            channelGenerator = new ChannelGenerator(`connection-profile-join-channel-${network.organizations[0].name}.yaml`, path, network);

        }

        */

        try{
           // name = "orderer7.bnc.com";
           // let port = "10050"
            //Need TLS certificates of orderer + endpoint
            const ordererTlsPath = getOrdererTlsCrt(network.options.networkConfigPath, network.organizations[0].fullName, nameOrderer);
           // console.log(ordererTlsPath);
            let tlsCrt = await getFile(ordererTlsPath);
            console.log(Buffer.from(tlsCrt).toString('base64'));
            let ordererTLSConverted = Buffer.from(tlsCrt).toString('base64');
            const ordererJsonConsenter = {
                    "client_tls_cert": `${ordererTLSConverted}`,
                    "host": `${nameOrderer}`,
                    "port": `${portOrderer}`,
                    "server_tls_cert": `${ordererTLSConverted}`
                }
            let currentChannelName = systemChannel? CHANNEL_RAFT_ID:nameChannel;
            console.log('#############currentchannel########################', currentChannelName)
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

            console.log(network.ordererOrganization[0].mspName)

            const engine = new DockerEngine({socketPath: '/var/run/docker.sock'});
            await engine.createNetwork({Name: options.composeNetwork});
            const ordererCliGenerator = DockerComposeCliOrderer.init(`docker-compose-cli-orderer.yaml`, options, engine);
            await ordererCliGenerator.createTemplateCliOrderer();
            await ordererCliGenerator.startCli()
            l(`'Starting orderer cli  container`);

            // create a function to fetch in the cli the last config block and put it under
            // artifacts with the name config_orderer.block
            //CMD:
           // peer channel fetch config config.pb -o orderer0.bnc.com:7050 -c system-channel --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/org1.bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem > ./channel-artifacts/config_orderer.block
          
        }catch (err) {
            e('Error generating new genesis')
            e(err)
            return ;
        }

    }
    
}
