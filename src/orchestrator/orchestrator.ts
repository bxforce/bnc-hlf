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

import {Organization} from '../parser/model/organization';
import {Peer} from '../parser/model/peer';
import {Network} from '../parser/model/network';
import {OrgCertsGenerator} from '../generators/crypto/createOrgCerts';
import {OrdererCertsGenerator} from '../generators/crypto/createOrdererCerts';
import {ConfigtxYamlGenerator} from '../generators/artifacts/configtxGenerator';
import {DockerComposeEntityBaseGenerator} from '../generators/docker-compose/dockerComposeBase.yaml';
import {DockerComposeCaGenerator} from '../generators/docker-compose/dockerComposeCa.yaml';
import {DockerComposeCaOrdererGenerator} from '../generators/docker-compose/dockerComposeCaOrderer.yaml';
import {DockerComposePeerGenerator} from '../generators/docker-compose/dockerComposePeer.yaml';
import {DockerComposeOrdererGenerator} from '../generators/docker-compose/dockerComposeOrderer.yaml';
import {DockerComposeCli} from '../generators/docker-compose/dockerComposeCli.yaml';
import {ChaincodeScriptsGenerator} from '../generators/scripts/chaincodeScripts';
import {BuildersScriptsGenerator} from '../generators/scripts/buildersScripts';
import {NetworkCleanShGenerator, NetworkCleanShOptions} from '../generators/utils/networkClean.sh';
import {CoreGenerator} from '../generators/utils/coreGenerator.yaml';
import {DockerComposeYamlOptions} from '../utils/datatype';
import {d, e, l} from '../utils/logs';
import {DockerEngine} from '../utils/dockerAgent';
import {Utils} from '../utils/helper';
import getHlfBinariesPath = Utils.getHlfBinariesPath;
import getDockerComposePath = Utils.getDockerComposePath;
import getScriptsPath = Utils.getScriptsPath;
import { SysWrapper } from '../utils/sysWrapper';
import {
    BNC_NETWORK,
    DEFAULT_CA_ADMIN,
    HLF_DEFAULT_VERSION,
    NETWORK_ROOT_PATH,
    ENABLE_CONTAINER_LOGGING,
    CHAINCODE_DEFAULT_CHAINCODE_ROOT_PATH
} from '../utils/constants';
import { Helper } from './helper';

/**
 * Main tools orchestrator
 *
 * @author wassim.znaidi@gmail.com
 * @author sahar fehri
 * @author ahmed souissi
 */
export class Orchestrator {
    
    /**
     * Generate the Genesis template file
     * @param configGenesisFilePath
     */
    static async generateGenesis(configGenesisFilePath: string) {
        const network: Network = await Helper._parseGenesis(configGenesisFilePath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();

        l('[genesis]: start generating genesis block...');
        const configTx = new ConfigtxYamlGenerator('configtx.yaml', path, network);
        await configTx.save();
        const gen = await configTx.generateGenesisBlock();

        l(`[genesis]: block generated --> ${gen} !!!`);
    }

    /**
     * Generate the anchor peer update
     * @param configGenesisFilePath
     */
    static async generateAnchorPeer(configGenesisFilePath: string) {
        const network: Network = await Helper._parseGenesis(configGenesisFilePath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();

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
        const network = await Helper._parse(deploymentConfigFilePath, hostsConfigPath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
        await SysWrapper.createFolder(path);

        // Check if HLF binaries exists
        const binariesFolderPath = getHlfBinariesPath(network.options.networkConfigPath, network.options.hyperledgerVersion);
        const binariesFolderExists = await SysWrapper.existsFolder(binariesFolderPath);
        if (!binariesFolderExists) {
            l('[channel config]: start downloading HLF binaries...');
            const isDownloaded = await Helper._downloadBinaries(`${network.options.networkConfigPath}/scripts`, network);
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
    static async generateOrdererCredentials(genesisFilePath: string, hostsConfigPath: string) {
        // TODO check if files exists already for the same orderers/organizations
        l('[Orderer Cred]: start parsing...');
        const network = await Helper._parse(genesisFilePath, hostsConfigPath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
        await SysWrapper.createFolder(path);
        l('[Orderer Cred]: parsing done!!!');

        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            e('[Orderer Cred]: input file contains invalid parameters !!! ');
            return;
        }
        const options: DockerComposeYamlOptions = {
            networkRootPath: path,
            composeNetwork: BNC_NETWORK,
            org: network.organizations[0],
            ord: network.ordererOrganization[0],
            hosts: []
        };
        if (network.ordererOrganization[0].ca.options.isOrgCA == false){
            l('[Orderer Cred]: configure local docker engine to be used for the generation process !!!');

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
                options,
                {name: DEFAULT_CA_ADMIN.name, password: DEFAULT_CA_ADMIN.password});
            const isGenerated = await ordererGenerator.buildCertificate();
            l(`[Orderer Cred]: credentials generated --> (${isGenerated}) !!!`);
        } else {
            l('[Orderer Cred]: Generate orderer certs by the organization CA');
            l('[Orderer Cred]: start generating credentials...');
            const ordererGenerator = new OrdererCertsGenerator('connection-profile-orderer-client.yaml',
                path,
                network,
                options,
                {name: DEFAULT_CA_ADMIN.name, password: DEFAULT_CA_ADMIN.password});
            const isGenerated = await ordererGenerator.buildCertificateWithORGCA();
        }
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
    static async deployHlfServices(deploymentConfigPath: string, hostsConfigPath: string, skipDownload = false, enablePeers = true, enableOrderers = true, enableCA?: boolean) {
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
       const organization: Organization = network.organizations[0];
        l('[End] Blockchain configuration files parsed');

        // Assign & check root path
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
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
            },
            cliBuildersScriptsRootPath: getScriptsPath(path)+'/builders'
        };

        l('Creating Peer base docker compose file');
        const peerBaseGenerator = new DockerComposeEntityBaseGenerator(options, network);
        await peerBaseGenerator.createTemplateBase();

        l('Creating Docker network');
        // TODO use localhost and default port for the default engine
        const engine = new DockerEngine({socketPath: '/var/run/docker.sock'});
        await engine.createNetwork({Name: options.composeNetwork});

        l('Creating Peer config');
        const coreGenerator = new CoreGenerator(`base/core.yaml`, getDockerComposePath(options.networkRootPath));
        coreGenerator.generate();

        l('Creating Chaincode scripts');
        (new ChaincodeScriptsGenerator(getScriptsPath(options.networkRootPath))).generate();
        (new BuildersScriptsGenerator(getScriptsPath(options.networkRootPath)+'/builders')).generate();

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
        if(enableCA){
            // star cli also !
            l('Start CA org');
            const ca = new DockerComposeCaGenerator(`docker-compose-ca-${network.organizations[0].name}.yaml`, path, network, options, engine);
            const caStarted = await ca.startOrgCa();
            //start cli using the engine here and not using the generator under docker compose so we dnt have to pass chaincode commit file
            l('starting cli container');
            const serviceName =  `cli.${options.org.fullName}`;
            l(`Starting CLI ${serviceName}...`);
            await engine.composeOne(serviceName, { cwd: getDockerComposePath(path), config:  `docker-compose-cli-${options.org.name}.yaml`, log: ENABLE_CONTAINER_LOGGING });
            l(`Service CLI ${serviceName} started successfully !!!`);
            if (network.ordererOrganization[0].ca.options.isOrgCA == false){
                //start CA orderer
                l('Start CA orderer');
                const ca = new DockerComposeCaOrdererGenerator('docker-compose-ca-orderer.yaml', path, network, options, engine);
                const caStarted = await ca.startOrdererCa();
            }
        }

    }

    static async startSingleOrderer(deploymentConfigPath: string, hostsConfigPath: string) {
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
        const organization: Organization = network.organizations[0];
        l('[End] Blockchain configuration files parsed');

        // Assign & check root path
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();
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
            },
            singleOrderer: true
        };

        l('Creating Docker network');
        // TODO use localhost and default port for the default engine
        const engine = new DockerEngine({socketPath: '/var/run/docker.sock'});
        await engine.createNetwork({Name: options.composeNetwork});

        l('Starting a single orderer')
        let nameOrderer = network.organizations[0].orderers[0].name;
        const ordererGenerator = new DockerComposeOrdererGenerator(`docker-compose-${nameOrderer}-${organization.name}.yaml`, options, engine);
        await ordererGenerator.createTemplateOrderers();
        const ordererStarted = await ordererGenerator.startOrderers();
        l(`Orderers started (${ordererStarted})`);


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
            const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
            if (!network) return;

            // loop on organization & peers && orderers
            for (const org of network.organizations) {
                // build list of docker volumes to delete
                const volumes: string[] = [];
                
                for (const peer of org.peers) {
                    volumes.push(`docker-compose_${peer.name}.${org.fullName}`);
                    volumes.push(`docker-compose_${peer.name}.${org.fullName}.fabric`);
                    volumes.push(`docker-compose_${peer.name}.${org.fullName}.root`);
                    volumes.push(`docker-compose_${peer.name}.${org.fullName}.couchdb`);
                }
                
                for (const orderer of org.orderers) {
                    volumes.push(`docker-compose_${orderer.name}.${org.domainName}`);
                    volumes.push(`docker-compose_${orderer.name}.${org.domainName}.fabric`);
                    volumes.push(`docker-compose_${orderer.name}.${org.domainName}.root`);
                }
                volumes.push(`docker-compose_cli.${org.fullName}`)

                const docker = new DockerEngine({socketPath: '/var/run/docker.sock'}); // TODO configure local docker remote engine
                let removeAll = forceRemove? true:false;

                const containerDeleted = await docker.stopAllContainers(removeAll);
                if (!containerDeleted) {
                    e('Error while deleting the docker container for peer & orderer');
                    return false;
                }
                if(removeAll){
                    await docker.deleteVolumesList(volumes) // TODO remove forceRemove arg
                    //also remove unwanted images starting with dev-peer !
                    await docker.deleteDevPeerImages();
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
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();

        const options = new NetworkCleanShOptions();
        options.removeImages = rmi;
        options.path = path;

        let networkClean = new NetworkCleanShGenerator('clean.sh', 'na', options);
        await networkClean.run();

        l('************ Success!');
        l('Environment cleaned!');
    }
}
