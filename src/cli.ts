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

/* tslint:disable:no-unused-variable */
import {Orchestrator} from './orchestrator';
import { Type_User }  from './utils/constants';
import { Network } from './models/network';

/**
 *
 * @author wassim.znaidi@gmail.com
 * @author sahar
 * @author ahmed
 */
export class CLI {
  static async validateAndParse(configFilePath: string, skipDownload?: boolean) {
    const orchEngine = new Orchestrator();
    await orchEngine.validateAndParse(configFilePath, skipDownload);
    return orchEngine;
  }

  static async generatePeersCredentials(configFilePath: string) {
    const orchEngine = new Orchestrator();
    await orchEngine.generatePeersCredentials(configFilePath);
    return orchEngine;
  }

  static async deployHlfContainers(configFilePath: string, skipDownload?: boolean, enablePeers = true, enableOrderers = true) {
    const orchEngine = new Orchestrator();
    await orchEngine.deployHLFContainers(configFilePath, skipDownload, enablePeers, enableOrderers);
    return orchEngine;
  }

  static async createNetwork(configFilePath: string) {
    const orchEngine = new Orchestrator();
    await orchEngine.initNetwork(configFilePath);
    return orchEngine;
  }

  static async cleanNetwork(rmi: boolean) {
    const orchEngine = new Orchestrator();
    await orchEngine.cleanDocker(rmi);
    return orchEngine;
  }

  /**
   * Stop the blockchain already deployed using the deployment config file
   * @param deployConfigPath
   * @param deleteNetwork
   * @param deleteVolume
   * @param forceRemove
   */
  static async stopBlockchain(deployConfigPath: string, deleteNetwork: boolean, deleteVolume: boolean, forceRemove: boolean) {
    const orchEngine = new Orchestrator();
    await orchEngine.stopBlockchainContainer(deployConfigPath, deleteNetwork, deleteVolume, forceRemove);
    return orchEngine;
  }

  /**
   * Generate the Configtx yaml file
   * @param configGenesisFilePath genesis configuration input file
   */
  static async generateConfigtx(configGenesisFilePath: string) {
    const orchEngine = new Orchestrator();
    await orchEngine.generateConfigtx(configGenesisFilePath);
    return orchEngine;
  }

  /**
   * Generate the genesis block file
   * @param configGenesisFilePath
   */
  static async generateGenesis(configGenesisFilePath: string) {
    const orchEngine = new Orchestrator();
    await orchEngine.generateGenesis(configGenesisFilePath);
    return orchEngine;
  }

  /**
   * Generate the channel configuration file
   * @param configGenesisFilePath
   */
  static async generateChannelConfig(configGenesisFilePath: string) {
    const orchEngine = new Orchestrator();
    await orchEngine.generateConfigChannel(configGenesisFilePath);
    return orchEngine;
  }

  /**
   * Generate the anchor peer update file
   * @param configGenesisFilePath
   */
  static async generateAnchorPeer(configGenesisFilePath: string) {
    const orchEngine = new Orchestrator();
    await orchEngine.generateAnchorPeer(configGenesisFilePath);
    return orchEngine;
  }

  static async generateOrdererCredentials(configGenesisFilePath: string) {
    const orchEngine = new Orchestrator();
    await orchEngine.generateOrdererCredentials(configGenesisFilePath);
    return orchEngine;
  }

  static async enroll(type, id, secret, affiliation, mspID, caInfo, walletDirectoryName, ccpPath) {
    const enrollEngine = new Orchestrator();
    if(type == Type_User.admin){
      await enrollEngine.enroll(id, secret, mspID, caInfo, walletDirectoryName, ccpPath);
    } else {
      await enrollEngine.registerUser(id, secret, affiliation, mspID, caInfo, walletDirectoryName, ccpPath);
    }
  }

  static async fetchIdentity(id, caInfo, walletDirectoryName, ccpPath) {
    const enrollEngine = new Orchestrator();
    await enrollEngine.fetchIdentity(id, caInfo, walletDirectoryName, ccpPath);
  }

  static async deleteIdentity(id, caInfo, walletDirectoryName, ccpPath) {
    const enrollEngine = new Orchestrator();
    await enrollEngine.deleteIdentity(id, caInfo, walletDirectoryName, ccpPath);
  }

  /**
   * Create a new channel
   * @param channelName
   * @param channeltxPath
   * @param deployConfigPath
   */
  static async createChannel(channelName, channeltxPath, deployConfigPath) {
    const channelEngine = new Orchestrator();
    await channelEngine.createChannel(channelName, channeltxPath, deployConfigPath);
    return channelEngine;
  }

   static async joinChannel(nameChannel, nameOrg, deployConfigPath) {
     const channelEngine = new Orchestrator();
     await channelEngine.joinChannel(nameChannel, deployConfigPath);
     return channelEngine;
   }
  //
  static async updateChannel(anchortx, namech, deployConfigPath) {
    const channelEngine = new Orchestrator();
    await channelEngine.updateChannel(anchortx, namech, deployConfigPath);
    return channelEngine;
  }

  //Chaincode commands
  static async installChaincode(name: string, deployPath: string , targets: string[] , version: string) {
    const chaincodeEngine = new Orchestrator();
    let targetPeers = await chaincodeEngine.getTargetPeers(deployPath, targets)
    await chaincodeEngine.deployCliSingleton(name, deployPath, targetPeers, version)
    await chaincodeEngine.installChaincodeCli(name, deployPath, targetPeers, version)
    return chaincodeEngine;
  }

  static async approveChaincode(doCommit: boolean, configFile, name, version, sequence, channelName) {
    const chaincodeEngine = new Orchestrator();
    await chaincodeEngine.approveChaincodeCli(doCommit, configFile, name, version, sequence, channelName);
    return  chaincodeEngine;
  }

  static async commitChaincode( config, listPeers, commitFile) {
    const chaincodeEngine = new Orchestrator();
    await chaincodeEngine.commitChaincode(config, listPeers, commitFile);
    return  chaincodeEngine;
  }
}
