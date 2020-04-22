import { join } from 'path';
import { l, d, e } from './utils/logs';
import { DeploymentParser } from './parser/deploymentParser';
import { DockercomposeRootCAYamlGenerator } from './generators/crypto/dockercomposeRootCA.yaml';
import { NetworkCleanShGenerator, NetworkCleanShOptions } from './generators/networkClean.sh';
import { ConfigurationValidator } from './parser/validator/configurationValidator';
import { DockerComposeYamlOptions } from './utils/data-type';
import { CreateCAShGenerator } from './generators/crypto/createCA.sh';
import { DownloadFabricBinariesGenerator } from './generators/utils/downloadFabricBinaries';
import { Network } from './models/network';
import { GenesisParser } from './parser/geneisParser';
import { ConfigtxYamlGenerator } from './generators/configtx.yaml';
import {Caclient} from './core/hlf/ca_client';

export class Orchestrator {
  networkRootPath = './hyperledger-fabric-network';

  async initNetwork(configFilePath: string) {
    // const homedir = require('os').homedir();
    // const path = join(homedir, this.networkRootPath);

    l('Validate input configuration file');
    const validator = new ConfigurationValidator();
    const isValid = validator.isValidDeployment(configFilePath);

    l('Start parsing the blockchain configuration file');
    let configParse = new DeploymentParser(configFilePath);
    const organizations = await configParse.parse();

    l('Finishing parsing the blockchain configuration file');
  }

  async generateGenesis(configGenesisFilePath: string) {
    const homedir = require('os').homedir();
    const path = join(homedir, this.networkRootPath);

    l('Parsing genesis input file');
    const validator = new ConfigurationValidator();
    const isValid = validator.isValidGenesis(configGenesisFilePath);
    if (!isValid) {
      e('Genesis configuration input file is invalid');
      return;
    }
    l('Input genesis file validated');

    l('Start parsing genesis input file');
    const parser = new GenesisParser(configGenesisFilePath);
    const network: Network = await parser.parse();
    l('Genesis input file parsed');

    l('Start generating configtx.yaml file');
    const configTx = new ConfigtxYamlGenerator('configtx.yaml', path, network);
    await configTx.save();
    l('Configtx.yaml file saved');

    d('Testing debugging genesis generation');
  }

  async validateAndParse(configFilePath: string, skipDownload = false) {
    l('Validate input configuration file');
    const validator = new ConfigurationValidator();
    const isValid = validator.isValidDeployment(configFilePath);

    if (!isValid) {
      e('Configuration file is invalid');
      return;
    }

    l('Start parsing the blockchain configuration file');
    let configParse = new DeploymentParser(configFilePath);
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

    if (!skipDownload) {
      l('Download fabric binaries...');
      const downloadFabricBinariesGenerator = new DownloadFabricBinariesGenerator('downloadFabric.sh', path, options);
      await downloadFabricBinariesGenerator.save();
      await downloadFabricBinariesGenerator.run();
      l('Ran Download fabric binaries');
    }

    // create ca

    // let dockerComposeRootCA = new DockercomposeRootCAYamlGenerator('docker-compose-ca.yaml', path, options);
    // l('Saving compose Root CA');
    // await dockerComposeRootCA.save();
    // l('Starting Root CA docker container...');
    // await dockerComposeRootCA.startRootCa();
    // l('Ran Root CA docker container...');
    //
    // const createCaShGenerator = new CreateCAShGenerator('createCa.sh', path, options);
    // l('Saving createCA.sh');
    // await createCaShGenerator.save();
    // l('Executing createCA.sh');
    // await createCaShGenerator.run();
    // l('Ran createCA.sh');
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

  public async enroll(id, secret, mspID,caInfo, walletDirectoryName, ccpPath) {
    const caclient = new Caclient(caInfo, walletDirectoryName, ccpPath);
    await caclient.enroll(id, secret, mspID);
  }

  public async registerUser(id, secret, affiliation, mspID, caInfo, walletDirectoryName, ccpPath) {

    const caclient = new Caclient(caInfo, walletDirectoryName, ccpPath);
    await caclient.registerUser (id, secret, affiliation, mspID);
  }

  public async fetchIdentity(id,caInfo, walletDirectoryName, ccpPath) {
    const caclient = new Caclient(caInfo, walletDirectoryName, ccpPath);
    await caclient.fetchIdentity(id);
  }

  public async deleteIdentity(id,caInfo, walletDirectoryName, ccpPath) {
    const caclient = new Caclient(caInfo, walletDirectoryName, ccpPath);
    await caclient.deleteIdentity(id);
  }
}
