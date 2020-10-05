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
import { ChannelRequest, Orderer, Peer } from 'fabric-client';
import { ensureFile } from 'fs-extra';
import * as fs from 'fs';
import { ClientConfig, ClientHelper } from './helpers';
import { d, e, l } from '../../utils/logs';

export class Chaincode {
    public container;
    public docker;


    constructor( docker) {
        this.docker = docker;
    }

    async init(){
        this.container = await this.docker.getContainer('cli.org1.bnc.com');
    }

    async installChaincode(v1,v2): Promise <boolean> {
        try {
            this.container = await this.docker.getContainer('cli.org1.bnc.com')
            const cmd = ["./scripts/install.sh"]
            //const cmd = ['bash', '-c', 'source ./scripts/install.sh']
            let res = await this.execute(cmd, v1, v2);
            console.log('RESULT INSTALL CHAINCODE', res)
            return true;
        } catch(err) {
            e(err);
            return false;
        }
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
}