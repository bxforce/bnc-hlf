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
import {Organization} from '../parser/model/organization';
import {Peer} from '../parser/model/peer';
import {Network} from '../parser/model/network';
import {CommitConfiguration} from '../parser/model/commitConfiguration';
import {DockerComposeEntityBaseGenerator} from '../generators/docker-compose/dockerComposeBase.yaml';
import {DockerComposeCli} from '../generators/docker-compose/dockerComposeCli.yaml';
import {Chaincode} from'../core/hlf/chaincode';
import {DockerComposeYamlOptions} from '../utils/datatype';
import {d, e, l} from '../utils/logs';
import {DockerEngine} from '../utils/dockerAgent';
import {
    BNC_NETWORK,
    NETWORK_ROOT_PATH,
    HLF_DEFAULT_VERSION,
    SEQUENCE
} from '../utils/constants';
import {Utils} from '../utils/helper';
import getScriptsPath = Utils.getScriptsPath;
import { Helper } from './helper';

/**
 * Main tools orchestrator
 *
 * @author wassim.znaidi@gmail.com
 * @author sahar fehri
 * @author ahmed souissi
 */
export class ChaincodeOrchestrator {

    static async deployChaincodeCli(deploymentConfigPath: string, hostsConfigPath: string, commitConfigPath: string): Promise<void> {
        const config: CommitConfiguration = await Helper._parseCommitConfig(commitConfigPath);
        if (!config) return;
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const isNetworkValid = network.validate();
        if (!isNetworkValid) {
            return;
        }
        const organization: Organization = network.organizations[0];
        //peer0 of org1
        const peer: Peer = network.organizations[0].peers[0];

        // Assign & check root path
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();

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
            cliChaincodeRootPath: config.chaincodeRootPath
        };
        //if (compile) options.command = config.compilationCommand

        l('Creating Peer base docker compose file');
        const peerBaseGenerator = new DockerComposeEntityBaseGenerator(options, network);
        await peerBaseGenerator.createTemplateBase();

        l('Creating Docker network');
        // TODO use localhost and default port for the default engine // { host: DOCKER_DEFAULT.IP as string, port: DOCKER_DEFAULT.PORT }
        const engine = new DockerEngine({socketPath: '/var/run/docker.sock'});
        await engine.createNetwork({Name: options.composeNetwork});

        l('Creating cli container');
        const cli = DockerComposeCli.init(`docker-compose-cli.yaml`, options, engine);

        l(`'Creating Cli container template`);
        await cli.createTemplateCli();

        await cli.startCli()
    }

    static async installChaincode(deployConfigPath, hostsConfigPath, commitConfigPath, targets): Promise<void> {
        let targetPeers = await this.getTargetPeers(targets, deployConfigPath, hostsConfigPath)
        const config: CommitConfiguration = await Helper._parseCommitConfig(commitConfigPath);
        if (!config) return;
        await ChaincodeOrchestrator.deployCli(config.chaincodeName, targetPeers, config.version, config.chaincodeRootPath, deployConfigPath, hostsConfigPath, commitConfigPath)
        await ChaincodeOrchestrator.installChaincodeCli(config.chaincodeName, targetPeers, config.version, deployConfigPath, hostsConfigPath, commitConfigPath)
    }

    static async installChaincodeCli(name: string, targets: Peer[], version: string, deployConfigPath: string, hostsConfigPath: string, commitConfigPath: string): Promise<void> {
        l('[End] Blockchain configuration files parsed');
        const config: CommitConfiguration = await Helper._parseCommitConfig(commitConfigPath); // TODO: fix choose between config and command variables
        if (!config) return;
        const {docker, organization} = await this.loadOrgEngine(deployConfigPath, hostsConfigPath)
        const chaincode = new Chaincode(docker, name, version, getScriptsPath(config.networkRootPath)); // new Chaincode(docker, config.chaincodeName, config.version);
        await chaincode.init(organization.fullName);
        for(let peer of targets){
            let peerName = `${peer.name}.${organization.fullName}`
            let peerAddress = `${peerName}:${peer.options.ports[0]}`
            let peerTlsRootCert = `/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${organization.fullName}/peers/${peer.name}.${organization.fullName}/tls/ca.crt`
            await chaincode.installChaincode(organization.fullName, peerName, peerAddress, peerTlsRootCert, config.chaincodeLang, config.chaincodeEnv, config.chaincodePath);
        }
    }

    static async approveChaincodeCli(deploymentConfigPath: string, hostsConfigPath: string, commitConfigPath: string, upgrade: boolean, policy: boolean, privateData: boolean, forceNew: boolean): Promise<void> {
        l(' REQUEST to approve chaincode')
        const config: CommitConfiguration = await Helper._parseCommitConfig(commitConfigPath);
        if (!config) return;
        const {docker, organization} = await this.loadOrgEngine(deploymentConfigPath, hostsConfigPath)
        const chaincode = new Chaincode(docker, config.chaincodeName, config.version, getScriptsPath(config.networkRootPath)); // new Chaincode(docker, config.chaincodeName, config.version);
        await chaincode.init(organization.fullName);
        let seq = await this.getLastSequence(config.chaincodeName, config.version, getScriptsPath(config.networkRootPath), config.channelName, deploymentConfigPath, hostsConfigPath);
        let lastSequence = seq.split(':');
        let privateCollection = privateData? config.privateData : null ;
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
            await chaincode.approve(finalSequence, config.channelName, privateCollection, config.chaincodePath);
        }else{
            if(! config.endorsementPolicy){
                e('NO POLICY WAS DEFINED');
                return
            }
            await chaincode.approve(finalSequence, config.channelName, privateCollection, config.chaincodePath, config.endorsementPolicy);
        }
    }

    static async commitChaincode(deploymentConfigPath: string, hostsConfigPath: string, commitConfigPath: string, upgrade: boolean, policy: boolean, privateData: boolean): Promise <void> {
        l('Request to commit chaincode')
        const {docker, organization} = await this.loadOrgEngine(deploymentConfigPath, hostsConfigPath);
        const config: CommitConfiguration = await Helper._parseCommitConfig(commitConfigPath);
        if (!config) return;
        const chaincode = new Chaincode(docker, config.chaincodeName, config.version, getScriptsPath(config.networkRootPath)); // TODO add those args in command line
        await chaincode.init(organization.fullName);

        let finalArg1= "";
        let allOrgs = await this.getCommitOrgNames(commitConfigPath);
        for(let org of allOrgs){
            let mspName = org+"MSP";
            finalArg1+= `\"${mspName}\": true`
            finalArg1 += ";"
        }

        let targets = await this.getTargetCommitPeers(config)
        
        let seq = await this.getLastSequence(config.chaincodeName, config.version, getScriptsPath(config.networkRootPath), config.channelName, deploymentConfigPath, hostsConfigPath);
        let lastSequence = seq.split(':');
        let privateCollection = privateData? config.privateData : null ;
        let finalSequence;
        if(! lastSequence[1]){
            finalSequence = SEQUENCE
        }else{
            finalSequence = parseInt(lastSequence[1].trim(), 10) + 1;
        }

        if(!policy){
            chaincode.checkCommitReadiness(finalArg1, targets, finalSequence, config.channelName, privateCollection, config.chaincodePath);
        } else {
            if(! config.endorsementPolicy){
                e('NO POLICY DEFINED');
                return
            }
            chaincode.checkCommitReadiness(finalArg1, targets, finalSequence, config.channelName, privateCollection, config.chaincodePath, config.endorsementPolicy);
        }
    }

    static async deployChaincode(targets: string[], upgrade: boolean, policy: boolean, privateData: boolean, forceNew: boolean, deploymentConfigPath: string, hostsConfigPath: string, commitConfigPath: string): Promise <void> {
        let targetPeers = await this.getTargetPeers(targets, deploymentConfigPath, hostsConfigPath)
        const config: CommitConfiguration = await Helper._parseCommitConfig(commitConfigPath);
        if (!config) return;
        await this.deployCli(config.chaincodeName, targetPeers, config.version, config.chaincodeRootPath, deploymentConfigPath, hostsConfigPath, commitConfigPath)
        // test if is installed
        const {docker, organization} = await this.loadOrgEngine(deploymentConfigPath, hostsConfigPath)
        const chaincode = new Chaincode(docker, config.chaincodeName, config.version, getScriptsPath(config.networkRootPath));
        await chaincode.init(organization.fullName);
        let res = await chaincode.isInstalled();
        if (res == "false") {
            await this.installChaincodeCli(config.chaincodeName, targetPeers, config.version, deploymentConfigPath, hostsConfigPath, commitConfigPath)
            await this.approveChaincodeCli(deploymentConfigPath, hostsConfigPath, commitConfigPath, upgrade, policy, privateData, forceNew);
            await this.commitChaincode(deploymentConfigPath, hostsConfigPath, commitConfigPath, upgrade, policy, privateData);
        } else {
            await this.approveChaincodeCli(deploymentConfigPath, hostsConfigPath, commitConfigPath, upgrade, policy, privateData, forceNew);
            await this.commitChaincode(deploymentConfigPath, hostsConfigPath, commitConfigPath, upgrade, policy, privateData);
        }
    }
    
    static async invokeChaincode(deployConfigPath, hostsConfigPath, commitConfigPath, params): Promise<void> {
        const config: CommitConfiguration = await Helper._parseCommitConfig(commitConfigPath);
        if (!config) return;
        const {docker, organization} = await this.loadOrgEngine(deployConfigPath, hostsConfigPath);
        const chaincode = new Chaincode(docker, config.chaincodeName, config.version, getScriptsPath(config.networkRootPath));
        await chaincode.init(organization.fullName);
        const network: Network = await Helper._parse(deployConfigPath, hostsConfigPath);
        if (!network) return;
        let org = network.ordererOrganization[0];
        let ordererAddress = `${org.orderers[0].fullName}:${org.orderers[0].options.ports[0]}`;
        let ordererCert = `/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/${org.fullOrgName}/orderers/${org.orderers[0].fullName}/msp/tlscacerts/tlsca.${org.domainName}-cert.pem`;
        let peers = await this.getTargetCommitPeers(config)
        let args = '{\"Args\":['; params.forEach(x => { args += '\"'+x+'\",'; }); args = args.slice(0, -1); args += ']}';
        await chaincode.invokeChaincode(args, config.channelName, ordererCert, ordererAddress, peers);
    }

    static async queryChaincode(deployConfigPath, hostsConfigPath, commitConfigPath, params): Promise<void> {
        const config: CommitConfiguration = await Helper._parseCommitConfig(commitConfigPath);
        if (!config) return;
        const {docker, organization} = await this.loadOrgEngine(deployConfigPath, hostsConfigPath);
        const chaincode = new Chaincode(docker, config.chaincodeName, config.version, getScriptsPath(config.networkRootPath));
        await chaincode.init(organization.fullName);
        let args = '{\"Args\":['; params.forEach(x => { args += '\"'+x+'\",'; }); args = args.slice(0, -1); args += ']}';
        await chaincode.queryChaincode(args, config.channelName);
    }

    private static async deployCli(name: string, targets: Peer[], version: string, chaincodeRootPath: string, deploymentConfigPath: string, hostsConfigPath: string, commitConfigPath: string): Promise<void> {
        //let config = await this.getChaincodeParams(commitConfigPath);
        //l(`[Chaincode] - Request to install  a chaincode (${config.chaincodeName})`); // config.chaincodeRootPath
        l(`[Chaincode] - Request to install  a chaincode (${name})`);
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
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
        const path = network.options.networkConfigPath ?? Helper._getDefaultPath();

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
            cliChaincodeRootPath: chaincodeRootPath
        };

        l('Creating Peer base docker compose file');
        const peerBaseGenerator = new DockerComposeEntityBaseGenerator(options, network);
        await peerBaseGenerator.createTemplateBase();

        l('Creating Docker network');
        // TODO use localhost and default port for the default engine
        const engine = new DockerEngine({socketPath: '/var/run/docker.sock'});
        await engine.createNetwork({Name: options.composeNetwork});

        l('Creating cli container & deploy');
        const cliSingleton = DockerComposeCli.init(`docker-compose-cli-${organization.name}.yaml`, options, engine);

        l(`'Creating Cli container template`);
        await cliSingleton.createTemplateCli();

        await cliSingleton.startCli() // targets[0]
    }

    private static async getTargetCommitPeers(config: CommitConfiguration){
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

    private static async getLastSequence(name, version, scriptsPath, channelName, configFilePath, hostsConfigPath) {
        l(' REQUEST to approve chaincode')
        const {docker, organization} = await this.loadOrgEngine(configFilePath, hostsConfigPath)
        const chaincode = new Chaincode(docker, name, version, scriptsPath);
        await chaincode.init(organization.fullName);
        let seq =  await chaincode.getLastSequence(channelName);
        return seq;
    }

    private static async getCommitOrgNames(commitConfigPath: string){
        const config: CommitConfiguration = await Helper._parseCommitConfig(commitConfigPath);
        if (!config) return;
        const organizations: Organization[] = config.organizations;
        let listOrgs=[];
        organizations.forEach((org) => {
            listOrgs.push(org.name);
        })
        return listOrgs;
    }

    private static async getTargetPeers(targets: string[], deploymentConfigPath: string, hostsConfigPath: string) {
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
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
        const network: Network = await Helper._parse(deploymentConfigPath, hostsConfigPath);
        if (!network) return;
        const organization: Organization = network.organizations[0];
        const docker =  new DockerEngine({socketPath: '/var/run/docker.sock'}); 
        return {docker, organization};
    }
    
}
