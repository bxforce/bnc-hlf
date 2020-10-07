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

import {join} from 'path';
import {d, e, l} from './utils/logs';
import {DeploymentParser} from './parser/deploymentParser';
import {CommitParser} from './parser/commitParser';
import {NetworkCleanShGenerator, NetworkCleanShOptions} from './generators/networkClean.sh';
import {ConfigurationValidator} from './parser/validator/configurationValidator';
import {DockerComposeYamlOptions} from './utils/data-type';
import {DownloadFabricBinariesGenerator} from './generators/utils/downloadFabricBinaries';
import {Network} from './models/network';
import {CommitConfiguration} from './models/commitConfiguration';
import {GenesisParser} from './parser/genesisParser';
import {ConfigtxYamlGenerator} from './generators/configtx.yaml';
import {SysWrapper} from './utils/sysWrapper';
import {
    BNC_NETWORK,
    DEFAULT_CA_ADMIN,
    EXTERNAL_HLF_VERSION,
    HLF_CA_VERSION,
    HLF_CLIENT_ACCOUNT_ROLE,
    HLF_VERSION,
    NETWORK_ROOT_PATH
} from './utils/constants';
import {OrgCertsGenerator} from './generators/crypto/createOrgCerts';
import {ClientConfig} from './core/hlf/helpers';
import {Membership, UserParams} from './core/hlf/membership';
import {Chaincode} from'./core/hlf/chaincode';
import {Identity} from 'fabric-network';
import {DockerComposeEntityBaseGenerator} from './generators/docker-compose/dockercomposebase.yaml';
import {DockerComposePeerGenerator} from './generators/docker-compose/dockercomposepeer.yaml';
import {DockerComposeCliSingleton} from './generators/docker-compose/dockerComposeCliSingleton.yaml';
import {Organization} from './models/organization';
import {Peer} from './models/peer';
import {DockerEngine} from './agents/docker-agent';
import {DockerComposeOrdererGenerator} from './generators/docker-compose/dockercomposeorderer.yaml';
import createFolder = SysWrapper.createFolder;
import {DockerComposeCaOrdererGenerator} from './generators/docker-compose/dockerComposeCaOrderer.yaml';
import {OrdererCertsGenerator} from './generators/crypto/createOrdererCerts';
import existsFolder = SysWrapper.existsFolder;
import {Utils} from './utils/utils';
import getHlfBinariesPath = Utils.getHlfBinariesPath;
import {DockerComposeCaGenerator} from './generators/docker-compose/dockerComposeCa.yaml';
import getDockerComposePath = Utils.getDockerComposePath;
import {ChannelGenerator} from './generators/artifacts/channel-mgmt';
import getArtifactsPath = Utils.getArtifactsPath;

/**
 * Main tools orchestrator
 *
 * @author wassim.znaidi@gmail.com
 * @author sahar fehri
 * @author ahmed souissi
 */
export class Orchestrator {

    public cliGenerator;
  //  public targetPeers;

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

    private static async _parseCommitConfig(commitConfigPath: string): Promise<CommitConfiguration> {
        l('[Start] Start parsing the blockchain configuration file');

        let configParse = new CommitParser(commitConfigPath);
        const conf = await configParse.parse();
        l('[End] Blockchain configuration files parsed');

        console.log("returned config", conf)

        return conf;
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
     * Parse and validate deployment file
     * @param configFilePath full path of the deployment configuration file
     */
    async initNetwork(configFilePath: string) {
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

        // Check if HLF binaries exists
        const binariesFolderPath = getHlfBinariesPath(network.options.networkConfigPath, network.options.hyperledgerVersion);
        const binariesFolderExists = await existsFolder(binariesFolderPath);
        if (!binariesFolderExists) {
            l('[channel config]: start downloading HLF binaries...');
            const isDownloaded = await Orchestrator._downloadBinaries(`${network.options.networkConfigPath}/scripts`, network);
            if (!isDownloaded) {
                e('[channel config]: Error while downloading HLF binaries files');
                return;
            }
            l('[channel config]: HLF binaries downloaded !!!');
        }

        l('[configtx] Start generating configtx.yaml file...');
        const configTx = new ConfigtxYamlGenerator('configtx.yaml', path, network);
        await configTx.save();
        l('[configtx] Configtx.yaml file saved !!!');
    }

    /**
     * Generate the Genesis template file
     * @param configGenesisFilePath
     */
    async generateGenesis(configGenesisFilePath: string) {
        const network: Network = await Orchestrator._parseGenesis(configGenesisFilePath);
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        l('[genesis]: start generating genesis block...');
        const configTx = new ConfigtxYamlGenerator('configtx.yaml', path, network);
        await configTx.save();
        const gen = await configTx.generateGenesisBlock();

        l(`[genesis]: block generated --> ${gen} !!!`);
    }

    /**
     * Generate the Channel configuration file
     * @param configGenesisFilePath
     */
    async generateConfigChannel(configGenesisFilePath: string) {
        const network: Network = await Orchestrator._parseGenesis(configGenesisFilePath);
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        l('[channel config]: start generating channel configuration...');
        const configTx = new ConfigtxYamlGenerator('configtx.yaml', path, network);

        const gen = await configTx.generateConfigTx(network.channel.name);
        l(`[channel config]: configuration of channel ${network.channel.name} generated --> ${gen} !!!`);
    }

    /**
     * Generate the anchor peer update
     * @param configGenesisFilePath
     */
    async generateAnchorPeer(configGenesisFilePath: string) {
        const network: Network = await Orchestrator._parseGenesis(configGenesisFilePath);
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        l('[anchor peer]: start generating anchor peer update...');
        const configTx = new ConfigtxYamlGenerator('configtx.yaml', path, network);
        const gen = await configTx.generateAnchorPeer(network.channel.name);

        l(`[anchor peer]: anchor peer generated --> ${gen} !!!`);
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
        const path = join(homedir, NETWORK_ROOT_PATH);
        await createFolder(path);

        const options: DockerComposeYamlOptions = {
            networkRootPath: path,
            composeNetwork: BNC_NETWORK,
            org: network.organizations[0],
            ips: network.ips,
            envVars: {
                FABRIC_VERSION: HLF_VERSION.HLF_2,
                FABRIC_CA_VERSION: HLF_CA_VERSION.HLF_2,
                THIRDPARTY_VERSION: EXTERNAL_HLF_VERSION.EXT_HLF_2
            }
        };

        if (!skipDownload) {
            await Orchestrator._downloadBinaries(path, network);
        }

        l('[Start] Creating certificates');
        const orgCertsGenerator = new OrgCertsGenerator('connection-profile-ca-client.yaml', path, network, options);
        await orgCertsGenerator.buildCertificate();
        l('[End] Certificates created');
    }

    /**
     * Generate Crypto & Certificate credentials for peers
     * @param deploymentConfigFilePath
     */
    async generatePeersCredentials(deploymentConfigFilePath: string) {
        // TODO check if files exists already for the same peers/organizations
        l('[Peer Cred]: start parsing deployment file...');
        const network = await Orchestrator._parse(deploymentConfigFilePath);
        const path = network.options.networkConfigPath ?? this._getDefaultPath();
        await createFolder(path);

        // Check if HLF binaries exists
        const binariesFolderPath = getHlfBinariesPath(network.options.networkConfigPath, network.options.hyperledgerVersion);
        const binariesFolderExists = await existsFolder(binariesFolderPath);
        if (!binariesFolderExists) {
            l('[channel config]: start downloading HLF binaries...');
            const isDownloaded = await Orchestrator._downloadBinaries(`${network.options.networkConfigPath}/scripts`, network);
            if (!isDownloaded) {
                e('[channel config]: Error while downloading HLF binaries files');
                return;
            }
            l('[channel config]: HLF binaries downloaded !!!');
        }

        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            e('[Peer Cred]: Deployment config file is not valid');
            return;
        }
        l('[Peer Cred]: parsing deploy config done !!!');

        // Start the CA container if not
        const options: DockerComposeYamlOptions = {
            networkRootPath: path,
            composeNetwork: BNC_NETWORK,
            org: network.organizations[0],
            ips: network.ips,
            envVars: {
                FABRIC_VERSION: HLF_VERSION.HLF_2,
                FABRIC_CA_VERSION: HLF_CA_VERSION.HLF_2,
                THIRDPARTY_VERSION: EXTERNAL_HLF_VERSION.EXT_HLF_2
            }
        };
        const engine = new DockerEngine({socketPath: '/var/run/docker.sock'});
        await engine.createNetwork({Name: options.composeNetwork});
        l('[Peer Cred]: docker engine configured !!!');

        l('[Peer Cred]: start CA container...');
        const ca = new DockerComposeCaGenerator(`docker-compose-ca-${network.organizations[0].name}.yaml`, path, network, options, engine);
        await ca.save();
        const caStarted = await ca.startOrgCa();
        if (!caStarted) {
            e('[Peer Cred]: Error while starting the Organization CA container !!!');
            return;
        }
        l(`[Peer Cred]: CA container started (${caStarted}) !!!`);

        l(`[Peer Cred]: start create peer crypto & certs credentials...`);
        const orgCertsGenerator = new OrgCertsGenerator(`connection-profile-ca-${network.organizations[0].name}-client.yaml`, path, network, options);
        const isGenerated = await orgCertsGenerator.buildCertificate();
        l(`[Peer Cred]: credentials generated (${isGenerated}) !!! `);
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
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
        const organization: Organization = network.organizations[0];
        l('[End] Blockchain configuration files parsed');

        // Assign & check root path
        const path = network.options.networkConfigPath ?? this._getDefaultPath();
        await createFolder(path);
        

        // Auto-create docker-compose folder if not exists
        await createFolder(getDockerComposePath(path));

        const options: DockerComposeYamlOptions = {
            networkRootPath: path,
            composeNetwork: BNC_NETWORK,
            org: network.organizations[0],
            ips: network.ips,
            envVars: {
                FABRIC_VERSION: HLF_VERSION.HLF_2,
                FABRIC_CA_VERSION: HLF_CA_VERSION.HLF_2,
                THIRDPARTY_VERSION: EXTERNAL_HLF_VERSION.EXT_HLF_2
            }
        };

        l('Creating Peer base docker compose file');
        const peerBaseGenerator = new DockerComposeEntityBaseGenerator(options, network);
        await peerBaseGenerator.createTemplateBase();

        l('Creating Docker network');
        // TODO use localhost and default port for the default engine
        const engine = new DockerEngine({socketPath: '/var/run/docker.sock'});
        await engine.createNetwork({Name: options.composeNetwork});

        if (enablePeers) {
            l('Creating Peer container & deploy');
            const peerGenerator = new DockerComposePeerGenerator(`docker-compose-peers-${organization.name}.yaml`, options);
            l(`'Creating Peers container template`);
            await peerGenerator.createTemplatePeers();
            l(`'Starting Peer containers`);
            await peerGenerator.startPeers();
        }

        if (enableOrderers) {
            l('Creating Orderers Container & Deploy');
            const ordererGenerator = new DockerComposeOrdererGenerator(`docker-compose-orderers-${organization.name}.yaml`, options);
            await ordererGenerator.createTemplateOrderers();
            const ordererStarted = await ordererGenerator.startOrderers();
            l(`Orderers started (${ordererStarted})`);
        }
    }

    /**
     * Generate Crypto & Certificates credentials for orderers
     * @param genesisFilePath
     */
    async generateOrdererCredentials(genesisFilePath: string) {
        // TODO check if files exists already for the same orderers/organizations
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
        const options: DockerComposeYamlOptions = {
            networkRootPath: path,
            composeNetwork: BNC_NETWORK,
            org: null,
            ips: []
        };
        const engine = new DockerEngine({socketPath: '/var/run/docker.sock'}); // TODO configure local docker remote engine
        await engine.createNetwork({Name: options.composeNetwork});
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
            {name: DEFAULT_CA_ADMIN.name, password: DEFAULT_CA_ADMIN.password});
        const isGenerated = await ordererGenerator.buildCertificate();
        l(`[Orderer Cred]: credentials generated --> (${isGenerated}) !!!`);
    }

    /**
     * Stop all container of a blockchain
     * @param deployConfigPath the deployment configuration file
     * @param deleteNetwork
     * @param deleteVolume
     * @param forceRemove
     */
    async stopBlockchainContainer(deployConfigPath: string, deleteNetwork: boolean, deleteVolume: boolean, forceRemove: boolean): Promise<boolean> {
        try {
            const network: Network = await Orchestrator._parse(deployConfigPath);

            // loop on organization & peers && orderers
            for (const org of network.organizations) {
                // build list of docker services/volumes to delete
                const volumes: string[] = [];
                const services: string[] = [];

                for (const peer of org.peers) {
                    services.push(`${peer.name}.${org.fullName}`);
                    services.push(`${peer.name}.${org.fullName}.couchdb`);
                    volumes.push(`${peer.name}.${org.fullName}`);
                }

                for (const orderer of org.orderers) {
                    services.push(`${orderer.name}.${org.domainName}`);
                    volumes.push(`${orderer.name}.${org.domainName}`);
                }

                services.push(`${org.ca.name}.${org.name}`);
                services.push(`caOrderer.${network.ordererOrganization.name}`);

                // Now check all container within all organization engine
                for (const engine of org.engines) {
                    const docker = new DockerEngine({socketPath: '/var/run/docker.sock'}); // TODO configure local docker remote engine
                    const containerDeleted = await docker.stopContainerList(services, forceRemove);
                    if (!containerDeleted) {
                        e('Error while deleting the docker container for peer & orderer');
                        return false;
                    }

                    // delete the network
                    if (deleteNetwork) {
                        // TODO API to delete network not yet implemented
                    }

                    if (deleteVolume) {
                        // TODO API to delete volumes not yet implemented
                    }
                }
            }

            return true;
        } catch (err) {
            e(err);
            return false;
        }
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
                name: DEFAULT_CA_ADMIN.name,
                secret: DEFAULT_CA_ADMIN.password
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
                        walletDirectoryPath: string, networkProfilePath: string): Promise<Identity> {
        d(`Request to fetch identity ${id}`);
        const config: ClientConfig = {
            networkProfile: networkProfilePath,
            keyStore: walletDirectoryPath,
            admin: {
                name: DEFAULT_CA_ADMIN.name,
                secret: DEFAULT_CA_ADMIN.password
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
                name: DEFAULT_CA_ADMIN.name,
                secret: DEFAULT_CA_ADMIN.password
            }
        };
        const membership = new Membership(config);
        await membership.initCaClient(caName);

        return await membership.wallet.deleteIdentity(id);
    }

    /**
     *
     * @param channelName
     * @param channeltxPath
     * @param deploymentConfigPath
     */
    async createChannel(channelName: string, channeltxPath: string, deploymentConfigPath: string): Promise<void> {
        l(`[Channel] - Request to create a new channel (${channelName})`);
        const network: Network = await Orchestrator._parse(deploymentConfigPath);
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        const channelGenerator = new ChannelGenerator(`connection-profile-create-channel-${network.organizations[0].name}.yaml`, path, network);
        const created = await channelGenerator.setupChannel(channelName, `${getArtifactsPath(path)}/${channelName}.tx`);

        l(`[Channel] - Exit create channel request (${created}) !!!`);
    }

    /**
     * Join peers to the selected channel
     * @param channelName
     * @param peers
     * @param deploymentConfigPath
     */
    public async joinChannel(channelName: string, deploymentConfigPath: string): Promise<void> {
        l(`[Channel] - Request to join a new channel (${channelName})`);
        const network: Network = await Orchestrator._parse(deploymentConfigPath);
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        const channelGenerator = new ChannelGenerator(`connection-profile-join-channel-${network.organizations[0].name}.yaml`, path, network);
        const joined = await channelGenerator.joinChannel(channelName);

        l(`[Channel] - Exit create channel request (${joined}) !!!`);
    }

    /**
     * update channel
     * @param anchorTxPath
     * @param channelName
     * @param deploymentConfigPath
     */

    public async updateChannel(anchorTxPath: string, channelName: string, deploymentConfigPath: string): Promise<void> {
        l(`[Channel] - Request to update  a channel (${channelName})`);
        const network: Network = await Orchestrator._parse(deploymentConfigPath);
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        const channelGenerator = new ChannelGenerator('connection-profile-channel.yaml', path, network);
        const updated = await channelGenerator.updateChannel(channelName, anchorTxPath);

        l(`[Channel] - Exit update channel request (${updated}) !!!`);
    }

    /**
     * Return the default path where to store all files and materials
     * @private
     */
    private _getDefaultPath(): string {
        const homedir = require('os').homedir();
        return join(homedir, NETWORK_ROOT_PATH);
    }

    public async deployCliSingleton(name: string, configFilePath: string , targets: Peer[] , version: string): Promise<void> {
        l(`[Chaincode] - Request to install  a chaincode (${name})`);
        const network: Network = await Orchestrator._parse(configFilePath);
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
        const organization: Organization = network.organizations[0];
        //peer0 of org1
        const peer: Peer = network.organizations[0].peers[0];
        l('[End] Blockchain configuration files parsed');

        // Assign & check root path
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        const options: DockerComposeYamlOptions = {
            networkRootPath: path,
            composeNetwork: BNC_NETWORK,
            org: network.organizations[0],
            ips: network.ips,
            envVars: {
                FABRIC_VERSION: HLF_VERSION.HLF_2,
                FABRIC_CA_VERSION: HLF_CA_VERSION.HLF_2,
                THIRDPARTY_VERSION: EXTERNAL_HLF_VERSION.EXT_HLF_2
            }
        };

        l('Creating Peer base docker compose file');
        const peerBaseGenerator = new DockerComposeEntityBaseGenerator(options, network);
        await peerBaseGenerator.createTemplateBase();

        l('Creating Docker network');
        // TODO use localhost and default port for the default engine
        const engine = new DockerEngine({socketPath: '/var/run/docker.sock'});
        await engine.createNetwork({Name: options.composeNetwork});

        l('Creating cli container & deploy');
        const cliSingleton = DockerComposeCliSingleton.init(`docker-compose-cli-${organization.name}.yaml`, options);
        cliSingleton.peers= targets;
        l(`'Creating Cli container template`);
        await cliSingleton.createTemplateCli();

        await cliSingleton.startCli(targets[0])

    }

      public async installChaincodeCli(name: string, configFilePath: string , targets: Peer[] , version: string): Promise<void> {
        l('[End] Blockchain configuration files parsed');
        let peerTlsRootCert;
        let corePeerAdr ;

        const {docker, organization} = await this.loadOrgEngine(configFilePath)
        const chaincode = new Chaincode(docker, name, version);
        await chaincode.init(organization.fullName);

        for(let peerElm of targets){
            corePeerAdr= `${peerElm.name}.${organization.fullName}:${peerElm.options.ports[0]}`
            peerTlsRootCert= `/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${organization.fullName}/peers/${peerElm.name}.${organization.fullName}/tls/ca.crt`
            await chaincode.installChaincode(corePeerAdr,peerTlsRootCert);
        }

    }

    public async approveChaincodeCli(doCommit: boolean, configFilePath, name, version, sequence, channelName): Promise <void> {
        l(' REQUEST to approve chaincode')
        const {docker, organization} = await this.loadOrgEngine(configFilePath)
        const chaincode = new Chaincode(docker, name, version);
        await chaincode.init(organization.fullName);
        await chaincode.approve(sequence, channelName);
    }

    public async commitChaincode(configFile, listPeers, commitFile): Promise <void> {
       
        l('Request to commit chaincode')
        const {docker, organization} = await this.loadOrgEngine(configFile)
        const chaincode = new Chaincode(docker,"mychannel", "1"); // TODO add those args in command line
        await chaincode.init(organization.fullName);

        let finalArg1= "";
        let allOrgs = await this.getCommitOrgNames(commitFile);
        for(let org of allOrgs){
            let mspName = org+"MSP";
            finalArg1+= `\"${mspName}\": true`
            finalArg1 += ";"
        }

        let targets = await this.getTargetCommitPeers(commitFile)
        chaincode.checkCommitReadiness(finalArg1, targets);
    }

    public async getCommitOrgNames(commitFile: string){
        const conf: CommitConfiguration = await Orchestrator._parseCommitConfig(commitFile);
        const organizations: Organization[] = conf.organizations;
        let listOrgs=[];
        organizations.forEach((org) => {
            listOrgs.push(org.name);
        })
        return listOrgs;
    }

    public async getTargetCommitPeers(commitFile: string){
        console.log('parse the commit file to construct args')
        const conf: CommitConfiguration = await Orchestrator._parseCommitConfig(commitFile);
        const organizations: Organization[] = conf.organizations;
        let targets=''
        organizations.forEach((org) => {
            let nameOrg = org.name;
            let domainName = org.domainName;
            let fullName = nameOrg+'.'+domainName;
            console.log('fullname', fullName)
            for(let singlePeer of org.peers){
                let namePeer = singlePeer.name;
                let portPeer = singlePeer.options.ports[0];
                let pathToCert = `/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${fullName}/peers/${namePeer}.${fullName}/tls/ca.crt`
                console.log("construct target peers", singlePeer)
                //--peerAddresses peer0.org1.bnc.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls/ca.crt
                targets += `--peerAddresses ${namePeer}.${fullName}:${portPeer} --tlsRootCertFiles ${pathToCert} `
            }


            console.log("final targets", targets)
        })

        return targets;
    }

    public async getTargetPeers(configFilePath: string, targets: string[]) {
        const network: Network = await Orchestrator._parse(configFilePath);
        let targetPeers = [];
        targets.forEach((namePeer) => {
            network.organizations[0].peers.forEach((peer) => {
                if(namePeer == peer.name){
                    targetPeers.push(peer)
                }

            })
        })
        return targetPeers;
    }

    public async loadOrgEngine(configFilePath) {
        const network: Network = await Orchestrator._parse(configFilePath);
        const organization: Organization = network.organizations[0];
        const engine = organization.getEngine(organization.peers[0].options.engineName);
        const docker =  new DockerEngine({ host: engine.options.url, port: engine.options.port });
        return {docker, organization};
    }

}
