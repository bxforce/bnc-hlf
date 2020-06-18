/*
Copyright 2020 IRT SystemX

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { join } from 'path';
import { d, e, l } from './utils/logs';
import { DeploymentParser } from './parser/deploymentParser';
import { NetworkCleanShGenerator, NetworkCleanShOptions } from './generators/networkClean.sh';
import { ConfigurationValidator } from './parser/validator/configurationValidator';
import { DockerComposeYamlOptions } from './utils/data-type';
import { DownloadFabricBinariesGenerator } from './generators/utils/downloadFabricBinaries';
import { Network } from './models/network';
import { GenesisParser } from './parser/geneisParser';
import { ConfigtxYamlGenerator } from './generators/configtx.yaml';
import { SysWrapper } from './utils/sysWrapper';
import { BNC_NETWORK, EXTERNAL_HLF_VERSION, HLF_CA_VERSION, HLF_CLIENT_ACCOUNT_ROLE, HLF_VERSION } from './utils/constants';
import { OrgCertsGenerator } from './generators/crypto/createOrgCerts';
import { ClientConfig } from './core/hlf/helpers';
import { Membership, UserParams } from './core/hlf/membership';
import { Identity } from 'fabric-network';
import { DockerComposeEntityBaseGenerator } from './generators/docker-compose/dockercomposebase.yaml';
import { DockerComposePeerGenerator } from './generators/docker-compose/dockercomposepeer.yaml';
import { Organization } from './models/organization';
import { DockerEngine } from './agents/docker-agent';
import { DockerComposeOrdererGenerator } from './generators/docker-compose/dockercomposeorderer.yaml';
import createFolder = SysWrapper.createFolder;
import { DockerComposeCaOrdererGenerator } from './generators/docker-compose/dockerComposeCaOrderer.yaml';
import { OrdererCertsGenerator } from './generators/crypto/createOrdererCerts';
import existsFolder = SysWrapper.existsFolder;
import { Utils } from './utils/utils';
import getHlfBinariesPath = Utils.getHlfBinariesPath;
import { DockerComposeCaGenerator } from './generators/docker-compose/dockerComposeCa.yaml';

/**
 * Main tools orchestrator
 *
 * @author wassim.znaidi@gmail.com
 * @author sahar fehri
 * @author ahmed souissi
 */
export class Orchestrator {
  /* default folder to store all generated tools files and data */
  networkRootPath = './hyperledger-fabric-network';

  defaultCAAdmin = {
    name: 'admin',
    password: 'adminpw'
  };

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
   * Generate configtx yaml file
   * @param configGenesisFilePath
   */
  async generateConfigtx(configGenesisFilePath: string) {
    const network: Network = await Orchestrator._parseGenesis(configGenesisFilePath);
    const path = network.options.networkConfigPath ?? this._getDefaultPath();
    const isNetworkValid = network.validate();
    if (!isNetworkValid) {
      return;
    }

    l('[configtx] Start generating configtx.yaml file...');
    const configTx = new ConfigtxYamlGenerator('configtx.yaml', path, network);
    await configTx.save();
    l('[configtx] Configtx.yaml file saved !!!');
  }

  /**
   * Generate the Genesis template file
   * @param configGenesisFilePath full path of the deployment configuration file
   */
  async generateGenesis(configGenesisFilePath: string) {
    const network: Network = await Orchestrator._parseGenesis(configGenesisFilePath);
    const path = network.options.networkConfigPath ?? this._getDefaultPath();
    await createFolder(path);
    const isNetworkValid = network.validate();
    if (!isNetworkValid) {
      return;
    }

    // Check if HLF binaries exists
    const binariesFolderPath = getHlfBinariesPath(network.options.networkConfigPath, network.options.hyperledgerVersion);
    const binariesFolderExists = await existsFolder(binariesFolderPath);
    if (!binariesFolderExists) {
      l('[genesis]: start downloading HLF binaries...');
      const isDownloaded = await Orchestrator._downloadBinaries(`${network.options.networkConfigPath}/scripts`, network);
      if (!isDownloaded) {
        e('[genesis]: Error while downloading HLF binaries files');
        return;
      }
      l('[genesis]: Genesis: HLF binaries downloaded !!!');
    }

    l('[genesis]: start generating genesis block...');
    const configTx = new ConfigtxYamlGenerator('configtx.yaml', path, network);
    await configTx.save();
    const gen = await configTx.generateGenesisBlock();

    l(`[genesis]: block generated --> ${gen} !!!`);
  }

  /**
   * Parse & validate the input configuration deployment file.
   * Once done, start the CA and create all credentials for peers, orderer, admin & users
   * Start the blockchain network (peers, orderers)
   * @param configFilePath the full path to deployment configuration file
   * @param skipDownload boolean to download fabric binaries (needed to create credentials)
   */
  async validateAndParse(configFilePath: string, skipDownload = false) {
    const network: Network = await Orchestrator._parse(configFilePath);
    l('[End] Blockchain configuration files parsed');

    // Generate dynamically crypto
    const homedir = require('os').homedir();
    // const path = network.options.networkConfigPath ? network.options.networkConfigPath : join(homedir, this.networkRootPath);
    const path = join(homedir, this.networkRootPath);
    await createFolder(path);

    const options: DockerComposeYamlOptions = {
      networkRootPath: path,
      composeNetwork: BNC_NETWORK,
      org: network.organizations[0],
      envVars: {
        FABRIC_VERSION: HLF_VERSION.HLF_2,
        FABRIC_CA_VERSION: HLF_CA_VERSION.HLF_2,
        THIRDPARTY_VERSION: EXTERNAL_HLF_VERSION.EXT_HLF_2
      }
    };

    if (!skipDownload) {
      await Orchestrator._downloadBinaries(path, network);
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
    // const dockerComposePeer = new DockerComposePeerGenerator('docker-compose-peer.yaml', path, options, engine);
    // await dockerComposePeer.save();
  }

  /**
   * Generate Crypto & Certificate credentials for peers
   * @param deploymentConfigFilePath
   */
  // TODO check if files exists already for the same peers/organizations
  async generatePeersCredentials(deploymentConfigFilePath: string) {
    const path = this._getDefaultPath();
    await createFolder(path);

    l('Peer MSP: start parsing deployment file...');
    const network = await Orchestrator._parse(deploymentConfigFilePath);
    const isNetworkValid = network.validate();
    if (!isNetworkValid) {
      e('Deployment config file is not valid');
      return;
    }
    l('Peer MSP: deploy config parsed !!!');

    // Start the CA container if not
    const options: DockerComposeYamlOptions = {
      networkRootPath: path,
      composeNetwork: BNC_NETWORK,
      org: network.organizations[0],
      envVars: {
        FABRIC_VERSION: HLF_VERSION.HLF_2,
        FABRIC_CA_VERSION: HLF_CA_VERSION.HLF_2,
        THIRDPARTY_VERSION: EXTERNAL_HLF_VERSION.EXT_HLF_2
      }
    };
    const engine = new DockerEngine({ socketPath: '/var/run/docker.sock' });
    await engine.createNetwork({ Name: options.composeNetwork });
    l('Peer MSP: docker engine configured !!!');

    l('Peer MSP: start CA container...');
    const ca = new DockerComposeCaGenerator('docker-compose-ca-org.yaml', path, options, engine);
    await ca.save();
    const caStarted = await ca.startOrgCa();
    if (!caStarted) {
      e('Peer MSP: Error while starting the Organization CA container !!!');
      return;
    }
    l(`Peer MSP: CA container started (${caStarted}) !!!`);

    l(`Peer MSP: start create peer crypto & certs credentials...`);
    const orgCertsGenerator = new OrgCertsGenerator('connection-profile-ca-client.yaml', path, options);
    const isGenerated = await orgCertsGenerator.buildCertificate();

    l(`Peer MSP: credentials generated (${isGenerated}) !!! `);
  }

  /**
   * deploy peer & orderer container
   * @param configFilePath
   * @param skipDownload
   * @param enablePeers
   * @param enableOrderers
   * @param enablePeers
   * @param enableOrderers
   */
  async deployHLFContainers(configFilePath: string, skipDownload = false, enablePeers = true, enableOrderers = true) {
    const network: Network = await Orchestrator._parse(configFilePath);
    const organization: Organization = network.organizations[0];
    l('[End] Blockchain configuration files parsed');

    // Generate dynamically crypto
    const homedir = require('os').homedir();
    const path = join(homedir, this.networkRootPath);
    await createFolder(path);

    const options: DockerComposeYamlOptions = {
      networkRootPath: path,
      composeNetwork: BNC_NETWORK,
      org: network.organizations[0],
      envVars: {
        FABRIC_VERSION: HLF_VERSION.HLF_2,
        FABRIC_CA_VERSION: HLF_CA_VERSION.HLF_2,
        THIRDPARTY_VERSION: EXTERNAL_HLF_VERSION.EXT_HLF_2
      }
    };

    l('Creating Peer base');
    const peerBaseGenerator = new DockerComposeEntityBaseGenerator(options);
    await peerBaseGenerator.createTemplateBase();

    l('Creating Docker network');
    const peer = organization.peers[0];
    // const engineModel = organization.getEngine(peer.options.engineName);
    // const engine: DockerEngine = new DockerEngine({ host: engineModel.options.url, port: engineModel.options.port });
    const engine = new DockerEngine({ socketPath: '/var/run/docker.sock' });
    await engine.createNetwork({ Name: options.composeNetwork });

    if (enablePeers) {
      l('Creating Peer container & deploy');
      const peerGenerator = new DockerComposePeerGenerator(`docker-compose-peers-${organization.name}.yaml`, options);
      l(`'Creating Peer ${peer.name} container template`);
      await peerGenerator.createTemplatePeers();
      l(`'Starting Peer ${peer.name} container`);
      const started = await peerGenerator.startPeer(peer);
      l(`Peer ${peer.name} started (${started})`);
    }

    if (enableOrderers) {
      l('Creating Orderers Container & Deploy');
      const ordererGenerator = new DockerComposeOrdererGenerator(`docker-compose-orderers-${organization.name}.yaml`, options);
      // await ordererGenerator.createTemplateOrderers();
      const ordererStarted = await ordererGenerator.startOrderers();
      l(`Orderers started (${ordererStarted})`);
    }
  }

  /**
   *
   * @param genesisFilePath
   */
  // TODO check if files exists already for the same orderers/organizations
  async generateOrdererCredentials(genesisFilePath: string) {
    l('[Orderer Cred]: start parsing...');
    const network = await Orchestrator._parseGenesis(genesisFilePath);
    const path = network.options.networkConfigPath ?? this._getDefaultPath();
    await createFolder(path);
    l('[Orderer Cred]: parsing done!!!');

    const isNetworkValid = network.validate();
    if (!isNetworkValid) {
      e('[Orderer Cred]: input file contains invalid parameters !!! ');
      return;
    }

    l('[Orderer Cred]: configure local docker engine to be used for the generation process !!!');
    const options: DockerComposeYamlOptions = { networkRootPath: path, composeNetwork: BNC_NETWORK, org: null };
    const engine = new DockerEngine({ socketPath: '/var/run/docker.sock' }); // TODO configure local docker remote engine
    await engine.createNetwork({ Name: options.composeNetwork });
    l('[Orderer Cred]: docker engine configured !!!');

    l('[Orderer Cred]: start CA container...');
    const ca = new DockerComposeCaOrdererGenerator('docker-compose-ca-orderer.yaml', path, network, options, engine);
    await ca.save();
    const caStarted = await ca.startOrdererCa();
    if (!caStarted) {
      e('[Orderer Cred]: Error while starting the orderer CA container !!!');
      return;
    }
    l(`[Orderer Cred]: CA container started (${caStarted}) !!!`);

    l('[Orderer Cred]: start generating credentials...');
    const ordererGenerator = new OrdererCertsGenerator('connection-profile-orderer-client.yaml',
      path,
      network,
      { name: this.defaultCAAdmin.name, password: this.defaultCAAdmin.password });
    const isGenerated = await ordererGenerator.buildCertificate();
    l(`[Orderer Cred]: credentials generated --> (${isGenerated}) !!!`);
  }

  /**
   * Clean all docker
   * @param rmi remove image also
   */
  async cleanDocker(rmi: boolean) {
    const options = new NetworkCleanShOptions();
    options.removeImages = rmi;

    let networkClean = new NetworkCleanShGenerator('clean.sh', 'na', options);
    await networkClean.run();

    l('************ Success!');
    l('Environment cleaned!');
  }

  /**
   * enroll default CA admin
   * @param id
   * @param secret
   * @param mspId
   * @param caName
   * @param walletDirectoryPath
   * @param networkProfilePath
   */
  async enroll(id: string,
               secret: string,
               mspId: string,
               caName: string,
               walletDirectoryPath: string,
               networkProfilePath: string): Promise<boolean> {
    d(`Request to enroll admin identity ${id}`);
    const config: ClientConfig = {
      networkProfile: networkProfilePath,
      keyStore: walletDirectoryPath,
      admin: {
        name: id,
        secret: secret
      }
    };
    const membership = new Membership(config);
    await membership.initCaClient(caName);

    const enrollment = await membership.enrollCaAdmin(mspId);
    return !!enrollment;
  }

  /**
   * Register a new user
   * @param id
   * @param secret
   * @param affiliation
   * @param mspId
   * @param caName
   * @param walletDirectoryPath
   * @param networkProfilePath
   */
  async registerUser(id: string,
                     secret: string,
                     affiliation: string,
                     mspId: string,
                     caName: string,
                     walletDirectoryPath: string,
                     networkProfilePath: string): Promise<boolean> {
    d(`Request to create new identity ${id}`);
    const config: ClientConfig = {
      networkProfile: networkProfilePath,
      keyStore: walletDirectoryPath,
      admin: {
        name: this.defaultCAAdmin.name,
        secret: this.defaultCAAdmin.password
      }
    };
    const membership = new Membership(config);
    await membership.initCaClient(caName);

    // register normal user
    const userParams: UserParams = {
      enrollmentID: id,
      enrollmentSecret: secret,
      role: HLF_CLIENT_ACCOUNT_ROLE.client,
      affiliation
    };

    const enrollment = await membership.addUser(userParams, mspId);

    return !!enrollment;
  }

  /**
   * fetch an existing identity
   * @param id
   * @param caName
   * @param walletDirectoryPath
   * @param networkProfilePath
   */
  async fetchIdentity(id: string,
                      caName: string,
                      walletDirectoryPath:
                        string, networkProfilePath: string): Promise<Identity> {
    d(`Request to fetch identity ${id}`);
    const config: ClientConfig = {
      networkProfile: networkProfilePath,
      keyStore: walletDirectoryPath,
      admin: {
        name: this.defaultCAAdmin.name,
        secret: this.defaultCAAdmin.password
      }
    };
    const membership = new Membership(config);
    await membership.initCaClient(caName);

    return await membership.wallet.getIdentity(id);
  }

  /**
   * delete entity from wallet
   * @param id
   * @param caName
   * @param walletDirectoryPath
   * @param networkProfilePath
   */
  async deleteIdentity(id: string,
                       caName: string,
                       walletDirectoryPath: string,
                       networkProfilePath: string): Promise<boolean> {
    d(`Request to delete identity ${id}`);
    const config: ClientConfig = {
      networkProfile: networkProfilePath,
      keyStore: walletDirectoryPath,
      admin: {
        name: this.defaultCAAdmin.name,
        secret: this.defaultCAAdmin.password
      }
    };
    const membership = new Membership(config);
    await membership.initCaClient(caName);

    return await membership.wallet.deleteIdentity(id);
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

  /**
   * Parse & validate deployment configuration file
   * @param deploymentConfigPath
   * @private
   */
  private static async _parse(deploymentConfigPath: string): Promise<Network> {
    l('[Start] Start parsing the blockchain configuration file');
    l('Validate input configuration file');
    const validator = new ConfigurationValidator();
    const isValid = validator.isValidDeployment(deploymentConfigPath);

    if (!isValid) {
      e('Configuration file is invalid');
      return;
    }
    l('Configuration file valid');

    let configParse = new DeploymentParser(deploymentConfigPath);
    const network = await configParse.parse();
    l('[End] Blockchain configuration files parsed');

    return network;
  }

  /**
   * Parse & validate genesis configuration file
   * @param genesisConfigPath
   * @private
   */
  private static async _parseGenesis(genesisConfigPath: string): Promise<Network | undefined> {
    try {
      l('Parsing genesis input file');
      const validator = new ConfigurationValidator();
      const isValid = validator.isValidGenesis(genesisConfigPath);
      if (!isValid) {
        e('Genesis configuration input file is invalid');
        return;
      }
      l('Input genesis file validated');

      l('Start parsing genesis input file');
      const parser = new GenesisParser(genesisConfigPath);
      const network: Network = await parser.parse();
      l('Genesis input file parsed');

      return network;
    } catch (err) {
      e(err);
      return null;

    }
  }

  /**
   * download hyperledger fabric binaries
   * @param folderPath folder where to store files
   * @param network
   * @private
   */
  private static async _downloadBinaries(folderPath: string, network: Network): Promise<boolean> {
    try {
      l('[Start] Download fabric binaries...');
      const downloadFabricBinariesGenerator = new DownloadFabricBinariesGenerator('downloadFabric.sh', folderPath, network);
      await downloadFabricBinariesGenerator.save();
      await downloadFabricBinariesGenerator.run();
      l('[End] Ran Download fabric binaries');

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  /**
   * Return the default path where to store all files and materials
   * @private
   */
  private _getDefaultPath(): string {
    const homedir = require('os').homedir();
    return join(homedir, this.networkRootPath);
  }
}
