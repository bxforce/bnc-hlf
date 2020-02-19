/* tslint:disable:no-unused-variable */
import { l } from './utils/logs';
import { join, resolve } from 'path';
import { NetworkCleanShGenerator, NetworkCleanShOptions } from './generators/networkClean.sh';
import { DockercomposeRootCAYamlGenerator } from './generators/dockercomposeRootCA.yaml';
import { DockercomposeRunShGenerator } from './generators/dockercomposeRun.sh';
import { ConfigParser } from './parser/configParser';

export class CLI {
  static async createNetwork(configFilePath: string) {
    const cli = new NetworkCLI();
    await cli.init(configFilePath);
    return cli;
  }

  static async cleanNetwork(rmi: boolean) {
    return;
  }

  static async startRootCA() {
    const cli = new NetworkCLI();
    await cli.startRootCa();
    return cli;
  }
}

export class NetworkCLI {
  networkRootPath = './hyperledger-fabric-network';

  public async init(configFilePath: string) {
    this.initNetwork(configFilePath);
  }

  async initNetwork(configFilePath: string) {
    const homedir = require('os').homedir();
    const path = join(homedir, this.networkRootPath);

    l('Start parsing the blockchain configuration file');
    let configParse = new ConfigParser(configFilePath);
    await configParse.parse();

    l('Finishing parsing the blockchain configuration file');
  }

  public async startRootCa() {
    const homedir = require('os').homedir();
    const path = join(homedir, this.networkRootPath);

    let dockercomposeRootCA = new DockercomposeRootCAYamlGenerator('docker-compose-root-ca.yaml', path);

    let dockerRun = new DockercomposeRunShGenerator('docker-start-ca.sh', path, {
      networkRootPath: path,
      composeFileName: 'docker-compose-root-ca.yaml'
    });

    l('Saving compose Root CA');
    await dockercomposeRootCA.save();

    l('Create docker start script');
    await dockerRun.save();
    l('Saved docker start script');
    l('Running Docker Root CA');
    await dockerRun.run();
    l(`Ran docker Root CA script`);
  }

  public async clean(rmi: boolean) {
    const options = new NetworkCleanShOptions();
    options.removeImages = rmi;

    let networkClean = new NetworkCleanShGenerator('clean.sh', 'na', options);
    await networkClean.run();

    l('************ Success!');
    l('Environment cleaned!');
  }
}

export class ChaincodeCLI {
  networkRootPath = './hyperledger-fabric-network';

  constructor(private name: string) {}
}
