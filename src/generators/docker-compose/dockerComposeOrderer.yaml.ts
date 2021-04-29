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
import { Orderer } from '../../parser/model/orderer';
import { ENABLE_CONTAINER_LOGGING, GENESIS_FILE_NAME, GENESIS_ORDERER_FILE_NAME } from '../../utils/constants';
import { DockerComposeYamlOptions } from '../../utils/datatype';
import { DockerEngine } from '../../utils/dockerAgent';
import { Utils } from '../../utils/helper';
import getDockerComposePath = Utils.getDockerComposePath;
import getArtifactsPath = Utils.getArtifactsPath;
import { e, l } from '../../utils/logs';

/**
 * Class responsible to generate Orderer compose file
 *
 * @author wassim.znaidi@gmail.com
 */
export class DockerComposeOrdererGenerator extends BaseGenerator {
  /* docker-compose orderer template content text */
  contents = `
version: '2'

volumes:
${this.options.org.orderers
    .map(orderer => `
  ${orderer.name}.${this.options.org.domainName}:
    #external: true
  ${orderer.fullName}.fabric:
    #external: true
  ${orderer.fullName}.root:
    #external: true
`).join('')}  

networks:
  ${this.options.composeNetwork}:
    external: true

services:
${this.options.org.orderers.map(orderer => `
  ${orderer.fullName}:
    extends:
      file:   base/docker-compose-base.yaml
      service: orderer-base  
    environment:
      - ORDERER_GENERAL_LISTENADDRESS=0.0.0.0
      - ORDERER_GENERAL_LISTENPORT=${orderer.options.ports[0]}
      # Enable operation service (prometheus metrics) ${orderer.options.ports.length > 1 ? `
      - ORDERER_OPERATIONS_LISTENADDRESS=0.0.0.0:${orderer.options.ports[1]}
      - ORDERER_METRICS_PROVIDER=prometheus`:``}
      ## Logging level
      #- ORDERER_GENERAL_LOGLEVEL=INFO
      #- FABRIC_LOGGING_SPEC=INFO
    container_name: ${orderer.fullName}
    networks:
      - ${this.options.composeNetwork}   
    volumes:
      - ${getArtifactsPath(this.options.networkRootPath)}/${this.options.singleOrderer? GENESIS_ORDERER_FILE_NAME:GENESIS_FILE_NAME}:/var/hyperledger/orderer/orderer.genesis.block
      - ${this.options.networkRootPath}/organizations/ordererOrganizations/${this.options.org.fullName}/orderers/${orderer.fullName}/msp:/var/hyperledger/orderer/msp
      - ${this.options.networkRootPath}/organizations/ordererOrganizations/${this.options.org.fullName}/orderers/${orderer.fullName}/tls/:/var/hyperledger/orderer/tls
      - ${orderer.fullName}:/var/hyperledger/production/orderer
      - ${orderer.fullName}.fabric:/etc/hyperledger/fabric
      - ${orderer.fullName}.root:/var/hyperledger
    labels:
      - "bnc=hlf"
${this.options.hosts && this.options.hosts.length > 0 ? `
    ports:
      - ${orderer.options.ports[0]}:${orderer.options.ports[0]}
`:``}
${this.options.hosts && this.options.hosts.length > 0 ?  `
    extra_hosts:
${this.options.hosts.map(host => `
      - "${host}"
`).join('')}
`: ``}
`).join('')}
  `;

/*
*/

  /**
   * Constructor
   * @param filename
   * @param options
   * @param network
   */
  constructor(filename: string, 
              private options: DockerComposeYamlOptions, 
              private readonly dockerEngine: DockerEngine) {
    super(filename, getDockerComposePath(options.networkRootPath));
  }

  /**
   * Create the Orderer docker compose template file
   */
  async createTemplateOrderers(): Promise<boolean> {
    try {
      await this.save();

      return true;
    } catch(err) {
      e(err);
      return false;
    }
  }

  /**
   * Start a single orderer container service
   * @param orderer selected orderer
   */
  async startOrderer(orderer: Orderer): Promise<boolean>  {
    try {
      const serviceName = `${orderer.name}.${this.options.org.domainName}`;
      l(`Starting Orderer ${serviceName}...`);
      await this.dockerEngine.composeOne(serviceName, { cwd: this.path, config: this.filename, log: ENABLE_CONTAINER_LOGGING });
      l(`Service Orderer ${serviceName} started successfully !!!`);
      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  /**
   * Start all orderer container within the above compose template
   */
  async startOrderers(): Promise<boolean> {
    try {
      for(const orderer of this.options.org.orderers) {
        await this.startOrderer(orderer);
      }

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }
}
