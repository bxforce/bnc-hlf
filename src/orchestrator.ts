import {join} from 'path';
import {l} from './utils/logs';
import {ConfigParser} from './parser/configParser';
import {DockercomposeRootCAYamlGenerator} from './generators/dockercomposeRootCA.yaml';
import {DockercomposeRunShGenerator} from './generators/dockercomposeRun.sh';
import {NetworkCleanShGenerator, NetworkCleanShOptions} from './generators/networkClean.sh';

export  class Orchestrator {
  networkRootPath = './hyperledger-fabric-network';

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

    let dockerComposeRootCA = new DockercomposeRootCAYamlGenerator('docker-compose-root-ca.yaml', path);

    let dockerRun = new DockercomposeRunShGenerator('docker-start-ca.sh', path, {
      networkRootPath: path,
      composeFileName: 'docker-compose-root-ca.yaml'
    });

    l('Saving compose Root CA');
    await dockerComposeRootCA.save();

    l('Create docker start script');
    await dockerRun.save();
    l('Saved docker start script');
    l('Running Docker Root CA');
    await dockerRun.run();
    l(`Ran docker Root CA script`);
  }

  public async cleanDocker(rmi: boolean) {
    const options = new NetworkCleanShOptions();
    options.removeImages = rmi;

    let networkClean = new NetworkCleanShGenerator('clean.sh', 'na', options);
    await networkClean.run();

    l('************ Success!');
    l('Environment cleaned!');
  }
}