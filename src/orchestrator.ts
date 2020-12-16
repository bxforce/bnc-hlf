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

var ByteBuffer = require("bytebuffer");
import {join} from 'path';
import {Identity} from 'fabric-network';
import {DeploymentParser} from './parser/deploymentParser';
import {HostsParser} from './parser/hostsParser';
import {CommitParser} from './parser/commitParser';
import {GenesisParser} from './parser/genesisParser';
import {Organization} from './parser/model/organization';
import {Peer} from './parser/model/peer';
import {Network} from './parser/model/network';
import {CommitConfiguration} from './parser/model/commitConfiguration';
import {ConfigurationValidator} from './parser/validator/configurationValidator';
import {OrgCertsGenerator} from './generators/crypto/createOrgCerts';
import {OrdererCertsGenerator} from './generators/crypto/createOrdererCerts';
import {ChannelGenerator} from './generators/artifacts/channelGenerator';
import {OrgGenerator} from './generators/artifacts/orgGenerator';
import {ConfigtxYamlGenerator} from './generators/artifacts/configtxGenerator';
import {ConnectionProfileGenerator} from './generators/artifacts/clientGenerator';
import {DockerComposeEntityBaseGenerator} from './generators/docker-compose/dockerComposeBase.yaml';
import {DockerComposeCaGenerator} from './generators/docker-compose/dockerComposeCa.yaml';
import {DockerComposeCaOrdererGenerator} from './generators/docker-compose/dockerComposeCaOrderer.yaml';
import {DockerComposePeerGenerator} from './generators/docker-compose/dockerComposePeer.yaml';
import {DockerComposeOrdererGenerator} from './generators/docker-compose/dockerComposeOrderer.yaml';
import {DockerComposeCliSingleton} from './generators/docker-compose/dockerComposeCliSingleton.yaml';
import {NetworkCleanShGenerator, NetworkCleanShOptions} from './generators/utils/networkClean.sh';
import {DownloadFabricBinariesGenerator} from './generators/utils/downloadFabricBinaries';
import {Chaincode} from'./core/hlf/chaincode';
import {ClientConfig} from './core/hlf/client';
import {Membership, UserParams} from './core/hlf/membership';
import {DockerComposeYamlOptions} from './utils/datatype';
import {d, e, l} from './utils/logs';
import {DockerEngine} from './utils/dockerAgent';
import {Utils} from './utils/helper';
import getHlfBinariesPath = Utils.getHlfBinariesPath;
import getDockerComposePath = Utils.getDockerComposePath;
import getArtifactsPath = Utils.getArtifactsPath;
import getNewOrgRequestSignaturesPath = Utils.getNewOrgRequestSignaturesPath;
import { SysWrapper } from './utils/sysWrapper';
import {
    BNC_NETWORK,
    DEFAULT_CA_ADMIN,
    HLF_DEFAULT_VERSION,
    HLF_CLIENT_ACCOUNT_ROLE,
    NETWORK_ROOT_PATH,
    SEQUENCE,
    USER_TYPE
} from './utils/constants';

/**
 * Main tools orchestrator
 *
 * @author wassim.znaidi@gmail.com
 * @author sahar fehri
 * @author ahmed souissi
 */
export class Orchestrator {

    /**
     * Parse & validate deployment configuration file
     * @param deploymentConfigPath
     * @param hostsConfigPath
     * @private
     */
    private static async _parse(deploymentConfigPath: string, hostsConfigPath: string): Promise<Network> {
        l('[Start] Start parsing the blockchain configuration file');
        l('Validate input configuration file');
        const validator = new ConfigurationValidator();
        const isValid = validator.isValidDeployment(deploymentConfigPath);

        if (!isValid) {
            e('Configuration file is invalid');
            return;
        }
        l('Configuration file valid');

        let configParser = new DeploymentParser(deploymentConfigPath);
        const network = await configParser.parse();
        
        //set hosts
        if (hostsConfigPath) {
            let hostsParser = new HostsParser(hostsConfigPath);
            network.hosts = await hostsParser.parse();
        }
        l('[End] Blockchain configuration files parsed');

        return network;
    }

    private static async _parseCommitConfig(commitConfigPath: string): Promise<CommitConfiguration> {
        l('[Start] Start parsing the blockchain configuration file');

        let configParse = new CommitParser(commitConfigPath);
        const conf = await configParse.parse();
        l('[End] Blockchain configuration files parsed');
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
     * Return the default path where to store all files and materials
     * @private
     */
    private static _getDefaultPath(): string {
        const homedir = require('os').homedir();
        return join(homedir, NETWORK_ROOT_PATH);
    }
    
    /**
     * Generate configtx yaml file
     * @param configGenesisFilePath
     */
    static async generateConfigtx(configGenesisFilePath: string) {
        const network: Network = await Orchestrator._parseGenesis(configGenesisFilePath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? this._getDefaultPath();
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }

        // Check if HLF binaries exists
        const binariesFolderPath = getHlfBinariesPath(network.options.networkConfigPath, network.options.hyperledgerVersion);
        const binariesFolderExists = await SysWrapper.existsFolder(binariesFolderPath);
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
    static async generateGenesis(configGenesisFilePath: string) {
        const network: Network = await Orchestrator._parseGenesis(configGenesisFilePath);
        if (!network) return;
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
    static async generateChannelConfig(configGenesisFilePath: string) {
        const network: Network = await Orchestrator._parseGenesis(configGenesisFilePath);
        if (!network) return;
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
    static async generateAnchorPeer(configGenesisFilePath: string) {
        const network: Network = await Orchestrator._parseGenesis(configGenesisFilePath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        l('[anchor peer]: start generating anchor peer update...');
        const configTx = new ConfigtxYamlGenerator('configtx.yaml', path, network);
        const gen = await configTx.generateAnchorPeer(network.channel.name);

        l(`[anchor peer]: anchor peer generated --> ${gen} !!!`);
    }

    /**
     * Generate Crypto & Certificate credentials for peers
     * @param deploymentConfigFilePath
     */
    static async generatePeersCredentials(deploymentConfigFilePath: string, hostsConfigPath: string) {
        // TODO check if files exists already for the same peers/organizations
        l('[Peer Cred]: start parsing deployment file...');
        const network = await Orchestrator._parse(deploymentConfigFilePath, hostsConfigPath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? this._getDefaultPath();
        await SysWrapper.createFolder(path);

        // Check if HLF binaries exists
        const binariesFolderPath = getHlfBinariesPath(network.options.networkConfigPath, network.options.hyperledgerVersion);
        const binariesFolderExists = await SysWrapper.existsFolder(binariesFolderPath);
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
            hosts: network.hosts,
            envVars: {
                FABRIC_VERSION: HLF_DEFAULT_VERSION.FABRIC,
                FABRIC_CA_VERSION: HLF_DEFAULT_VERSION.CA,
                THIRDPARTY_VERSION: HLF_DEFAULT_VERSION.THIRDPARTY
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
        if (isGenerated) l(`[Peer Cred]: credentials generated (${isGenerated}) !!! `); else e(`[Peer Cred]: credentials generated (${isGenerated}) !!! `);
    }

    /**
     * Generate Crypto & Certificates credentials for orderers
     * @param genesisFilePath
     */
    static async generateOrdererCredentials(genesisFilePath: string) {
        // TODO check if files exists already for the same orderers/organizations
        l('[Orderer Cred]: start parsing...');
        const network = await Orchestrator._parseGenesis(genesisFilePath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? this._getDefaultPath();
        await SysWrapper.createFolder(path);
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
            hosts: []
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
     *
     * @param channelName
     * @param deploymentConfigPath
     */
    static async createChannel(channelName: string, deploymentConfigPath: string, hostsConfigPath: string): Promise<void> {
        l(`[Channel] - Request to create a new channel (${channelName})`);
        const network: Network = await Orchestrator._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        const channelGenerator = new ChannelGenerator(`connection-profile-create-channel-${network.organizations[0].name}.yaml`, path, network);
        const created = await channelGenerator.setupChannel(channelName, `${getArtifactsPath(path)}/${channelName}.tx`);

        const profileGenerator = new ConnectionProfileGenerator(`connection-${network.organizations[0].name}.json`, path+"/settings/", network, channelName);
        const created2 = await profileGenerator.createConnectionProfile()

        l(`[Channel] - Exit create channel request (${created && created2}) !!!`);
    }

    /**
     * Join peers to the selected channel
     * @param channelName
     * @param deploymentConfigPath
     */
    static async joinChannel(channelName: string, deploymentConfigPath: string, hostsConfigPath: string): Promise<void> {
        l(`[Channel] - Request to join a new channel (${channelName})`);
        const network: Network = await Orchestrator._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        const channelGenerator = new ChannelGenerator(`connection-profile-join-channel-${network.organizations[0].name}.yaml`, path, network);
        const joined = await channelGenerator.joinChannel(channelName);

        l(`[Channel] - Exit create channel request (${joined}) !!!`);
    }

    /**
     * update channel
     * @param channelName
     * @param deploymentConfigPath
     */

    static async updateChannel(channelName: string, deploymentConfigPath: string, hostsConfigPath: string): Promise<void> {
        l(`[Channel] - Request to update  a channel (${channelName})`);
        const network: Network = await Orchestrator._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        const channelGenerator = new ChannelGenerator('connection-profile-channel.yaml', path, network);
        const updated = await channelGenerator.updateChannel(channelName, `${getArtifactsPath(path)}/${network.organizations[0].mspName}anchors.tx`);

        l(`[Channel] - Exit update channel request (${updated}) !!!`);
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
    static async deployHlfServices(deploymentConfigPath: string, hostsConfigPath: string, skipDownload = false, enablePeers = true, enableOrderers = true) {
        const network: Network = await Orchestrator._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
        const organization: Organization = network.organizations[0];
        l('[End] Blockchain configuration files parsed');

        // Assign & check root path
        const path = network.options.networkConfigPath ?? this._getDefaultPath();
        await SysWrapper.createFolder(path);
        
        // Auto-create docker-compose folder if not exists
        await SysWrapper.createFolder(getDockerComposePath(path));

        const options: DockerComposeYamlOptions = {
            networkRootPath: path,
            composeNetwork: BNC_NETWORK,
            org: network.organizations[0],
            hosts: network.hosts,
            envVars: {
                FABRIC_VERSION: HLF_DEFAULT_VERSION.FABRIC,
                FABRIC_CA_VERSION: HLF_DEFAULT_VERSION.CA,
                THIRDPARTY_VERSION: HLF_DEFAULT_VERSION.THIRDPARTY
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
            const peerGenerator = new DockerComposePeerGenerator(`docker-compose-peers-${organization.name}.yaml`, options, engine);
            l(`'Creating Peers container template`);
            await peerGenerator.createTemplatePeers();
            l(`'Starting Peer containers`);
            await peerGenerator.startPeers();
        }

        if (enableOrderers) {
            l('Creating Orderers Container & Deploy');
            const ordererGenerator = new DockerComposeOrdererGenerator(`docker-compose-orderers-${organization.name}.yaml`, options, engine);
            await ordererGenerator.createTemplateOrderers();
            const ordererStarted = await ordererGenerator.startOrderers();
            l(`Orderers started (${ordererStarted})`);
        }
    }

    /**
     * Stop all container of a blockchain
     * @param deployConfigPath the deployment configuration file
     * @param deleteNetwork
     * @param deleteVolume
     * @param forceRemove
     */
    static async stopHlfServices(forceRemove: boolean, deploymentConfigPath: string, hostsConfigPath: string, deleteNetwork: boolean = false, deleteVolume: boolean = false): Promise<boolean> {
        try {
            const network: Network = await Orchestrator._parse(deploymentConfigPath, hostsConfigPath);
            if (!network) return;

            // loop on organization & peers && orderers
            for (const org of network.organizations) {
                
                // build list of docker services/volumes to delete
                const volumes: string[] = [];
                const services: string[] = [];
                
                for (const peer of org.peers) {
                    services.push(`${peer.name}.${org.fullName}`);
                    services.push(`${peer.name}.${org.fullName}.couchdb`);
                    volumes.push(`${peer.name}.${org.fullName}`);
                    
                    //remove chaincode containers
                    services.push(`dev-${peer.name}.${org.fullName}`) // FIX this
                }
                
                for (const orderer of org.orderers) {
                    services.push(`${orderer.name}.${org.domainName}`);
                    volumes.push(`${orderer.name}.${org.domainName}`);
                }
                
                services.push(`${org.ca.name}.${org.name}`);
                
                services.push(`${network.ordererOrganization.caName}`);

                //remove all cli containers
                services.push(`cli.${org.fullName}`)

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
    static async cleanDocker(rmi: boolean, deploymentConfigPath: string, hostsConfigPath: string) {
        const network: Network = await Orchestrator._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        const options = new NetworkCleanShOptions();
        options.removeImages = rmi;
        options.path = path;

        let networkClean = new NetworkCleanShGenerator('clean.sh', 'na', options);
        await networkClean.run();

        l('************ Success!');
        l('Environment cleaned!');
    }


    static async deployCli(compile: boolean, deploymentConfigPath: string, hostsConfigPath: string, commitConfigPath: string): Promise<void> {
        const config: CommitConfiguration = await Orchestrator._parseCommitConfig(commitConfigPath);
        if (!config) return;
        const network: Network = await Orchestrator._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
        const organization: Organization = network.organizations[0];
        //peer0 of org1
        const peer: Peer = network.organizations[0].peers[0];

        // Assign & check root path
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        const options: DockerComposeYamlOptions = {
            networkRootPath: path,
            composeNetwork: BNC_NETWORK,
            org: network.organizations[0],
            hosts: network.hosts,
            envVars: {
                FABRIC_VERSION: HLF_DEFAULT_VERSION.FABRIC,
                FABRIC_CA_VERSION: HLF_DEFAULT_VERSION.CA,
                THIRDPARTY_VERSION: HLF_DEFAULT_VERSION.THIRDPARTY
            },
            cliChaincodeRootPath: config.chaincodeRootPath,
            cliScriptsRootPath: config.scriptsRootPath
        };
        if (compile) options.command = config.compilationCommand

        l('Creating Peer base docker compose file');
        const peerBaseGenerator = new DockerComposeEntityBaseGenerator(options, network);
        await peerBaseGenerator.createTemplateBase();

        l('Creating Docker network');
        // TODO use localhost and default port for the default engine // { host: DOCKER_DEFAULT.IP as string, port: DOCKER_DEFAULT.PORT }
        const engine = new DockerEngine({socketPath: '/var/run/docker.sock'});
        await engine.createNetwork({Name: options.composeNetwork});

        l('Creating cli container');
        const cliSingleton = DockerComposeCliSingleton.init(`docker-compose-cli.yaml`, options, engine);
       
        l(`'Creating Cli container template`);
        await cliSingleton.createTemplateCli();

        await cliSingleton.startCli()
    }

    static async installChaincode(name: string, version: string, chaincodeRootPath, chaincodePath, targets: string[], deploymentConfigPath: string, hostsConfigPath: string, commitConfigPath: string): Promise<void> {
        let targetPeers = await this.getTargetPeers(targets, deploymentConfigPath, hostsConfigPath)
        const config: CommitConfiguration = await Orchestrator._parseCommitConfig(commitConfigPath);
        if (!config) return;
        await Orchestrator.deployCliSingleton(name, targetPeers, version, config.chaincodeRootPath, config.scriptsRootPath, deploymentConfigPath, hostsConfigPath, commitConfigPath)
        await Orchestrator.installChaincodeCli(name, targetPeers, version, chaincodePath, deploymentConfigPath, hostsConfigPath, commitConfigPath)
    }
    
    static async installChaincodeCli(name: string, targets: Peer[], version: string, chaincodePath: string,  deploymentConfigPath: string, hostsConfigPath: string, commitConfigPath: string): Promise<void> {
        l('[End] Blockchain configuration files parsed');
        const config: CommitConfiguration = await Orchestrator._parseCommitConfig(commitConfigPath); // TODO: fix choose between config and command variables
        if (!config) return;
        const {docker, organization} = await this.loadOrgEngine(deploymentConfigPath, hostsConfigPath)
        const chaincode = new Chaincode(docker, name, version); // new Chaincode(docker, config.chaincodeName, config.version);
        await chaincode.init(organization.fullName);
        for(let peerElm of targets){
            let corePeerAdr = `${peerElm.name}.${organization.fullName}:${peerElm.options.ports[0]}`
            let peerTlsRootCert = `/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${organization.fullName}/peers/${peerElm.name}.${organization.fullName}/tls/ca.crt`
            await chaincode.installChaincode(corePeerAdr, peerTlsRootCert, config.chaincodePath);
        }
    }
    
    static async approveChaincodeCli(name, version, channelName, upgrade: boolean, policy: boolean, forceNew: boolean, deploymentConfigPath: string, hostsConfigPath: string, commitConfigPath: string): Promise<void> {
        l(' REQUEST to approve chaincode')
        const config: CommitConfiguration = await Orchestrator._parseCommitConfig(commitConfigPath);
        if (!config) return;
        const {docker, organization} = await this.loadOrgEngine(deploymentConfigPath, hostsConfigPath)
        const chaincode = new Chaincode(docker, name, version); // new Chaincode(docker, config.chaincodeName, config.version);
        await chaincode.init(organization.fullName);
        let seq = await this.getLastSequence(name, version, channelName, deploymentConfigPath, hostsConfigPath);
        let lastSequence = seq.split(':');
        let finalSequence;
        if(! lastSequence[1] ){
            finalSequence = SEQUENCE
        }else{
            if(forceNew){
                finalSequence = parseInt(lastSequence[1].trim(), 10);
            } else {
                finalSequence = parseInt(lastSequence[1].trim(), 10) + 1;
            }
        }
        if(!policy){
            await chaincode.approve(finalSequence, config.channelName);
        }else{
            if(! config.endorsementPolicy){
                e('NO POLICY WAS DEFINED');
                return
            }
            await chaincode.approve(finalSequence, config.channelName, config.endorsementPolicy);
        }
    }
    
    static async commitChaincode(upgrade: boolean, policy: boolean, deploymentConfigPath: string, hostsConfigPath: string, commitConfigPath: string): Promise <void> {
        l('Request to commit chaincode')
        const {docker, organization} = await this.loadOrgEngine(deploymentConfigPath, hostsConfigPath);
        const config: CommitConfiguration = await Orchestrator._parseCommitConfig(commitConfigPath);
        if (!config) return;
        const chaincode = new Chaincode(docker,config.chaincodeName, config.version); // TODO add those args in command line
        await chaincode.init(organization.fullName);

        let finalArg1= "";
        let allOrgs = await this.getCommitOrgNames(commitConfigPath);
        for(let org of allOrgs){
            let mspName = org+"MSP";
            finalArg1+= `\"${mspName}\": true`
            finalArg1 += ";"
        }

        let targets = await this.getTargetCommitPeers(commitConfigPath)

        let seq = await this.getLastSequence(config.chaincodeName, config.version, config.channelName, deploymentConfigPath, hostsConfigPath);
        let lastSequence = seq.split(':');
        let finalSequence;
        if(! lastSequence[1]){
            finalSequence = SEQUENCE
        }else{
            finalSequence = parseInt(lastSequence[1].trim(), 10) + 1;
        }

        if(!policy){
            chaincode.checkCommitReadiness(finalArg1, targets, finalSequence, config.channelName);
        } else {
            if(! config.endorsementPolicy){
                e('NO POLICY DEFINED');
                return
            }
            chaincode.checkCommitReadiness(finalArg1, targets, finalSequence, config.channelName, config.endorsementPolicy);
        }
    }

    static async deployChaincode(targets: string[], upgrade: boolean, policy: boolean, forceNew: boolean, deploymentConfigPath: string, hostsConfigPath: string, commitConfigPath: string): Promise <void> {
        let targetPeers = await this.getTargetPeers(targets, deploymentConfigPath, hostsConfigPath)
        const config: CommitConfiguration = await Orchestrator._parseCommitConfig(commitConfigPath);
        if (!config) return;
        await this.deployCliSingleton(config.chaincodeName, targetPeers, config.version, config.chaincodeRootPath, config.scriptsRootPath, deploymentConfigPath, hostsConfigPath, commitConfigPath)
        // test if is installed
        const {docker, organization} = await this.loadOrgEngine(deploymentConfigPath, hostsConfigPath)
        const chaincode = new Chaincode(docker, config.chaincodeName, config.version);
        await chaincode.init(organization.fullName);
        let res = await chaincode.isInstalled();
        if (res == "false") {
            await this.installChaincodeCli(config.chaincodeName, targetPeers, config.version, config.chaincodePath, deploymentConfigPath, hostsConfigPath, commitConfigPath)
            await this.approveChaincodeCli(config.chaincodeName, config.version, config.channelName, upgrade, policy, forceNew, deploymentConfigPath, hostsConfigPath, commitConfigPath);
            await this.commitChaincode(upgrade, policy, deploymentConfigPath, hostsConfigPath, commitConfigPath);
        } else {
            await this.approveChaincodeCli(config.chaincodeName, config.version, config.channelName, upgrade, policy, forceNew, deploymentConfigPath, hostsConfigPath, commitConfigPath);
            await this.commitChaincode(upgrade, policy, deploymentConfigPath, hostsConfigPath, commitConfigPath);
        }
    }

    private static async deployCliSingleton(name: string, targets: Peer[], version: string, chaincodeRootPath: string, scriptsRootPath: string, deploymentConfigPath: string, hostsConfigPath: string, commitConfigPath: string): Promise<void> {
        //let config = await this.getChaincodeParams(commitConfigPath);
        //l(`[Chaincode] - Request to install  a chaincode (${config.chaincodeName})`); // config.chaincodeRootPath, config.scriptsRootPath
        l(`[Chaincode] - Request to install  a chaincode (${name})`);
        const network: Network = await Orchestrator._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
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
            hosts: network.hosts,
            envVars: {
                FABRIC_VERSION: HLF_DEFAULT_VERSION.FABRIC,
                FABRIC_CA_VERSION: HLF_DEFAULT_VERSION.CA,
                THIRDPARTY_VERSION: HLF_DEFAULT_VERSION.THIRDPARTY
            },
            cliChaincodeRootPath: chaincodeRootPath,
            cliScriptsRootPath: scriptsRootPath
        };

        l('Creating Peer base docker compose file');
        const peerBaseGenerator = new DockerComposeEntityBaseGenerator(options, network);
        await peerBaseGenerator.createTemplateBase();

        l('Creating Docker network');
        // TODO use localhost and default port for the default engine
        const engine = new DockerEngine({socketPath: '/var/run/docker.sock'});
        await engine.createNetwork({Name: options.composeNetwork});

        l('Creating cli container & deploy');
        const cliSingleton = DockerComposeCliSingleton.init(`docker-compose-cli-${organization.name}.yaml`, options, engine);
       
        l(`'Creating Cli container template`);
        await cliSingleton.createTemplateCli();

        await cliSingleton.startCli() // targets[0]
    }
    
    
    static async generateNewOrgDefinition(deploymentConfigPath: string, hostsConfigPath: string) {
        const network: Network = await Orchestrator._parse(deploymentConfigPath, hostsConfigPath);
        l('Validate input configuration file');
        const path = network.options.networkConfigPath ?? this._getDefaultPath();
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
        const organization: Organization = network.organizations[0];
        l('[End] Blockchain configuration files parsed');
        //we will generate new configtx.yaml using orgConfigYaml and not configtxYaml because the new org yaml file struct is different from
        //the one in configtxYaml also the orderer generation will be handled later
        const configTxOrg = new OrgGenerator('configtx.yaml', path, network, organization);
        await configTxOrg.save()
        //generate new org definition
        await configTxOrg.generateDefinition();
        await configTxOrg.generateAnchorDefinition();
    }

    static async generateCustomChannelDef(orgDefinition, anchorDefinition, channelName, deploymentConfigPath: string, hostsConfigPath: string) {
        const network: Network = await Orchestrator._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? this._getDefaultPath();
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
        const channelGenerator = new ChannelGenerator(`connection-profile-join-channel-${network.organizations[0].name}.yaml`, path, network);
        try{
            await channelGenerator.generateCustomChannelDef(orgDefinition, anchorDefinition, channelName)
        }catch(err){
            e('ERROR generating new channel DEF')
             e(err)
            return ;
        }
    }

    static async signCustomChannelDef(channelDef, channelName, deploymentConfigPath: string, hostsConfigPath: string) {
        const network: Network = await Orchestrator._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        const channelGenerator = new ChannelGenerator(`connection-profile-join-channel-${network.organizations[0].name}.yaml`, path, network);
        try{
            const signature = await channelGenerator.signConfig(channelDef);
            //save the sig to a file
            var bufSig = Buffer.from(JSON.stringify(signature));
            let pathSig = `${getNewOrgRequestSignaturesPath(network.options.networkConfigPath, channelName)}/${network.organizations[0].name}_sign.json`
            await SysWrapper.createFile(pathSig, JSON.stringify(signature));
        }catch(err) {
            e('error signing channel definition')
             e(err)
            return ;
        }
    }

    static async submitCustomChannelDef(channelDef, signaturesFolder, channelName, deploymentConfigPath: string, hostsConfigPath: string) {
        const network: Network = await Orchestrator._parse(deploymentConfigPath, hostsConfigPath);
        const path = network.options.networkConfigPath ?? this._getDefaultPath();

        const channelGenerator = new ChannelGenerator(`connection-profile-join-channel-${network.organizations[0].name}.yaml`, path, network);
        
        let allSignatures=[];
        let sigFiles = await SysWrapper.enumFilesInFolder(signaturesFolder)
        for(let myFile of sigFiles){
            let tmp =  await SysWrapper.getJSON(`${signaturesFolder}/${myFile}`);
            let signature_header_buff = tmp.signature_header.buffer;
            let signature_buff = tmp.signature.buffer;

            let sig_header_wrapped =  ByteBuffer.wrap(signature_header_buff.data);
            let sig_wraped =  ByteBuffer.wrap(signature_buff.data);

            let sig_obj_wrapped = {
                signature_header:sig_header_wrapped,
                signature: sig_wraped
            }
            allSignatures.push(sig_obj_wrapped)
        }
        try{
            await channelGenerator.submitChannelUpdate(channelDef, allSignatures, channelName);
        }catch(err){
            e('ERROR submitting channel def')
             e(err)
            return ;
        }
    }
    
    
    private static async getLastSequence(name, version, channelName, configFilePath, hostsConfigPath) {
        l(' REQUEST to approve chaincode')
        const {docker, organization} = await this.loadOrgEngine(configFilePath, hostsConfigPath)
        const chaincode = new Chaincode(docker, name, version);
        await chaincode.init(organization.fullName);
        let seq =  await chaincode.getLastSequence(channelName);
        return seq;
    }

    private static async getCommitOrgNames(commitConfigPath: string){
        const config: CommitConfiguration = await Orchestrator._parseCommitConfig(commitConfigPath);
        if (!config) return;
        const organizations: Organization[] = config.organizations;
        let listOrgs=[];
        organizations.forEach((org) => {
            listOrgs.push(org.name);
        })
        return listOrgs;
    }

    private static async getTargetCommitPeers(commitConfigPath: string){
        const config: CommitConfiguration = await Orchestrator._parseCommitConfig(commitConfigPath);
        if (!config) return;
        const organizations: Organization[] = config.organizations;
        let targets=''
        organizations.forEach((org) => {
            let nameOrg = org.name;
            let domainName = org.domainName;
            let fullName = nameOrg+'.'+domainName;
            for(let singlePeer of org.peers){
                let namePeer = singlePeer.name;
                let portPeer = singlePeer.options.ports[0];
                let pathToCert = `/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${fullName}/peers/${namePeer}.${fullName}/tls/ca.crt`
                targets += `--peerAddresses ${namePeer}.${fullName}:${portPeer} --tlsRootCertFiles ${pathToCert} `
            }

        })

        return targets;
    }

    private static async getTargetPeers(targets: string[], deploymentConfigPath: string, hostsConfigPath: string) {
        const network: Network = await Orchestrator._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        let targetPeers: Peer[] = [];
        if(!targets){ //load all peers
            targetPeers = network.organizations[0].peers;
        }else {
            targets.forEach((namePeer) => {
                network.organizations[0].peers.forEach((peer) => {
                    if(namePeer == peer.name){
                        targetPeers.push(peer)
                    }
                })
            })
        }

        return targetPeers;
    }

    private static async loadOrgEngine(deploymentConfigPath: string, hostsConfigPath: string) {
        const network: Network = await Orchestrator._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const organization: Organization = network.organizations[0];
        //const engine = organization.getEngine(organization.peers[0].options.engineName);
        const docker =  new DockerEngine({socketPath: '/var/run/docker.sock'}); //{ host: engine.options.host, port: engine.options.port });
        return {docker, organization};
    }

  /****************************************************************************/
  // All methods below are used
  
    private static async loadAllPeersForInstall(deploymentConfigPath: string, hostsConfigPath: string): Promise <Peer []> {
        // @ts-ignore
        const network: Network = await Orchestrator._parse(deploymentConfigPath, hostsConfigPath);
        let peers: Peer[] = [];
        peers = network.organizations[0].peers;
        return peers;
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
    * Parse & validate the input configuration deployment file.
    * Once done, start the CA and create all credentials for peers, orderer, admin & users
    * Start the blockchain network (peers, orderers)
    * @param configFilePath the full path to deployment configuration file
    * @param skipDownload boolean to download fabric binaries (needed to create credentials)
    */
    async validateAndParse(deploymentConfigPath: string, hostsConfigPath: string, skipDownload?: boolean) {
        const network: Network = await Orchestrator._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        l('[End] Blockchain configuration files parsed');
        
        // Generate dynamically crypto
        const homedir = require('os').homedir();
        const path = join(homedir, NETWORK_ROOT_PATH);
        await SysWrapper.createFolder(path);
        
        const options: DockerComposeYamlOptions = {
          networkRootPath: path,
          composeNetwork: BNC_NETWORK,
          org: network.organizations[0],
          hosts: network.hosts,
          envVars: {
            FABRIC_VERSION: HLF_DEFAULT_VERSION.FABRIC,
            FABRIC_CA_VERSION: HLF_DEFAULT_VERSION.CA,
            THIRDPARTY_VERSION: HLF_DEFAULT_VERSION.THIRDPARTY
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
}
