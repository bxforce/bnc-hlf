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

import * as util from 'util';
import { ChannelRequest, Orderer, Peer } from 'fabric-client';
import { ClientConfig, ClientHelper } from './client';
import { SysWrapper } from '../../utils/sysWrapper';
import { d, e, l } from '../../utils/logs';

import * as fs from 'fs'; // TODO: fix 
import { ensureFile } from 'fs-extra';

/**
 * Class responsible to manage HLF channel entity. Support currently:
 * - Create channel
 * - Join channel
 *
 * @author sahar.fehri@irt-systemx.fr
 * @author wassim.znaidi@gmail.com
 */
export class Channels extends ClientHelper {
  public orderers: Orderer[] = [];
  public peers: Peer[] = [];

  /**
   * Constructor
   * @param config
   */
  constructor(public config: ClientConfig) {
    super(config);
  }

  /**
   * Initialize the fabric client from the config
   */
  async init() {
    // initialize the client
    await super.init();

    // build the list of configured orderers
    await this._loadOrderersFromConfig();
    //build list of peers
    await this._loadPeersFromConfig();
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
      console.log(response);

      e(` Failed to create the channel ${channelName}`);
      return false;
    } catch (err) {
      e(`Exception while creating the channel ${channelName}`);
      e(err);
      return false;
    }
  }

  /**
   *
   * @param channelName
   * @param orgMspId
   * @param peers
   */
  async joinChannel(channelName: string, orgMspId: string): Promise<boolean> {
    try {
      d('Calling peers in organization "%s" to join the channel');
      d(`Successfully got the fabric client for the organization ${orgMspId}`);

      let channel = this.client.newChannel(channelName);
      channel.addOrderer(this.orderers[0]);
      for(const peer of this.peers) {
        channel.addPeer(peer, orgMspId);
      }

      if (!channel) {
        e('Error retrieving the channel instance');
        return false;
      }

      // next step is to get the genesis_block from the orderer,
      // the starting point for the channel that we want to join
      let request = {
        txId: this.client.newTransactionID()
      };

      const genesisBlock = await channel.getGenesisBlock(request);


      let joinRequest = {
        targets:this.peers,
        txId: this.client.newTransactionID(),
        block: genesisBlock
      };
      const results = await channel.joinChannel(joinRequest);

      d(this.peers)
      d(this.client.newTransactionID())
      d(genesisBlock)

      d("#####")

      d(util.format('Join Channel R E S P O N S E : %j', results));
      if (results[0] && results[0].response && results[0].response.status === 200) {
        l(util.format('Successfully joined peers in organization %s to the channel \'%s\'', orgMspId, channelName));
        return true;
      } else {
        e(' Failed to join channel');
        return false;
      }
    } catch (error) {
      e(`Failed to join channel due to error:  ${error}`);
      return false;
    }
  }

  async updateChannel (channelName,orgMspId, configUpdatePath): Promise<boolean> {
    var error_message = null;
    try {
      let channel = this.client.newChannel(channelName);
      channel.addOrderer(this.orderers[0]);
      for(const peer of this.peers) {
        channel.addPeer(peer, orgMspId);
      }

      if (!channel) {
        e('Error retrieving the channel instance');
        return false;
      }

      // read in the envelope for the channel config raw bytes
      var envelope = fs.readFileSync(configUpdatePath);
      // extract the channel config bytes from the envelope to be signed
      var channelConfig = this.client.extractChannelConfig(envelope);

      //Acting as a client in the given organization provided with "orgName" param
      // sign the channel config bytes as "endorsement", this is required by
      // the orderer's channel creation policy
      // this will use the admin identity assigned to the client when the connection profile was loaded
      let signature = this.client.signChannelConfig(channelConfig);

      let request = {
        orderer: this.orderers[0],
        config: channelConfig,
        signatures: [signature],
        name: channelName,
        txId: this.client.newTransactionID(true) // get an admin based transactionID
      };

      var promises = [];
      let event_hubs = channel.getChannelEventHubsForOrg();
      d(`found %s eventhubs for this organization : ${event_hubs.length}`);
      //we need to contruct array correspondant of the array of peer names

      event_hubs.forEach((eh) => {
          let anchorUpdateEventPromise = new Promise((resolve, reject) => {
            d('anchorUpdateEventPromise - setting up event');
            const event_timeout = setTimeout(() => {
              let message = 'REQUEST_TIMEOUT:' + eh.getPeerAddr();
              e(message);
              eh.disconnect();
            }, 60000);
            eh.registerBlockEvent((block) => {
                  l(`The config update has been committed on peer , ${eh.getPeerAddr()}`);
                  clearTimeout(event_timeout);
                  resolve();
                }, (err) => {
                  clearTimeout(event_timeout);
                  e(err);
                  reject(err);
                },
                {unregister: true, disconnect: true}
            );
            eh.connect();
          });
          promises.push(anchorUpdateEventPromise);
      });

      var sendPromise = this.client.updateChannel(request);
      // put the send to the orderer last so that the events get registered and
      // are ready for the orderering and committing
      promises.push(sendPromise);
      let results = await Promise.all(promises);
      d(util.format('Update Channel R E S P O N S E : %j', results));
      let response = results.pop(); //  orderer results are last in the results

      if (response) {
        if (response.status === 'SUCCESS') {
          l(`Successfully update anchor peers to the channel', ${channelName}`);
        } else {
          error_message = util.format('Failed to update anchor peers to the channel %s with status: %s reason: %s', channelName, response.status, response.info);
          e(error_message);
        }
      } else {
        error_message = util.format('Failed to update anchor peers to the channel %s', channelName);
        e(error_message);
      }
    } catch (error) {
      e(`Failed to update anchor peers due to error:   ${error}`);
      error_message = error.toString();
    }

    if (!error_message) {
      l(util.format(
          'Successfully update anchor peers in organization %s to the channel \'%s\'',
          channelName));
      return true;
    } else {
      let message = util.format('Failed to update anchor peers. cause:%s',error_message);
      e(message);
      return false;
    }

  }

  /**
   * Load the list of orderer from the config file
   */
  private async _loadOrderersFromConfig(): Promise<void> {
    // @ts-ignore
    const { orderers } = this.config.networkProfile;
    for (const key in orderers) {
      if (key) {
        // const url = orderers[key].url;
        // const sslTargetOverride = orderers[key].grpcOptions[' ssl-target-name-override'];
        //
        // // read the CA Certs root
        // const caRootPath = orderers[key].tlsCACerts.path;
        // const data = fs.readFileSync(caRootPath);
        // const caRoots = Buffer.from(data).toString();
        // const orderer = this.client.newOrderer(url, {
        //   'pem': caRoots,
        //   'ssl-target-name-override': sslTargetOverride
        // });

        // retrieve the orderer instance from the client
        // as already configured in the connection profile
        const orderer = this.client.getOrderer(key);

        // store the orderer instance in the class field
        this.orderers.push(orderer);
      }
    }
  }

  /**
   * Load the list of peers from connection profile
   * @private
   */
  private async _loadPeersFromConfig(): Promise<void> {
    // @ts-ignore
    const { peers } = this.config.networkProfile;
    for (const key in peers) {
      if (key) {
        const peer = this.client.getPeer(key);

        // store the orderer instance in the class field
        this.peers.push(peer);
      }
    }
  }

  /**
   *
   * @private
   * @param peersName
   */
  private async _getPeers(peersName: string[]): Promise<Peer[]> {
    const targets: Peer[] = [];
    for (const name of peersName) {
      targets.push(this.client.getPeer(name));
    }
    return targets;
  }
}
