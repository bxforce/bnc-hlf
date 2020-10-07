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
import { DockerEngine } from '../../agents/docker-agent';
import { Peer } from '../../models/peer';
import { Orchestrator } from '../../orchestrator';
import {Network} from '../../models/network';

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

    async checkCommitReadiness(arg, argArray, targets): Promise <boolean> {
        try {
            const cmd = ['./scripts/commit.sh', `${arg}`, `${targets}`]
           /* for (let singleArg of argArray){
                cmd.push(singleArg)
            }

            */
           console.log("heeere is arg before send")
            console.log(arg)
           //cmd.push(arg)
        //    const cmd = ['bash', '-c', './scripts/commit.sh', arg]
            let res = await this.executeApprove(cmd);
            console.log('RESULT check  commit readiness', res)
            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }

    async installChaincode(v1,v2): Promise <boolean> {
        try {
            const cmd = ["./scripts/install.sh"]
            //const cmd = ['bash', '-c', 'source ./scripts/install.sh']
            let envArray = [
                `CORE_PEER_ADDRESS=${v1}`,
                `CORE_PEER_TLS_ROOTCERT_FILE=${v2}`,
                `CC_NAME=${this.name}`,
                `VERSION=${this.version}`
            ]
            let res = await this.executeCommand(cmd, envArray);
            console.log('RESULT INSTALL CHAINCODE', res)
            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }


    async approve(sequence, channelName): Promise <boolean> {
        try {
            const cmd = ["./scripts/approve.sh"]
            //  const cmd = ['bash', '-c', 'source ./scripts/install.sh']
            let envArray = [
                `SEQUENCE=${sequence}`,
                `CC_NAME=${this.name}`,
                `VERSION=${this.version}`,
                `CHANNEL_NAME=${channelName}`
            ]
            let res = await this.executeCommand(cmd, envArray);
            console.log('RESULT  Approve', res)
            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }

    async executeApprove(command) {
        const exec = await this.container.exec({
            Cmd: command,
            AttachStdout: true,
            AttachStderr: true,
            Tty: true
        });

        return new Promise(async (resolve, reject) => {
            return await exec.start(async (err, stream) => {
                if (err) return reject();
                let message = '';
                stream.on('data', data => message += data.toString());
                console.log('mmessage', message)
                stream.on('end', () => resolve(message));
            });
        });
    }


    async execute(command,var1,var2) {
        const exec = await this.container.exec({
            Cmd: command,
            Env: [`CORE_PEER_ADDRESS=${var1}`,
                `CORE_PEER_TLS_ROOTCERT_FILE=${var2}`
            ],
            AttachStdout: true,
            AttachStderr: true,
            Tty: true
        });

        return new Promise(async (resolve, reject) => {
            return await exec.start(async (err, stream) => {
                if (err) return reject();
                let message = '';
                stream.on('data', data => message += data.toString());
                console.log('mmessage', message)
                stream.on('end', () => resolve(message));
            });
        });
    }


    async executeCommand(command,envArray? : any) {

        let cmdObject = {
            Cmd: command,
            Env: [],
            AttachStdout: true,
            AttachStderr: true,
            Tty: true
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
                console.log('mmessage', message)
                stream.on('end', () => resolve(message));
            });
        });
    }
}