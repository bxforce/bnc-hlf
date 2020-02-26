import { Orchestrator } from './orchestrator';

export class CLI {
  static async validateAndParse(configFilePath: string) {
    const orchEngine = new Orchestrator();
    await orchEngine.validateAndParse(configFilePath);
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
}
