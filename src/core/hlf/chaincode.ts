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
import { ensureFile } from 'fs-extra';
import * as fs from 'fs';
import { ClientConfig, ClientHelper } from './helpers';
import { d, e, l } from '../../utils/logs';
import { DockerEngine } from '../../utils/dockerAgent';
import { Peer } from '../../parser/model/peer';
import { Orchestrator } from '../../orchestrator';
import {Network} from '../../parser/model/network';

export class Chaincode {
    public container;
    public docker;
    public options;
    public name;
    public version;


    constructor(docker : DockerEngine, name: string, version: string ) {
        this.docker = docker;
        this.name = name;
        this.version = version;
    }

    async init(name) {
        this.container = await this.docker.getContainer(`cli.${name}`)
    }

    async checkCommitReadiness(arg, targets, sequence, nameChannel): Promise <boolean> {
        try {
            const cmd = ['./scripts/commit.sh', `${arg}`, `${targets}`]
            let envArray = [
                `SEQUENCE=${sequence}`,
                `CC_NAME=${this.name}`,
                `VERSION=${this.version}`,
                `CHANNEL_NAME=${nameChannel}`
            ]
            let res = await this.executeCommand(cmd, envArray);
            console.log(res)
            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }

    async installChaincode(v1,v2, path): Promise <boolean> {
        try {
            const cmd = ["./scripts/install.sh"]
            let envArray = [
                `CORE_PEER_ADDRESS=${v1}`,
                `CORE_PEER_TLS_ROOTCERT_FILE=${v2}`,
                `CC_NAME=${this.name}`,
                `VERSION=${this.version}`,
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


    async approve(sequence, channelName): Promise <boolean> {
        try {
            const cmd = ["./scripts/approve.sh"]
            let envArray = [
                `SEQUENCE=${sequence}`,
                `CC_NAME=${this.name}`,
                `VERSION=${this.version}`,
                `CHANNEL_NAME=${channelName}`
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
            const cmd = ["./scripts/queryCommitted.sh"]
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

    async executeCommand(command,envArray? : any) {

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
                if (err) return reject();
                let message = '';
                stream.on('data', data => message += data.toString());
                console.log('Data:', message)
                stream.on('end', () => resolve(message));
            });
        });
    }
}