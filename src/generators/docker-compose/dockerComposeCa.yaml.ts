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
import { DockerEngine } from '../../agents/docker-agent';
import { d, e, l } from '../../utils/logs';
import { DOCKER_CA_DELAY, DOCKER_DEFAULT } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import delay = Utils.delay;
import changeOwnerShipWithPassword = Utils.changeOwnerShipWithPassword;
import changeOwnership = Utils.changeOwnership;
import getDockerComposePath = Utils.getDockerComposePath;
import { Network } from '../../models/network';

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export class DockerComposeCaGenerator extends BaseGenerator {
  contents = `
version: '2'

networks:
  ${this.options.composeNetwork}:
    external: true

services:
  ${this.options.org.caName}:
    container_name: ${this.options.org.caName}
    image: hyperledger/fabric-ca:${this.network.options.hyperledgerCAVersion}
    command: sh -c 'fabric-ca-server start -d -b ${this.options.org.ca.options.user}:${this.options.org.ca.options.password} --port ${this.options.org.ca.options.port} --cfg.identities.allowremove'
    environment:
      - FABRIC_CA_SERVER_HOME=/tmp/hyperledger/fabric-ca/crypto
      - FABRIC_CA_SERVER_CA_NAME=${this.options.org.caName}
      - FABRIC_CA_SERVER_TLS_ENABLED=${this.options.org.isSecure}
      - FABRIC_CA_SERVER_CSR_CN=${this.options.org.caCn}
      - FABRIC_CA_SERVER_CSR_HOSTS=0.0.0.0
      - FABRIC_CA_SERVER_DEBUG=true
    ports:
      - "${this.options.org.ca.options.port}:${this.options.org.ca.options.port}"
    volumes:
      - ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}:/tmp/hyperledger/fabric-ca
    networks:
      - ${this.options.composeNetwork}    
  `;

  /**
   *
   * @param filename
   * @param path
   * @param network
   * @param options
   * @param dockerEngine
   */
  constructor(filename: string,
              path: string,
              private network: Network,
              private options?: DockerComposeYamlOptions,
              private readonly dockerEngine?: DockerEngine) {
    super(filename, getDockerComposePath(options.networkRootPath));

    if (!this.dockerEngine) {
      this.dockerEngine = new DockerEngine({ host: DOCKER_DEFAULT.IP as string, port: DOCKER_DEFAULT.PORT });
    }
  }

  async startTlsCa() {
    try {
      await this.dockerEngine.composeOne(`${this.options.org.caName}`, { cwd: this.path, config: this.filename });
      await changeOwnership(`${this.options.networkRootPath}/${this.options.org.name}`);
    } catch (err) {
      e(err);
    }
  }

  /**
   * Start the CA container.
   * If already one exists stop it and restart the new one
   */
  async startOrgCa(): Promise<Boolean> {
    try {
      const caIsRunning = await this.dockerEngine.doesContainerExist(`${this.options.org.caName}`);
      if (caIsRunning) {
        l('CA container is already running');
        return true;
      }

      await this.dockerEngine.composeOne(`${this.options.org.caName}`, { cwd: this.path, config: this.filename });

      // Check the container is running
      await delay(DOCKER_CA_DELAY);
       const isCaRunning = await this.dockerEngine.doesContainerExist(`${this.options.org.caName}`);
       if(!isCaRunning) {
         d('CA container not yet running - waiting more');
         await delay(DOCKER_CA_DELAY * 2);
       }
      d('CA running');

      // check if CA crypto generated
      // await changeOwnerShipWithPassword(`${this.options.networkRootPath}`);
      // await this.changeOwnerShipWithPassword(`${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}`);
      // await this.changeOwnership(`${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}`);

      // d('Folder OwnerShip updated successfully');

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  /**
   * Stop the CA container.
   */
  async stopOrgCa(): Promise<Boolean> {
    try {
      const caIsRunning = await this.dockerEngine.doesContainerExist(`${this.options.org.caName}`);
      if (!caIsRunning) {
        l(`CA ${this.options.org.caName} container is not running`);
        return true;
      }

      return await this.dockerEngine.stopContainer(`${this.options.org.caName}`, true);
    } catch (err) {
      e(err);
      return false;
    }
  }
}
