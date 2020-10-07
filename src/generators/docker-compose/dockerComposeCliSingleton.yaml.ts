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


export class DockerComposeCliSingleton extends BaseGenerator {
    private static instance: DockerComposeCliSingleton;

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
      - CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${this.options.org.fullName}/users/Admin@${this.options.org.fullName}/msp
      - CORE_ORDERER_TLS_ROOTCERT=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/${this.options.org.orderers[0].name}.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem
      - CORE_ORDERER_ID=${this.options.org.orderers[0].name}.${this.options.org.fullName}
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric/peer
    command: /bin/bash
    volumes:
      - /var/run/:/host/var/run/
      - ${this.options.networkRootPath}/organizations:/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/
      - ${this.options.networkRootPath}/artifacts:/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts
      - /home/ubuntu/fabric-samples/chaincode/:/opt/gopath/src/github.com/hyperledger/fabric-samples/chaincode
      - /home/ubuntu/bnc-hlf/tests/manual/scripts:/opt/gopath/src/github.com/hyperledger/fabric/peer/scripts
    networks:
      - ${this.options.composeNetwork}
  `;





    /**
     * The Singleton's constructor should always be private to prevent direct
     * construction calls with the `new` operator.
     */
    private constructor(filename: string, private options: DockerComposeYamlOptions) {

        super(filename, getDockerComposePath(options.networkRootPath));
    }

    /**
     * The static method that controls the access to the singleton instance.
     *
     * This implementation let you subclass the Singleton class while keeping
     * just one instance of each subclass around.
     */
    public static getInstance(): DockerComposeCliSingleton {
        if (DockerComposeCliSingleton.instance == null) {
           // DockerComposeCliSingleton.instance = new DockerComposeCliSingleton(filename, options);
            //throw error here
            console.log("call init first !")
        }

        return DockerComposeCliSingleton.instance;
    }

    public static init(filename: string, options: DockerComposeYamlOptions): DockerComposeCliSingleton{
        if(DockerComposeCliSingleton.instance != null){
            console.log("ALREADY initialized")
        }
        DockerComposeCliSingleton.instance = new DockerComposeCliSingleton(filename, options);
        return DockerComposeCliSingleton.instance;
    }

    /**
     * Finally, any singleton should define some business logic, which can be
     * executed on its instance.
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
            console.log('after engine', engine)
            console.log(peer)
            this.docker = new DockerEngine({ host: engine.options.url, port: engine.options.port });
            this.container = await this.docker.getContainer(`cli.${this.options.org.fullName}`)
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
          //  this.container = await this.docker.getContainer('cli.org1.bnc.com')
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


    async approve(): Promise <boolean> {
        try {

          //  this.container = await this.docker.getContainer('cli.org1.bnc.com')
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