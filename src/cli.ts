import { Orchestrator } from './orchestrator';

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
}
