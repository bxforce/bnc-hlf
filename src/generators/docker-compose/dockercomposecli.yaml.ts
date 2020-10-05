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

import { BaseGenerator } from '../base';
import { DockerComposeYamlOptions } from '../../utils/data-type';
import { e, l } from '../../utils/logs';
import { DockerEngine } from '../../agents/docker-agent';
import { DockerContainer } from '../../agents/docker-agent';
import { Peer } from '../../models/peer';
import { Utils } from '../../utils/utils';
import getDockerComposePath = Utils.getDockerComposePath;
import { ENABLE_CONTAINER_LOGGING } from '../../utils/constants';
const fs = require('fs');
const yaml = require('js-yaml')


/**
 * Class responsible to generate cli compose file
 */
export class DockerComposeCliGenerator extends BaseGenerator {


    public container;
    public docker;
    private _peers;

    /* docker compose content for peers */
    contents = `
version: '2'

networks:
  ${this.options.composeNetwork}:
    external: true

services:
  cli.${this.options.org.fullName}:
    container_name: cli.${this.options.org.fullName}
    image: hyperledger/fabric-tools:2.1
    tty: true
    stdin_open: true
    environment:
      - GOPATH=/opt/gopath
      - CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock
      #- FABRIC_LOGGING_SPEC=DEBUG
      - FABRIC_LOGGING_SPEC=INFO
      - CHANNEL_NAME=mychannel
      - CORE_PEER_ID=cli
      - CORE_PEER_ADDRESS=${this.options.org.peers[0].name}.${this.options.org.fullName}:${this.options.org.peers[0].options.ports[0]}
      - CORE_PEER_LOCALMSPID=${this.options.org.mspName}
      - CORE_PEER_TLS_ENABLED=true
      - CORE_PEER_TLS_CERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${this.options.org.fullName}/peers/${this.options.org.peers[0].name}/tls/server.crt
      - CORE_PEER_TLS_KEY_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${this.options.org.fullName}/peers/${this.options.org.peers[0].name}/tls/server.key
      - CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${this.options.org.fullName}/peers/${this.options.org.peers[0].name}.${this.options.org.fullName}/tls/ca.crt
      - CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${this.options.org.fullName}/users/Admin@org1.bnc.com/msp
      - CORE_ORDERER_TLS_ROOTCERT=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric/peer
    command: /bin/bash
    volumes:
      - /var/run/:/host/var/run/
      - ${this.options.networkRootPath}/organizations:/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/
      - ${this.options.networkRootPath}/artifacts:/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts
      - /home/ubuntu/fabric-samples/chaincode/:/opt/gopath/src/github.com/hyperledger/fabric-samples/chaincode
      - /home/ubuntu/scripts:/opt/gopath/src/github.com/hyperledger/fabric/peer/scripts
    networks:
      - ${this.options.composeNetwork}
  `;

    /**
     * Constructor
     * @param filename
     * @param options
     */
    constructor(filename: string, private options: DockerComposeYamlOptions) {

        super(filename, getDockerComposePath(options.networkRootPath));


      //  this._peers = peers;


    }

    /**
     * Save the docker compose template file
     * @return true if successful, false otherwise
     */
    async createTemplateCli(): Promise<Boolean> {
        try {
            await this.save();

            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }

    /**
     * Start a single peer container
     * @param peer
     */
    async startCli(peer: Peer): Promise<boolean> {
        try {
            const serviceName =  `cli.${this.options.org.fullName}`;

            l(`Starting CLI ${serviceName}...`);

            const engine = this.options.org.getEngine(peer.options.engineName);
                console.log('after engine')
            this.docker = new DockerEngine({ host: engine.options.url, port: engine.options.port });
            console.log('after docker')
            await this.docker.composeOne(serviceName, { cwd: this.path, config: this.filename, log: ENABLE_CONTAINER_LOGGING });

            l(`Service Peer ${serviceName} started successfully !!!`);

            return true;
        } catch(err) {
            e(err);
            return false;
        }
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

    async checkCommitReadiness(peer: Peer, v1,v2): Promise <boolean> {
        try {
            this.container = await this.docker.getContainer('cli.org1.bnc.com')
            const cmd = ["./scripts/commit.sh"]
            //  const cmd = ['bash', '-c', 'source ./scripts/install.sh']
            let res = await this.execute(cmd, v1, v2);
            console.log('RESULT check  commit readiness', res)
            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }

    async approve(): Promise <boolean> {
        try {

            this.container = await this.docker.getContainer('cli.org1.bnc.com')
            const cmd = ["./scripts/approve.sh"]
            //  const cmd = ['bash', '-c', 'source ./scripts/install.sh']
            let res = await this.executeApprove(cmd);
            console.log('RESULT  Approve', res)
            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }



    async queryInstalled(peer: Peer, v1,v2): Promise <boolean> {
        try {
            this.container = await this.docker.getContainer('cli.org1.bnc.com')
            const cmd = ['bash', '-c', 'echo $PACKAGE_ID']
            let res = await this.execute(cmd, v1, v2);
            console.log('RESULT QUERY INSTALLED', res)
            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }

    async setGlobalVars(arg1,arg2): Promise <boolean> {
        try {
            console.log('into set var')
            this.container = await this.docker.getContainer('cli.org1.bnc.com')
            const cmd = ['source','./scripts/envVar.sh', arg1 , arg2]
            let res = await this.execute(cmd, arg2, arg1);
            console.log('result of command set Global', res)
            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }


    /**
     * Executes the given program in the Docker container
     * @param {string[]} command The program to execute
     */
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


    get peers() {
        return this._peers;
    }

    set peers(value) {
        this._peers = value;
    }
}
