/* tslint:disable:no-unused-variable */
import {Orchestrator} from './orchestrator';
import { Type_User }  from './utils/constants';

/**
 *
 * @author wassim.znaidi
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

  static async deployPeers(configFilePath: string, skipDownload?: boolean) {
    const orchEngine = new Orchestrator();
    await orchEngine.deployPeerContainer(configFilePath, skipDownload);
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

  static async generateGenesis(configGenesisFilePath: string) {
    const orchEngine = new Orchestrator();
    await orchEngine.generateGenesis(configGenesisFilePath);
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

  // static async createChannel(channeltxPath, nameChannel, nameOrg) {
  //   const channelEngine = new Orchestrator();
  //   await channelEngine.createChannel(nameChannel, channeltxPath, nameOrg);
  //   return channelEngine;
  // }
  //
  // static async joinChannel(nameChannel, nameOrg, peers) {
  //   const channelEngine = new Orchestrator();
  //   await channelEngine.joinChannel(nameChannel, nameOrg, peers);
  //   return channelEngine;
  // }
  //
  // static async updateChannel(anchortx, namech, nameorg) {
  //   const channelEngine = new Orchestrator();
  //   await channelEngine.updateChannel(anchortx, namech, nameorg);
  //   return channelEngine;
  // }
}
