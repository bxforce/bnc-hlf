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
import { Network } from '../../models/network';
import { AdminCAAccount } from '../crypto/createOrgCerts';
import { Orchestrator } from '../../orchestrator';
import { e, l } from '../../utils/logs';
import { ClientConfig } from '../../core/hlf/helpers';
import { Channels } from '../../core/hlf/channels';
import { SysWrapper } from '../../utils/sysWrapper';
import existsPath = SysWrapper.existsPath;

/**
 * Class responsible to create the hyperledger fabric channel instance
 *
 * @author wassim.znaidi@gmail.com
 */
export class ChannelGenerator extends BaseGenerator {
  /* connection profile content to load the client instance */
  contents = `
  name: "bnc"
x-type: "hlfv1"
description: "Blockchain network composer"
version: "1.0"

client:
  organization: ${this.network.ordererOrganization.name}
  credentialStore:
    path: ${this.network.options.networkConfigPath}/wallets/organizations/${this.network.ordererOrganization.fullName}
    cryptoStore:
      path: ${this.network.options.networkConfigPath}/wallets/organizations/${this.network.ordererOrganization.fullName}

orderers:
${this.network.organizations[0].orderers.map(orderer => `
    ${orderer.name}.${this.network.organizations[0].fullName}:
      url: grpcs://${this.network.organizations[0].engineHost(orderer.options.engineName)}:${orderer.options.ports[0]}
      grpcOptions:
        ssl-target-name-override: ${orderer.name}.${this.network.organizations[0].fullName}
        grpc-max-send-message-length: 15
      tlsCACerts:
        path: ${this.network.options.networkConfigPath}/organizations/ordererOrganizations/${this.network.organizations[0].domainName}/orderers/${this.network.organizations[0].ordererName(orderer)}/tls/ca.crt
`).join('')}
  `;

  /**
   *
   * @param filename
   * @param path
   * @param network
   * @param admin
   */
  constructor(filename: string,
              path: string,
              private network: Network,
              private admin: AdminCAAccount = { name: Orchestrator.defaultCAAdmin.name , password: Orchestrator.defaultCAAdmin.password }) {
    super(filename, path);
  }

  /**
   * Steup the selected channel
   * @param channelName channel name
   * @param channelConfigPath channel configuration (chanel.tx) file path
   */
  async setupChannel(channelName: string, channelConfigPath: string): Promise<boolean> {
    try {
      l(`Start channel (${channelName}) creation...`);

      // check if channel configuration file exists
      const configExists = await existsPath(channelConfigPath);
      if(!configExists) {
        e(`Channel configuration file (${channelConfigPath}) does not exists`);
        return false;
      }

      // store the connection profile
      await this.save();

      // Initiate the channel entity
      const clientConfig: ClientConfig = { networkProfile: this.filePath };
      const channelClient = new Channels(clientConfig);

      const isCreated = await channelClient.createChannel(channelName, channelConfigPath);
      if(!isCreated) {
        e(`Error channel (${channelName}) creation !!! `);
        return false;
      }

      l(`Channel (${channelName}) creation successfully !!!`);
      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }
}
