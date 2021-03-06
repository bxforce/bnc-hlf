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
import { Peer } from '../../parser/model/peer';
import { ENABLE_CONTAINER_LOGGING, CHANNEL_RAFT_ID, GENESIS_ORDERER_FILE_NAME } from '../../utils/constants';
import { DockerComposeYamlOptions } from '../../utils/datatype';
import { DockerEngine } from '../../utils/dockerAgent';
import { Utils } from '../../utils/helper';
import getDockerComposePath = Utils.getDockerComposePath;
import { e, l } from '../../utils/logs';

/**
 * Class responsible to generate fabric cli compose file
 *
 * @author wassim.znaidi@gmail.com
 */
export class DockerComposeCliOrderer extends BaseGenerator {
    private static instance: DockerComposeCliOrderer;

    // TODO: add volumes section only for actual volumes...
    contents = `
version: '2'

volumes:
  ${this.options.org.orderers[0].fullName}:

networks:
  ${this.options.composeNetwork}:
    external: true


services:
  cli.orderer.${this.options.org.fullName}:
    container_name: cli.orderer.${this.options.org.fullName}
    image: hyperledger/fabric-tools:2.1
    tty: true
    stdin_open: true
    environment:
      - GOPATH=/opt/gopath
      - CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock
      #- FABRIC_LOGGING_SPEC=DEBUG
      - FABRIC_LOGGING_SPEC=INFO
      - CONFIG_NAME=${GENESIS_ORDERER_FILE_NAME}
      - SYSTEM_CHANNEL=${CHANNEL_RAFT_ID}
      - CC_ROOT_PATH=/opt/gopath/src/github.com/hyperledger/fabric-samples/chaincode
      - CORE_PEER_ID=cli
      - CORE_PEER_ADDRESS=${this.options.org.peers[0].name}.${this.options.org.fullName}:${this.options.org.peers[0].options.ports[0]}
      - CORE_PEER_LOCALMSPID=${this.options.ord.mspName}
      - CORE_PEER_TLS_ENABLED=true
      - CORE_PEER_TLS_CERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${this.options.org.fullName}/peers/${this.options.org.peers[0].name}/tls/server.crt
      - CORE_PEER_TLS_KEY_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${this.options.org.fullName}/peers/${this.options.org.peers[0].name}/tls/server.key
      - CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/${this.options.org.fullName}/orderers/${this.options.org.orderers[0].fullName}/tls/ca.crt
      - CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/${this.options.org.fullName}/users/Admin@${this.options.org.domainName}/msp
      - CORE_ORDERER_TLS_ROOTCERT=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/${this.options.org.fullName}/orderers/${this.options.org.orderers[0].name}.${this.options.org.domainName}/msp/tlscacerts/tlsca.${this.options.org.domainName}-cert.pem
      - CORE_ORDERER_ID=${this.options.org.orderers[0].name}.${this.options.org.domainName}:${this.options.org.orderers[0].options.ports[0]}
    working_dir: /opt/gopath/src/github.com/hyperledger/fabric/peer
    command: ${this.options.command && this.options.command.length > 0 ? `${this.options.command}` : `/bin/bash`}
    labels:
      - "bnc=hlf"
    volumes:
      - /var/run/:/host/var/run/
      - ${this.options.networkRootPath}/organizations:/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/
      - ${this.options.networkRootPath}/artifacts:/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts
      - ${this.options.org.orderers[0].fullName}:/var/hyperledger/production/orderer
    networks:
      - ${this.options.composeNetwork}
${this.options.hosts && this.options.hosts.length > 0 ?  `
    extra_hosts:
${this.options.hosts.map(host => `
      - "${host}"
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
    public static getInstance(): DockerComposeCliOrderer {
        if (DockerComposeCliOrderer.instance == null) {
            // DockerComposeCliOrderer.instance = new DockerComposeCliOrderer(filename, options);
            //throw error here
            console.log("call init first !")
        }

        return DockerComposeCliOrderer.instance;
    }

    public static init(filename: string, options: DockerComposeYamlOptions, dockerEngine: DockerEngine): DockerComposeCliOrderer{
        if(DockerComposeCliOrderer.instance != null){
            console.log("ALREADY initialized")
        }
        DockerComposeCliOrderer.instance = new DockerComposeCliOrderer(filename, options, dockerEngine);
        return DockerComposeCliOrderer.instance;
    }

    /**
     * Finally, any singleton should define some business logic, which can be
     * executed on its instance.
     */
    async createTemplateCliOrderer(): Promise<Boolean> {
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
            const serviceName =  `cli.orderer.${this.options.org.fullName}`;
            l(`Starting CLI ${serviceName}...`);
            await this.dockerEngine.composeOne(serviceName, { cwd: this.path, config: this.filename, log: ENABLE_CONTAINER_LOGGING });
            l(`Service Peer ${serviceName} started successfully !!!`);

            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }
}