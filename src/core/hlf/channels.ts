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

import { ChannelRequest, Orderer } from 'fabric-client';
import { ensureFile } from 'fs-extra';
import * as fs from 'fs';
import { ClientConfig, ClientHelper } from './helpers';
import { d, e } from '../../utils/logs';

/**
 *
 * @author sahar.fehri@irt-systemx.fr
 * @author wassim.znaidi@gmail.com
 */
export class Channels extends ClientHelper {
  public orderers: Orderer[];

  constructor(public config: ClientConfig) {
    super(config);
  }

  /**
   * Initialize the fabric client from the config
   */
  async init() {
    await super.init();
  }

  /**
   * Create a channel
   * @param channelName
   * @param channelConfigPath
   */
  async createChannel(channelName: string, channelConfigPath: string): Promise<boolean> {
    try {
      // ensure the channel config path
      await ensureFile(channelConfigPath);

      // read in the envelope for the channel config raw bytes & extract
      let envelope = fs.readFileSync(channelConfigPath);
      let channelConfig = this.client.extractChannelConfig(envelope);

      // Acting as a client in the given organization provided with "orgName" param
      // sign the channel config bytes as "endorsement", this is required by
      // the orderer's channel creation policy
      // this will use the admin identity assigned to the client when the connection profile was loaded
      let signature = this.client.signChannelConfig(channelConfig);

      let request: ChannelRequest = {
        config: channelConfig,
        orderer: this.orderers[0],
        signatures: [signature],
        name: channelName,
        txId: this.client.newTransactionID(true) // get an admin based transactionID
      };

      // send to orderer
      let response = await this.client.createChannel(request);
      if (response && response.status === 'SUCCESS') {
        d('Successfully created the channel.');
        return true;
      }

      e(` Failed to create the channel ${channelName}`);
      return false;
    } catch (err) {
      e(`Exception while creating the channel ${channelName}`);
      e(err);
      return false;
    }
  }

  /**
   * Load the list of orderer from the config file
   */
  private async loadOrderersFromConfig() {
    const orderers = this.client.getConfigSetting('orderers');
    for(const key in orderers) {
      if(key) {
        const url = orderers[key].url;
        const sslTargetOverride = orderers[key].grpcOptions[' ssl-target-name-override'];

        // read the CA Certs root
        const caRootPath = orderers[key].tlsCACerts.path;
        const data = fs.readFileSync(caRootPath);
        const caRoots = Buffer.from(data).toString();
        const orderer = this.client.newOrderer(url, {
          'pem': caRoots,
          'ssl-target-name-override': sslTargetOverride
        });

        orderers.push(orderer);
      }
    }
  }

}
