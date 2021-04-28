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

import { l } from './utils/logs';
import { Orchestrator } from './orchestrator/orchestrator';
import { ChaincodeOrchestrator } from './orchestrator/chaincodeOrchestrator';
import { ChannelOrchestrator } from './orchestrator/channelOrchestrator';

/**
 *
 * @author Ahmed Souissi
 * @author Sahar Fehri
 * @author wassim.znaidi@gmail.com
 */
export class CLI {

  static async init(genesisConfigPath: string, genesis: boolean, configtx: boolean, anchortx: any, batchTimeout?: string, maxMessageCount?: string, absoluteMaxBytes?: string, preferredMaxBytes?:string) {
    l('Request Init command ...');
    await ChannelOrchestrator.generateConfigtx(genesisConfigPath, batchTimeout, maxMessageCount, absoluteMaxBytes, preferredMaxBytes); // Generate the configtx.yaml file (mainly for genesis block)
    if (!(genesis || configtx || anchortx)) {
      l('[Init]: generate all config files (genesis, configtx, anchortx)...');
      await Orchestrator.generateGenesis(genesisConfigPath, batchTimeout, maxMessageCount, absoluteMaxBytes, preferredMaxBytes);
      await ChannelOrchestrator.generateChannelConfig(genesisConfigPath, batchTimeout, maxMessageCount, absoluteMaxBytes, preferredMaxBytes);
      await Orchestrator.generateAnchorPeer(genesisConfigPath, batchTimeout, maxMessageCount, absoluteMaxBytes, preferredMaxBytes);
    } else {
      if (genesis) {
        l('[Init]: generate genesis block ... ');
        await Orchestrator.generateGenesis(genesisConfigPath, batchTimeout, maxMessageCount, absoluteMaxBytes, preferredMaxBytes);
        l('[Init]: genesis block generated done !!! ');
      }
      if (configtx) {
        l('[Init]: generate channel config file... ');
        await ChannelOrchestrator.generateChannelConfig(genesisConfigPath, batchTimeout, maxMessageCount, absoluteMaxBytes, preferredMaxBytes);
        l('[Init]: channel configuration generated done !!! ');
      }
      if (anchortx) {
        l('[Init]: generate the anchor peer update file...');
        await Orchestrator.generateAnchorPeer(genesisConfigPath, batchTimeout, maxMessageCount, absoluteMaxBytes, preferredMaxBytes);
        l('[Init]: anchor peer update generated done !!!');
      }
    }
    l('[Init]: exit command !!!');
  }
  
  static async generatePeersCredentials(deployConfigPath: string, hostsConfigPath: string) {
    await Orchestrator.generatePeersCredentials(deployConfigPath, hostsConfigPath);
  }

  static async generateOrdererCredentials(deployConfigPath: string, hostsConfigPath: string) {
    await Orchestrator.generateOrdererCredentials(deployConfigPath, hostsConfigPath);
  }

  static async createChannel(deployConfigPath: string, hostsConfigPath: string, channelName) {
    await ChannelOrchestrator.createChannel(deployConfigPath, hostsConfigPath, channelName);
  }

  static async joinChannel(deployConfigPath: string, hostsConfigPath: string, channelName) {
     await ChannelOrchestrator.joinChannel(deployConfigPath, hostsConfigPath, channelName);
  }
  
  static async updateChannel(deployConfigPath: string, hostsConfigPath: string, channelName) {
    await ChannelOrchestrator.updateChannel(deployConfigPath, hostsConfigPath, channelName);
  }


  static async installChaincode(deployConfigPath: string, hostsConfigPath: string, commitConfigPath: string, targets?: string[]) {
    await ChaincodeOrchestrator.installChaincode(deployConfigPath, hostsConfigPath, commitConfigPath, targets);
  }

  static async approveChaincode(deployConfigPath: string, hostsConfigPath: string, commitConfigPath: string, upgrade: boolean, policy: boolean, privateData: boolean, forceNew: boolean) {
    await ChaincodeOrchestrator.approveChaincodeCli(deployConfigPath, hostsConfigPath, commitConfigPath, upgrade, policy, privateData, forceNew)
  }

  static async commitChaincode(deployConfigPath: string, hostsConfigPath: string, commitConfigPath: string, upgrade: boolean, policy: boolean, privateData: boolean) {
    await ChaincodeOrchestrator.commitChaincode(deployConfigPath, hostsConfigPath, commitConfigPath, upgrade, policy, privateData)
  }

  static async deployChaincode(deployConfigPath: string, hostsConfigPath: string, commitConfigPath: string, targets?: string[], upgrade?: boolean, policy?: boolean, privateData?: boolean, forceNew?:boolean) {
    await ChaincodeOrchestrator.deployChaincode(targets, upgrade, policy, privateData, forceNew, deployConfigPath, hostsConfigPath, commitConfigPath)
  }

  static async invokeChaincode(deployConfigPath: string, hostsConfigPath: string, commitConfigPath: string, args?: string[]) {
    await ChaincodeOrchestrator.invokeChaincode(deployConfigPath, hostsConfigPath, commitConfigPath, args);
  }

  static async queryChaincode(deployConfigPath: string, hostsConfigPath: string, commitConfigPath: string, args?: string[]) {
    await ChaincodeOrchestrator.queryChaincode(deployConfigPath, hostsConfigPath, commitConfigPath, args);
  }
  
  
  static async startFabricCli(deployConfigPath: string, hostsConfigPath: string, commitConfigPath: string) {
    await ChaincodeOrchestrator.deployChaincodeCli(deployConfigPath, hostsConfigPath, commitConfigPath)
  }

  static async deployHlfServices(deployConfigPath: string, hostsConfigPath: string, skipDownload?: boolean, enablePeers = true, enableOrderers = true, enableCA?: boolean) {
    await Orchestrator.deployHlfServices(deployConfigPath, hostsConfigPath, skipDownload, enablePeers, enableOrderers, enableCA);
  }

  static async stopHlfServices(deployConfigPath: string, hostsConfigPath: string, forceRemove: boolean) {
    l('Request stop command ...');
    await Orchestrator.stopHlfServices(forceRemove, deployConfigPath, hostsConfigPath);
    l('Blockchain stopped !!!');
  }

  static async cleanNetwork(deployConfigPath: string, hostsConfigPath: string, forceRemove: boolean) {
    await Orchestrator.cleanDocker(forceRemove, deployConfigPath, hostsConfigPath);
  }
  
  
  static async generateNewOrgDefinition(deployConfigPath: string, hostsConfigPath: string, addOrderer?) {
    await ChannelOrchestrator.generateNewOrgDefinition(deployConfigPath, hostsConfigPath, addOrderer);
  }

  static async generateCustomChannelDef(deployConfigPath: string, hostsConfigPath: string, orgDefinition, anchorDefinition, channelName: string) {
      await ChannelOrchestrator.generateCustomChannelDef(deployConfigPath, hostsConfigPath, orgDefinition, anchorDefinition, channelName);
  }

  static async generateNewGenesis(deployConfigPath: string, hostsConfigPath: string) {
    //generate the new genesis.block to be used by org3 to bootstrap new orderer
    // look for config_orderer.block under artifacts
    await ChannelOrchestrator.generateNewGenesis(deployConfigPath, hostsConfigPath);
  }

  static async signCustomChannelDef(deployConfigPath: string, hostsConfigPath: string, channelDef, channelName, isAddOrdererReq, isSystemChannel){
    await ChannelOrchestrator.signCustomChannelDef(deployConfigPath, hostsConfigPath, channelDef, channelName, isAddOrdererReq, isSystemChannel);
  }

  static async submitCustomChannelDef(deployConfigPath: string, hostsConfigPath: string, channelDef, signatures, channelName: string, addOrdererReq: string, systemChannel){
    await ChannelOrchestrator.submitCustomChannelDef(deployConfigPath, hostsConfigPath, channelDef, signatures, channelName, addOrdererReq, systemChannel);
  }

  static async addOrderer(deployConfigPath: string, hostsConfigPath: string, nameOrderer, portOrderer, nameChannel, addTLS?, addEndpoint?, systemChannel?, addOrdererOrg?){
    await ChannelOrchestrator.addOrderer(deployConfigPath, hostsConfigPath, nameOrderer, portOrderer, nameChannel, addTLS, addEndpoint, systemChannel, addOrdererOrg);
  }

  static async addNewOrdererOrganization(deployConfigPath: string, hostsConfigPath: string, ordererOrgPath, nameChannel){
    await ChannelOrchestrator.addNewOrdererOrganization(deployConfigPath, hostsConfigPath, ordererOrgPath, nameChannel);
  }



  static async startNewOrderer(deployConfigPath: string, hostsConfigPath: string, deployOrdererConfigPath: string, noCli){
    if(noCli){
      await Orchestrator.startSingleOrderer(deployOrdererConfigPath, hostsConfigPath);
    } else {
      await ChannelOrchestrator.generateNewGenesis(deployConfigPath, hostsConfigPath);
      await Orchestrator.startSingleOrderer(deployOrdererConfigPath, hostsConfigPath);
    }
  }

  /****************************************************************************/

  static async upgradeChaincode() {
    l('[Upgrade Chaincode] Not yet implemented');
  }


/*
  static async enroll(type, id, secret, affiliation, mspID, caInfo, walletDirectoryName, ccpPath) {
    if(type == USER_TYPE.admin){
      await Orchestrator.enroll(id, secret, mspID, caInfo, walletDirectoryName, ccpPath);
    } else {
      await Orchestrator.registerUser(id, secret, affiliation, mspID, caInfo, walletDirectoryName, ccpPath);
    }
  }

  static async createNetwork(filePath: string) {
    return await Orchestrator.initNetwork(filePath);
  }

  static async cleanNetwork(rmi: boolean) {
    return await Orchestrator.cleanNetwork(rmi);
  }

  static async fetchIdentity(id, caInfo, walletDirectoryName, ccpPath) {
    await Orchestrator.fetchIdentity(id, caInfo, walletDirectoryName, ccpPath);
  }

  static async deleteIdentity(id, caInfo, walletDirectoryName, ccpPath) {
    return await Orchestrator.deleteIdentity(id, caInfo, walletDirectoryName, ccpPath);
  }
*/
};
