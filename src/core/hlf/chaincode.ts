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

import * as util from 'util';
import { ChannelRequest, Orderer } from 'fabric-client';
import { Peer } from '../../parser/model/peer';
import { Network } from '../../parser/model/network';
import { ClientConfig, ClientHelper } from './client';
import { Orchestrator } from '../../orchestrator/orchestrator';
import { DockerEngine } from '../../utils/dockerAgent';
import { d, e, l } from '../../utils/logs';

/**
 * Class responsible to manage HLF chaincode
 *
 * @author sahar.fehri@irt-systemx.fr
 */
export class Chaincode {
    public container;
    public docker;
    public options;
    public name;
    public version;
    public scriptsPath;

    constructor(docker : DockerEngine, name: string, version: string, scriptsPath: string) {
        this.docker = docker;
        this.name = name;
        this.version = version;
        this.scriptsPath = scriptsPath;
    }

    async init(name) {
        this.container = await this.docker.getContainer(`cli.${name}`)
    }

    async checkCommitReadiness(arg, targets, sequence, nameChannel, privateCollection, env, path, endorsement?): Promise <boolean> {
        try {
            const cmd = ["/bin/bash", this.scriptsPath+'/commit.sh', `${arg}`, `${targets}`]
            let envArray = [
                `SEQUENCE=${sequence}`,
                `CC_NAME=${this.name}`,
                `VERSION=${this.version}`,
                `CHANNEL_NAME=${nameChannel}`
            ]
            if(endorsement){
                envArray.push(`ENDORSEMENT=${endorsement}`)
            }
            if(privateCollection != null){
                envArray.push(`PRIVATE_COLLECTION=${privateCollection}`)
                envArray.push(`CC_ENV_PATH=${env}`)
                envArray.push(`CC_PATH=${path}`)
            }
            let res = await this.executeCommand(cmd, envArray);
            console.log(res)
            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }

    async installChaincode(orgName, peerName, peerAddress, peerTlsRootCert, lang, env, path): Promise <boolean> {
        try {
            const cmd = ["/bin/bash", this.scriptsPath+"/install.sh"]
            let envArray = [
                `ORG_NAME=${orgName}`,
                `PEER_NAME=${peerName}`,
                `CORE_PEER_ADDRESS=${peerAddress}`,
                `CORE_PEER_TLS_ROOTCERT_FILE=${peerTlsRootCert}`,
                `CC_NAME=${this.name}`,
                `VERSION=${this.version}`,
                `CC_LANG=${lang}`,
                `CC_ENV_PATH=${env}`,
                `CC_PATH=${path}`
            ]
            let res = await this.executeCommand(cmd, envArray);
            console.log(res)
            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }

    async isInstalled(): Promise <string> {
        try {
            //if this file does not exist means the chaincode is not installed and u can't proceed to approve
            let fileName=`package_${this.name}_${this.version}.txt`
            const cmd = ['sh', '-c', `test -f ${fileName} && echo "true" || echo "false"`]
            let res = await this.executeCommand(cmd);
            return res.toString().replace(/\W/g, '');
        } catch(err) {
            e(err);
        }
    }

    async approve(sequence, channelName, privateCollection, env, path, endorsement?): Promise <boolean> {
        try {
            const cmd = ["/bin/bash", this.scriptsPath+"/approve.sh"]
            let envArray = [
                `SEQUENCE=${sequence}`,
                `CC_NAME=${this.name}`,
                `VERSION=${this.version}`,
                `CHANNEL_NAME=${channelName}`
            ]
            if(endorsement){
               envArray.push(`ENDORSEMENT=${endorsement}`)
            }
            if(privateCollection != null){
                envArray.push(`PRIVATE_COLLECTION=${privateCollection}`)
                envArray.push(`CC_ENV_PATH=${env}`)
                envArray.push(`CC_PATH=${path}`)

            }
            let res = await this.executeCommand(cmd, envArray);
            console.log(res)
            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }

    async invokeChaincode(args, channelName, ordererCert, ordererAddress, peers): Promise <boolean> {
        try {
            const cmd = ["/bin/bash", this.scriptsPath+"/invoke.sh"]
            let envArray = [
                `PEERS=${peers}`,
                `ORDERER_ADDRESS=${ordererAddress}`,
                `ORDERER_CERT=${ordererCert}`,
                `CHANNEL_NAME=${channelName}`,
                `CC_NAME=${this.name}`,
                `CC_ARGS=${args}`
            ]
            let res = await this.executeCommand(cmd, envArray);
            console.log(res)
            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }

    async queryChaincode(args, channelName): Promise <boolean> {
        try {
            const cmd = ["/bin/bash", this.scriptsPath+"/query.sh"]
            let envArray = [
                `CHANNEL_NAME=${channelName}`,
                `CC_NAME=${this.name}`,
                `CC_ARGS=${args}`
            ]
            let res = await this.executeCommand(cmd, envArray);
            console.log(res)
            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }

    async getLastSequence(channelName): Promise<string> {
        try {
            const cmd = ["/bin/bash", this.scriptsPath+"/queryCommitted.sh"]
            let envArray = [
                `CC_NAME=${this.name}`,
                `VERSION=${this.version}`,
                `CHANNEL_NAME=${channelName}`
            ]
            let res = await this.executeCommand(cmd, envArray);
            return res.toString();
        } catch(err) {
            e(err);
        }
    }

    async executeCommand(command, envArray? : any) {
        
        let cmdObject = {
            Cmd: command,
            Env: [],
            AttachStdout: true,
            AttachStderr: true,
            Tty: false
        }
        if(envArray){
            for(let singleVar of envArray){
                cmdObject.Env.push(singleVar)
            }

        }
        const exec = await this.container.exec(cmdObject);

        return new Promise(async (resolve, reject) => {
            return await exec.start(async (err, stream) => {
                if (err) { console.log(err); return reject(); }
                let message = '';
                stream.on('data', data => message += data.toString());
                console.log('cli logs:', message);
                stream.on('end', () => resolve(message));
            });
        });
    }
}