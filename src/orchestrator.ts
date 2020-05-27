import { join } from 'path';
import { l, d, e } from './utils/logs';
import { DeploymentParser } from './parser/deploymentParser';
import { NetworkCleanShGenerator, NetworkCleanShOptions } from './generators/networkClean.sh';
import { ConfigurationValidator } from './parser/validator/configurationValidator';
import { DockerComposeYamlOptions } from './utils/data-type';
import { DownloadFabricBinariesGenerator } from './generators/utils/downloadFabricBinaries';
import { Network } from './models/network';
// import { DockerEngine } from './agents/docker-agent';
import { GenesisParser } from './parser/geneisParser';
import { ConfigtxYamlGenerator } from './generators/configtx.yaml';
// import {CaClient} from './core/hlf/ca_client';
// import * as channel from './core/hlf/channel';
// import { DockerComposeCaGenerator } from './generators/crypto/dockerComposeCa.yaml';
// import { CreateOrgCertsShGenerator } from './generators/crypto/createOrgCerts.sh';
import { SysWrapper } from './utils/sysWrapper';
import createFolder = SysWrapper.createFolder;
import { BNC_NETWORK, DOCKER_DEFAULT, EXTERNAL_HLF_VERSION, HLF_CA_VERSION, HLF_VERSION } from './utils/constants';
// import { CreateOrdererCertsGenerator } from './generators/crypto/createOrdererCerts.sh';
import {OrgCertsGenerator} from './generators/crypto/createOrgCerts';

export class Orchestrator {
  /* default folder to store all generated tools files and data */
  networkRootPath = './hyperledger-fabric-network';

  /**
   * Parse and validate deployment file
   * @param configFilePath full path of the deployment configuration file
   */
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

  /**
   * Generate the Genesis template file
   * @param configGenesisFilePath full path of the deployment configuration file
   */
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

  /**
   * Parse & validate the input configuration deployment file.
   * Once done, start the CA and create all credentials for peers, orderer, admin & users
   * Start the blockchain network (peers, orderers)
   * @param configFilePath the full path to deployment configuration file
   * @param skipDownload boolean to download fabric binaries (needed to create credentials)
   */
  async validateAndParse(configFilePath: string, skipDownload = false) {
    l('[Start] Start parsing the blockchain configuration file');
    l('Validate input configuration file');
    const validator = new ConfigurationValidator();
    const isValid = validator.isValidDeployment(configFilePath);

    if (!isValid) {
      e('Configuration file is invalid');
      return;
    }
    l('Configuration file valid');

    let configParse = new DeploymentParser(configFilePath);
    // TODO config parse should return the network instance and not an array of organizations
    const organizations = await configParse.parse();
    l('[End] Blockchain configuration files parsed');

    // Generate dynamically crypto
    const homedir = require('os').homedir();
    // const path = organizations[0].templateFolder ? organizations[0].templateFolder : join(homedir, this.networkRootPath);
    const path = join(homedir, this.networkRootPath);
    await createFolder(path);

    const options: DockerComposeYamlOptions = {
      networkRootPath: path,
      composeNetwork: BNC_NETWORK,
      org: organizations[0],
      envVars: {
        FABRIC_VERSION: HLF_VERSION.HLF_2,
        FABRIC_CA_VERSION: HLF_CA_VERSION.HLF_2,
        THIRDPARTY_VERSION: EXTERNAL_HLF_VERSION.EXT_HLF_2
      }
    };

    if (!skipDownload) {
      l('[Start] Download fabric binaries...');
      const downloadFabricBinariesGenerator = new DownloadFabricBinariesGenerator('downloadFabric.sh', path, options);
      await downloadFabricBinariesGenerator.save();
      await downloadFabricBinariesGenerator.run();
      l('[End] Ran Download fabric binaries');
    }

    // create network
//     const engine = new DockerEngine({ host: DOCKER_DEFAULT.IP as string, port: DOCKER_DEFAULT.PORT });
//     const isAlive = await engine.isAlive();
//     if (!isAlive) {
//       l('Docker engine is down. Please check you docker server');
//       return;
//     }
//     l('Your docker engine is running...');
//     l('[Start] Create docker network (bnc-network)');
//     await engine.createNetwork({ Name: options.composeNetwork });
//     l('[End] Docker network (bnc-network) created');
//
//     // create ca
//     let dockerComposeCA = new DockerComposeCaGenerator('docker-compose-ca.yaml', path, options, engine);
//     l('[Start] Starting ORG CA docker container...');
//     await dockerComposeCA.save();
//     const isCaStarted = await dockerComposeCA.startOrgCa();
//     if(!isCaStarted) {
//       e('Docker CA not started properly - exit !!');
//       return;
//     }
//     l('[End] Ran Root CA docker container...');
//
    l('[Start] Creating certificates');
    //const createCaShGenerator = new CreateOrgCertsShGenerator('createCerts.sh', path, options);
    //await createCaShGenerator.buildCertificate();
    const orgCertsGenerator = new OrgCertsGenerator('connection-profile-ca-client.yaml', path, options);
    await orgCertsGenerator.buildCertificate();
    l('[End] Certificates created');

    // Orderers
    // let dockerComposeOrdCA = new CreateOrdererCertsGenerator('docker-compose-ca-orderer.yaml', path, options, engine);
    // await dockerComposeOrdCA.startOrdererCa();
    // const isGenerated = await dockerComposeOrdCA.buildOrdererCertificates();
    // if(!isGenerated) {
    //   e('Error while generating the Orderer crypto credentials');
    //   return;
    // }
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

    // const dockerComposePeer = new DockerComposePeerGenerator('docker-compose-peer.yaml', path, options, engine);
    // await dockerComposePeer.save();
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
    // const caclient = new CaClient(caInfo, walletDirectoryName, ccpPath);
    // await caclient.enrollAdmin(id, secret, mspID);
    d('Need to be activated');
  }

  public async registerUser(id, secret, affiliation, mspID, caInfo, walletDirectoryName, ccpPath) {
    // const caclient = new CaClient(caInfo, walletDirectoryName, ccpPath);
    // await caclient.registerUser (id, secret, affiliation, mspID);
    d('Need to be activated');
  }

  public async fetchIdentity(id,caInfo, walletDirectoryName, ccpPath) {
    // const caclient = new CaClient(caInfo, walletDirectoryName, ccpPath);
    // await caclient.fetchIdentity(id);
    d('Need to be activated');
  }

  public async deleteIdentity(id,caInfo, walletDirectoryName, ccpPath) {
    // const caclient = new CaClient(caInfo, walletDirectoryName, ccpPath);
    // await caclient.deleteIdentity(id);
    d('Need to be activated');
  }

  // public async createChannel(nameChannel, channeltxPath, nameOrg) {
  //   await channel.createChannel(nameChannel, channeltxPath, nameOrg);
  // }
  //
  // public async joinChannel(nameChannel, nameOrg, peers) {
  //   await channel.joinChannel(nameChannel, peers, nameOrg);
  // }
  //
  // public async updateChannel(anchortx, namech, nameorg) {
  //   await channel.updateChannel(anchortx, namech, nameorg);
  // }

}
