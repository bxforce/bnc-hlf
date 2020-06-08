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
import { Network } from '../../models/network';
import changeOwnerShipWithPassword = Utils.changeOwnerShipWithPassword;
import changeOwnership = Utils.changeOwnership;
import getDockerComposePath = Utils.getDockerComposePath;

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export class DockerComposeCaOrdererGenerator extends BaseGenerator {
  private readonly caName?: string;
  private readonly rootPath?: string;

  contents = `
version: '2'

networks:
  ${this.options.composeNetwork}:
    external: true

services:
  ${this.network.ordererOrganization.caName}:
    container_name: ${this.network.ordererOrganization.caName}
    image: hyperledger/fabric-ca
    command: sh -c 'fabric-ca-server start -d -b ${this.network.ordererOrganization.ca.options.user}:${this.network.ordererOrganization.ca.options.password} --port ${this.network.ordererOrganization.ca.options?.ports} --cfg.identities.allowremove'
    environment:
      - FABRIC_CA_SERVER_HOME=/tmp/hyperledger/fabric-ca/crypto
      - FABRIC_CA_SERVER_CA_NAME=${this.network.ordererOrganization.caName}
      - FABRIC_CA_SERVER_TLS_ENABLED=${this.network.ordererOrganization.isSecure}
      - FABRIC_CA_SERVER_CSR_CN=ca.tls
      - FABRIC_CA_SERVER_CSR_HOSTS=0.0.0.0
      - FABRIC_CA_SERVER_DEBUG=true
    ports:
      - "${this.network.ordererOrganization.ca.options.ports}:${this.network.ordererOrganization.ca.options.ports}"
    volumes:
      - ${this.network.options.networkConfigPath}/organizations/fabric-ca/${this.network.ordererOrganization.name}:/tmp/hyperledger/fabric-ca
    networks:
      - ${this.options.composeNetwork}    
  `;

  /**
   * Constructor
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

    this.caName = this.network.ordererOrganization.caName;
    this.rootPath = this.network.options.networkConfigPath;

    if (!this.dockerEngine) {
      this.dockerEngine = new DockerEngine({ host: DOCKER_DEFAULT.IP as string, port: DOCKER_DEFAULT.PORT });
    }
  }

  /**
   *
   */
  async startTlsCa(): Promise<boolean> {
    try {
      await this.dockerEngine.composeOne(`${this.caName}`, { cwd: this.path, config: this.filename });
      await changeOwnership(`${this.rootPath}`);

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  /**
   * Start the CA container.
   * If already one exists stop it and restart the new one
   */
  async startOrdererCa(): Promise<boolean> {
    try {
      const caIsRunning = await this.dockerEngine.doesContainerExist(`${this.caName}`);
      if (caIsRunning) {
        l(`CA container (${this.caName}) is already running`);
        return true;
      }

      await this.dockerEngine.composeOne(`${this.caName}`, { cwd: this.path, config: this.filename });

      // Check the container is running
      await delay(DOCKER_CA_DELAY);
      const isCaRunning = await this.dockerEngine.doesContainerExist(`${this.network.ordererOrganization.caName}`);
      if (!isCaRunning) {
        d('CA container not yet running - waiting more');
        await delay(DOCKER_CA_DELAY * 2);
      }
      d('CA running');

      // check if CA crypto generated
      await changeOwnerShipWithPassword(`${this.options.networkRootPath}`);
      // await this.changeOwnerShipWithPassword(`${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}`);
      // await this.changeOwnership(`${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}`);

      d('Folder OwnerShip updated successfully');

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

}
