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
import { DockerComposeYamlOptions } from '../../utils/datatype';
import { e, l } from '../../utils/logs';
import { DockerEngine } from '../../utils/dockerAgent';
import { Peer } from '../../parser/model/peer';
import { Utils } from '../../utils/helper';
import getDockerComposePath = Utils.getDockerComposePath;
import { ENABLE_CONTAINER_LOGGING } from '../../utils/constants';
const fs = require('fs');
const yaml = require('js-yaml')


export class DockerComposeCliSingleton extends BaseGenerator {
    private static instance: DockerComposeCliSingleton;

    // TODO: add volumes section only for actual volumes...
    contents = `
version: '2'

networks:
  ${this.options.composeNetwork}:
    external: true

volumes:
    ${this.options.cliChaincodeRootPath}:
        external: true
    ${this.options.cliScriptsRootPath}:
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
      - CC_ROOT_PATH=/opt/gopath/src/github.com/hyperledger/fabric-samples/chaincode
      - CORE_PEER_ID=cli
      - CORE_PEER_ADDRESS=${this.options.org.peers[0].name}.${this.options.org.fullName}:${this.options.org.peers[0].options.ports[0]}
      - CORE_PEER_LOCALMSPID=${this.options.org.mspName}
      - CORE_PEER_TLS_ENABLED=true
      - CORE_PEER_TLS_CERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${this.options.org.fullName}/peers/${this.options.org.peers[0].name}/tls/server.crt
      - CORE_PEER_TLS_KEY_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${this.options.org.fullName}/peers/${this.options.org.peers[0].name}/tls/server.key
      - CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${this.options.org.fullName}/peers/${this.options.org.peers[0].name}.${this.options.org.fullName}/tls/ca.crt
      - CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${this.options.org.fullName}/users/Admin@${this.options.org.fullName}/msp
      - CORE_ORDERER_TLS_ROOTCERT=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/${this.options.org.orderers[0].name}.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem
      - CORE_ORDERER_ID=${this.options.org.orderers[0].name}.${this.options.org.domainName}:${this.options.org.orderers[0].options.ports[0]}
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric/peer
    command: ${this.options.command && this.options.command.length > 0 ? `${this.options.command}` : `/bin/bash`}
    labels:
      - "bnc=hlf"
    volumes:
      - /var/run/:/host/var/run/
      - ${this.options.networkRootPath}/organizations:/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/
      - ${this.options.networkRootPath}/artifacts:/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts
      - ${this.options.cliChaincodeRootPath}:/opt/gopath/src/github.com/hyperledger/fabric-samples/chaincode
      - ${this.options.cliScriptsRootPath}:/opt/gopath/src/github.com/hyperledger/fabric/peer/scripts
    networks:
      - ${this.options.composeNetwork}
${this.options.ips && this.options.ips.length > 0 ?  `
    extra_hosts:
${this.options.ips
        .map(host => `
      - "${host.ip}"
`).join('')}
`: ``}
  `;

    /**
     * The Singleton's constructor should always be private to prevent direct
     * construction calls with the `new` operator.
     */
    private constructor(filename: string, 
                        private options: DockerComposeYamlOptions,
                        private readonly dockerEngine: DockerEngine) {
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

    public static init(filename: string, options: DockerComposeYamlOptions, dockerEngine: DockerEngine): DockerComposeCliSingleton{
        if(DockerComposeCliSingleton.instance != null){
            console.log("ALREADY initialized")
        }
        DockerComposeCliSingleton.instance = new DockerComposeCliSingleton(filename, options, dockerEngine);
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
    async startCli(): Promise<boolean> {
        try {
            const serviceName =  `cli.${this.options.org.fullName}`;

            l(`Starting CLI ${serviceName}...`);

            //const engine = this.options.org.getEngine(peer.options.engineName);
            //this.container = await this.dockerEngine.getContainer(`cli.${this.options.org.fullName}`)
            await this.dockerEngine.composeOne(serviceName, { cwd: this.path, config: this.filename, log: ENABLE_CONTAINER_LOGGING });

            l(`Service Peer ${serviceName} started successfully !!!`);

            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }
}