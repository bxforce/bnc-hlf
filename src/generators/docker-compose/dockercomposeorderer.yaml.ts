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
import { Utils } from '../../utils/utils';
import getDockerComposePath = Utils.getDockerComposePath;
import getArtifactsPath = Utils.getArtifactsPath;
import { ENABLE_CONTAINER_LOGGING, GENESIS_FILE_NAME } from '../../utils/constants';
import { Orderer } from '../../models/orderer';
import { Network } from '../../models/network';

const fs = require('fs');
const yaml = require('js-yaml')

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
`).join('')}  

networks:
  ${this.options.composeNetwork}:
    external: true

services:
${this.options.org.orderers.map(orderer => `
  ${this.options.org.ordererName(orderer)}:
    extends:
      file:   base/docker-compose-base.yaml
      service: orderer-base  
    environment:
      - ORDERER_GENERAL_LISTENPORT=${orderer.options.ports[0]}
    container_name: ${this.options.org.ordererName(orderer)}
${this.options.ips ? `
    extra_hosts:
${this.options.ips
      .map(host => `
      - "${host.ip}"
`).join('')}
`: ``}
    networks:
      - ${this.options.composeNetwork}   
    volumes:
      - ${getArtifactsPath(this.options.networkRootPath)}/${GENESIS_FILE_NAME}:/var/hyperledger/orderer/orderer.genesis.block
      - ${this.options.networkRootPath}/organizations/ordererOrganizations/${this.options.org.domainName}/orderers/${this.options.org.ordererName(orderer)}/msp:/var/hyperledger/orderer/msp
      - ${this.options.networkRootPath}/organizations/ordererOrganizations/${this.options.org.domainName}/orderers/${this.options.org.ordererName(orderer)}/tls/:/var/hyperledger/orderer/tls
      - ${this.options.org.ordererName(orderer)}:/var/hyperledger/production/orderer
    ports:
      - ${orderer.options.ports[0]}:${orderer.options.ports[0]}
`).join('')}  
  `;

  /**
   * Constructor
   * @param filename
   * @param options
   * @param network
   */
  constructor(filename: string, private options: DockerComposeYamlOptions, private network?: Network) {
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

      const engine = this.options.org.getEngine(orderer.options.engineName);
      const docker = new DockerEngine({ host: engine.options.url, port: engine.options.port });

      await docker.composeOne(serviceName, { cwd: this.path, config: this.filename, log: ENABLE_CONTAINER_LOGGING });

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
