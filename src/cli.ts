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
import { Orchestrator } from './orchestrator';

/**
 *
 * @author Ahmed Souissi
 * @author Sahar Fehri
 * @author wassim.znaidi@gmail.com
 */
export class CLI {

  static async init(genesisConfigPath: string, genesis: boolean, configtx: boolean, anchortx: any) {
    l('Request Init command ...');
    await Orchestrator.generateConfigtx(genesisConfigPath); // Generate the configtx.yaml file (mainly for genesis block)
    if (!(genesis || configtx || anchortx)) {
      l('[Init]: generate all config files (genesis, configtx, anchortx)...');
      await Orchestrator.generateGenesis(genesisConfigPath);
      await Orchestrator.generateChannelConfig(genesisConfigPath);
      await Orchestrator.generateAnchorPeer(genesisConfigPath);
    } else {
      if (genesis) {
        l('[Init]: generate genesis block ... ');
        await Orchestrator.generateGenesis(genesisConfigPath);
        l('[Init]: genesis block generated done !!! ');
      }
      if (configtx) {
        l('[Init]: generate channel config file... ');
        await Orchestrator.generateChannelConfig(genesisConfigPath);
        l('[Init]: channel configuration generated done !!! ');
      }
      if (anchortx) {
        l('[Init]: generate the anchor peer update file...');
        await Orchestrator.generateAnchorPeer(genesisConfigPath);
        l('[Init]: anchor peer update generated done !!!');
      }
    }
    l('[Init]: exit command !!!');
  }
  
  static async generatePeersCredentials(deployConfigPath: string) {
    await Orchestrator.generatePeersCredentials(deployConfigPath);
  }

  static async generateOrdererCredentials(genesisConfigFilePath: string) {
    await Orchestrator.generateOrdererCredentials(genesisConfigFilePath);
  }

  static async createChannel(channelName, deployConfigPath) {
    await Orchestrator.createChannel(channelName, deployConfigPath);
  }

  static async joinChannel(channelName, deployConfigPath) {
     await Orchestrator.joinChannel(channelName, deployConfigPath);
  }
  
  static async updateChannel(channelName, deployConfigPath) {
    await Orchestrator.updateChannel(channelName, deployConfigPath);
  }

  static async installChaincode(name: string, deployConfigPath: string, version: string, chaincodeRootPath, chaincodePath, targets?: string[]) {
    await Orchestrator.installChaincode(name, deployConfigPath, version, chaincodeRootPath, chaincodePath, targets);
  }

  static async approveChaincode(filePath, name: string, version: string, channelName: string, upgrade?: boolean) {
    await Orchestrator.approveChaincodeCli(filePath, name, version, channelName, upgrade)
  }

  static async commitChaincode(configFile, commitFile, upgrade?: boolean) {
    await Orchestrator.commitChaincode(configFile, commitFile, upgrade)
  }

  static async deployChaincode(deployConfigPath, commitFile, targets?: string[], upgrade?: boolean) {
    await Orchestrator.deployChaincode(deployConfigPath, commitFile, targets, upgrade)
  }

  static async upgradeChaincode() {
    l('[Upgrade Chaincode] Not yet implemented');
  }

  static async invokeChaincode() {
    l('[Invoke Chaincode] Not yet implemented');
  }
  
  static async startFabricCli(deployConfigPath, commitFile, compile = false) {
    await Orchestrator.deployCli(deployConfigPath, commitFile, compile)
  }

  static async deployHlfServices(deployConfigPath: string, skipDownload?: boolean, enablePeers = true, enableOrderers = true) {
    await Orchestrator.deployHlfServices(deployConfigPath, skipDownload, enablePeers, enableOrderers);
  }

  static async stopHlfServices(deployConfigPath: string, forceRemove: boolean) {
    l('Request stop command ...');
    await Orchestrator.stopHlfServices(deployConfigPath, false, false, forceRemove);
    l('Blockchain stopped !!!');
  }

  static async cleanNetwork(rmi: boolean) {
    await Orchestrator.cleanDocker(rmi);
  }

  /****************************************************************************/
  
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
