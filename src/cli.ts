/* tslint:disable:no-unused-variable */
import {Orchestrator} from './orchestrator';
import { Type_User }  from './utils/constants';
import * as channel from './core/hlf/channel';

export class CLI {
  static async validateAndParse(configFilePath: string, skipDownload?: boolean) {
    const orchEngine = new Orchestrator();
    await orchEngine.validateAndParse(configFilePath, skipDownload);
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

  static async startRootCA() {
    const orchEngine = new Orchestrator();
    await orchEngine.startRootCa();
    return orchEngine;
  }

  static async generateGenesis(configGenesisFilePath: string) {
    const orchEngine = new Orchestrator();
    await orchEngine.generateGenesis(configGenesisFilePath);
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

  static async createChannel(channeltxPath, nameChannel, nameOrg) {
    const enrollEngine = new Orchestrator();
    console.log('into cli')
    channel.createChannel(nameChannel, channeltxPath, nameOrg);
  }
}
