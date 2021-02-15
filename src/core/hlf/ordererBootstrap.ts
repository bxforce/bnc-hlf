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
import { Network } from '../../parser/model/network';
import { DockerEngine } from '../../utils/dockerAgent';
import { d, e, l } from '../../utils/logs';

/**
 * Class responsible to manage HLF new orderer bootstrapping
 *
 * @author sahar.fehri@irt-systemx.fr
 */




export class OrdererBootstrap {
    public container;
    public docker;


    constructor(docker : DockerEngine) {
        this.docker = docker;
    }

    async init(name) {
        this.container = await this.docker.getContainer(`cli.orderer.${name}`)
    }


    async createGenesis(): Promise <boolean> {
        try {
            // make system channel name in orderer cli plus other vars

            //peer channel fetch config $GENESIS_ORDERER_FILE_NAME -o $CORE_ORDERER_ID -c $SYSTEM_CHANNEL --tls --cafile $CORE_ORDERER_TLS_ROOTCERT > ./channel-artifacts/$GENESIS_ORDERER_FILE_NAME
            let mycmd = 'cd channel-artifacts ; peer channel fetch config $CONFIG_NAME -o $CORE_ORDERER_ID -c $SYSTEM_CHANNEL --tls --cafile $CORE_ORDERER_TLS_ROOTCERT'

            const cmd = [mycmd]

            let res = await this.executeCommand(cmd);
            console.log(res)
            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }


    async executeCommand(command,envArray? : any) {

        let cmdObject = {
           // Cmd: command,
            Cmd: ['sh', '-c', `${command}` ],
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
                console.log(err);
                if (err) return reject();
                let message = '';
                stream.on('data', data => message += data.toString());
                console.log('Data:', message);
                stream.on('end', () => resolve(message));
            });
        });
    }
}