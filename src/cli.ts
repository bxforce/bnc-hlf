/* tslint:disable:no-unused-variable */
import {Orchestrator} from './orchestrator';

enum Type {
  admin = 'admin',
  user = 'user'
}

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

  static async enroll(type, id, secret, affiliation, mspID) {
    const enrollEngine = new Orchestrator();
    if(type == Type.admin){
      await enrollEngine.enrollManager(id, secret, mspID);
    } else {
      await enrollEngine.registerManager(id, secret, affiliation, mspID);
    }
  }

  static async fetchIdentity(id) {
    const enrollEngine = new Orchestrator();
    await enrollEngine.fetchIdentity(id);
  }

  static async deleteIdentity(id) {
    const enrollEngine = new Orchestrator();
    await enrollEngine.deleteIdentity(id);
  }
}
