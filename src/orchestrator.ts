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
   * Generate the Genesis template file
   * @param configGenesisFilePath full path of the deployment configuration file
   */
  async generateGenesis(configGenesisFilePath: string) {
    const path = this._getDefaultPath();
    const network: Network = await Orchestrator._parseGenesis(configGenesisFilePath);

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
      await Orchestrator._downloadBinaries(path, options);
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
   * deploy peer container
   * @param configFilePath
   * @param skipDownload
   */
  async deployPeerContainer(configFilePath: string, skipDownload = false) {
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
    const engineModel = organization.getEngine(peer.options.engineName);
    // const engine: DockerEngine = new DockerEngine({ host: engineModel.options.url, port: engineModel.options.port });
    const engine = new DockerEngine({ socketPath: '/var/run/docker.sock' });
    await engine.createNetwork({ Name: options.composeNetwork });

    l('Creating Peer container & deploy');
    const peerGenerator = new DockerComposePeerGenerator(`docker-compose-peers-${organization.name}.yaml`, options);
    l(`'Creating Peer ${peer.name} container template`);
    await peerGenerator.createTemplatePeers();
    l(`'Starting Peer ${peer.name} container`);
    const started = await peerGenerator.startPeer(peer);
    l(`Peer ${peer.name} started (${started})`);

    l('Creating Orderers Container & Deploy');
    const ordererGenerator = new DockerComposeOrdererGenerator(`docker-compose-orderers-${organization.name}.yaml`, options);
    await ordererGenerator.createTemplateOrderers();
    const ordererStarted = await ordererGenerator.deployOrdererContainers();
    l(`Orderers started (${ordererStarted})`);
  }

  /**
   *
   * @param genesisFilePath
   */
  async generateOrdererCredentials(genesisFilePath: string) {
    const path = this._getDefaultPath();
    await createFolder(path);

    l('Genesis File: start parsing...');
    const network = await Orchestrator._parseGenesis(genesisFilePath);
    l('Genesis File: parsing done...');

    const options: DockerComposeYamlOptions = { networkRootPath: path, composeNetwork: BNC_NETWORK, org: null };
    const engine = new DockerEngine({ socketPath: '/var/run/docker.sock' });
    await engine.createNetwork({ Name: options.composeNetwork });
    l('Genesis: docker engine configured !!!');

    l('Genesis: start CA container...');
    const ca = new DockerComposeCaOrdererGenerator('docker-compose-ca-orderer.yaml', path, network, options, engine);
    await ca.save();
    const caStarted = await ca.startOrdererCa();
    if(!caStarted) {
      e('Error while starting the orderer CA container !!!');
      return;
    }
    l(`Genesis: CA container started (${caStarted}) !!!`);

    l('Genesis: start generating credentials...');
    const ordererGenerator = new OrdererCertsGenerator('connection-profile-orderer-client.yaml',
      path,
      network,
      { name: this.defaultCAAdmin.name, password: this.defaultCAAdmin.password });
    const isGenerated = await ordererGenerator.buildCertificate();
    l(`Genesis: credentials generated (${isGenerated}) !!!`);
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
   * @param options options to generate script files
   * @private
   */
  private static async _downloadBinaries(folderPath: string, options: DockerComposeYamlOptions): Promise<boolean> {
    try {
      l('[Start] Download fabric binaries...');
      const downloadFabricBinariesGenerator = new DownloadFabricBinariesGenerator('downloadFabric.sh', folderPath, options);
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
