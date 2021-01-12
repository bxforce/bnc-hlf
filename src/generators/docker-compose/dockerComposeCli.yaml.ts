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
import { ENABLE_CONTAINER_LOGGING } from '../../utils/constants';
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
export class DockerComposeCli extends BaseGenerator {
    private static instance: DockerComposeCli;

    // TODO: add volumes section only for actual volumes...
    contents = `
version: '2'

networks:
  ${this.options.composeNetwork}:
    external: true

${!this.options.cliChaincodeRootPath.includes('/') && !this.options.cliScriptsRootPath.includes('/') ? `
volumes:
    ${this.options.cliChaincodeRootPath}:
        external: true
    ${this.options.cliScriptsRootPath}:
        external: true
`:``}

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
      - ${this.options.cliChaincodeRootPath}:/opt/gopath/src/github.com/hyperledger/fabric-samples/chaincode
      - ${this.options.cliScriptsRootPath}:/opt/gopath/src/github.com/hyperledger/fabric/peer/scripts
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
    public static getInstance(): DockerComposeCli {
        if (DockerComposeCli.instance == null) {
           // DockerComposeCli.instance = new DockerComposeCli(filename, options);
            //throw error here
            console.log("call init first !")
        }

        return DockerComposeCli.instance;
    }

    public static init(filename: string, options: DockerComposeYamlOptions, dockerEngine: DockerEngine): DockerComposeCli{
        if(DockerComposeCli.instance != null){
            console.log("ALREADY initialized")
        }
        DockerComposeCli.instance = new DockerComposeCli(filename, options, dockerEngine);
        return DockerComposeCli.instance;
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
            await this.dockerEngine.composeOne(serviceName, { cwd: this.path, config: this.filename, log: ENABLE_CONTAINER_LOGGING });
            l(`Service Peer ${serviceName} started successfully !!!`);

            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }
}