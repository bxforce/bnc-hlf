import { join } from 'path';
import { l, d, e } from './utils/logs';
import { NetworkConfiguration } from './parser/networkConfiguration';
import { DockercomposeRootCAYamlGenerator } from './generators/crypto/dockercomposeRootCA.yaml';
import { DockercomposeRunShGenerator } from './generators/dockercomposeRun.sh';
import { NetworkCleanShGenerator, NetworkCleanShOptions } from './generators/networkClean.sh';
import { ConfigurationValidator } from './parser/configurationValidator';
import {DockerComposeYamlOptions} from './utils/data-type';
import {CreateCAShGenerator} from './generators/crypto/createCA.sh';
import {HLF_VERSION} from './utils/constants';
import {DownloadFabricBinariesGenerator} from './generators/utils/downloadFabricBinaries';

export class Orchestrator {
  networkRootPath = './hyperledger-fabric-network';

  async initNetwork(configFilePath: string) {
    // const homedir = require('os').homedir();
    // const path = join(homedir, this.networkRootPath);

    l('Validate input configuration file');
    const validator = new ConfigurationValidator();
    const isValid = validator.isValid(configFilePath);

    l('Start parsing the blockchain configuration file');
    let configParse = new NetworkConfiguration(configFilePath);
    const organizations = await configParse.parse();

    l('Finishing parsing the blockchain configuration file');
  }

  async validateAndParse(
    configFilePath: string,
    skipDownload = false
  ) {

    l('Validate input configuration file');
    const validator = new ConfigurationValidator();
    const isValid = validator.isValid(configFilePath);

    if(!isValid) {
      e('Configuration file is invalid');
      return;
    }

    l('Start parsing the blockchain configuration file');
    let configParse = new NetworkConfiguration(configFilePath);
    const organizations = await configParse.parse();

    // Generate dynamically crypto
    const homedir = require('os').homedir();
    const path = join(homedir, this.networkRootPath);

    const options: DockerComposeYamlOptions = {
      networkRootPath: path,
      composeNetwork: 'docker-compose-ca.yaml',
      org: organizations[0],
      envVars: {
        FABRIC_VERSION: '2.0.0',
        FABRIC_CA_VERSION: '1.4.4',
        THIRDPARTY_VERSION: '0.4.18'
      }
    };

    if(!skipDownload) {
      l('Download fabric binaries...');
      const downloadFabricBinariesGenerator = new DownloadFabricBinariesGenerator('downloadFabric.sh', path, options);
      await downloadFabricBinariesGenerator.save();
      await downloadFabricBinariesGenerator.run();
      l('Ran Download fabric binaries');
    }

    // create ca

    let dockerComposeRootCA = new DockercomposeRootCAYamlGenerator('docker-compose-ca.yaml', path, options);
    l('Saving compose Root CA');
    await dockerComposeRootCA.save();
    l('Starting Root CA docker container...');
    await dockerComposeRootCA.startRootCa();
    l('Ran Root CA docker container...');

    const createCaShGenerator = new CreateCAShGenerator('createCa.sh', path, options);
    l('Saving createCA.sh');
    await createCaShGenerator.save();
    l('Executing createCA.sh');
    await createCaShGenerator.run();
    l('Ran createCA.sh');
  }

  public async startRootCa() {
    const homedir = require('os').homedir();
    const path = join(homedir, this.networkRootPath);

    let dockerComposeRootCA = new DockercomposeRootCAYamlGenerator('docker-compose-ca.yaml', path, null);

    l('Saving compose Root CA');
    await dockerComposeRootCA.save();

    l('Starting Root CA docker container...');
    await dockerComposeRootCA.startRootCa();
    l('Ran Root CA docker container...');

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