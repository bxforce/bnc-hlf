import { join } from 'path';
import { l, d, e } from './utils/logs';
import { DeploymentParser } from './parser/deploymentParser';
import { NetworkCleanShGenerator, NetworkCleanShOptions } from './generators/networkClean.sh';
import { ConfigurationValidator } from './parser/validator/configurationValidator';
import { DockerComposeYamlOptions } from './utils/data-type';
import { DownloadFabricBinariesGenerator } from './generators/utils/downloadFabricBinaries';
import { Network } from './models/network';
import { DockerEngine, Network as DockerNetwork } from './agents/docker-agent';
import { GenesisParser } from './parser/geneisParser';
import { ConfigtxYamlGenerator } from './generators/configtx.yaml';
import { DockerComposeCaGenerator } from './generators/crypto/dockerComposeCa.yaml';
import { CreateIdentCertsShGenerator } from './generators/crypto/createIdentCerts.sh';
import { DockerComposePeerGenerator } from './generators/crypto/dockercomposePeer.yaml';

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
      composeNetwork: 'bnc_network',
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

    // create network
    const engine = new DockerEngine({ socketPath: '/var/run/docker.sock' });
    l('Create docker network (bnc-network)');
    await engine.createNetwork({ Name: options.composeNetwork });
    l('Docker network (bnc-network) created');

    // create ca
    let dockerComposeCA = new DockerComposeCaGenerator('docker-compose-ca.yaml', path, options, engine);
    l('Starting ORG CA docker container...');
    await dockerComposeCA.save();
    await dockerComposeCA.startOrgCa();
    l('Ran Root CA docker container...');

    const createCaShGenerator = new CreateIdentCertsShGenerator('createCerts.sh', path, options);
    l('Creating certificates');
    await createCaShGenerator.buildCertificate();
    l('Ran createCerts.sh');

    const dockerComposePeer = new DockerComposePeerGenerator('docker-compose-peer.yaml', path, options, engine);
    await dockerComposePeer.save();
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
