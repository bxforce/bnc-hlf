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

import { ChannelRequest, Orderer, Peer } from 'fabric-client';
import { ensureFile } from 'fs-extra';
import * as fs from 'fs';
import { ClientConfig, ClientHelper } from './helpers';
import { d, e } from '../../utils/logs';
import Client = require('fabric-client');
import {channelTimeout} from '../../utils/constants';

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

      e(` Failed to create the channel ${channelName}`);
      return false;
    } catch (err) {
      e(`Exception while creating the channel ${channelName}`);
      e(err);
      return false;
    }
  }

   async joinChannel (channel_name,org_name, peers ) : Promise<Boolean> {
    d('\n\n============ Join Channel start ============\n');
    let error_message = null;
    let all_eventhubs = [];
    try {
      d('Calling peers in organization "%s" to join the channel');

      d(`Successfully got the fabric client for the organization ${org_name}`);
      console.log('before')
      //let channel = this.client.getChannel(channel_name);
      let channel = this.client.newChannel(channel_name);
      channel.addOrderer(this.orderers[0]);
      console.log('hhhhhhhhhh', this.peers[0])
      channel.addPeer(this.peers[0], this.config.userMsp);

      console.log('after')
      if(!channel) {
        e('Channel NOT  found ')
        d(`Channel %s was not defined in the connection profile ${channel_name}`);

        return false;
      }
      // next step is to get the genesis_block from the orderer,
      // the starting point for the channel that we want to join
      let request = {
        txId : 	this.client.newTransactionID(true) //get an admin based transactionID
      };

      let genesis_block = await channel.getGenesisBlock(request);

      // tell each peer to join and wait 10 seconds
      // for the channel to be created on each peer
      let promises = [];
      promises.push(new Promise(resolve => setTimeout(resolve, channelTimeout)));

      let join_request = {
        targets: peers, //using the peer names which only is allowed when a connection profile is loaded
        txId: this.client.newTransactionID(true), //get an admin based transactionID
        block: genesis_block
      };
      let join_promise = channel.joinChannel(join_request);
      promises.push(join_promise);
      let results = await Promise.all(promises);
      d(`'Join Channel R E S P O N S E : %j' ${results}`);

      // lets check the results of sending to the peers which is
      // last in the results array
      let peers_results = results.pop();
      // then each peer results
      for(let i in peers_results) {
        let peer_result = peers_results[i];
        if (peer_result instanceof Error) {
          e(`Failed to join peer to the channel with error  ${peer_result.toString()}`);

        } else if(peer_result.response && peer_result.response.status == 200) {
          d(`Successfully joined peer to the channel ${channel_name}`);
        } else {
          e(`Failed to join peer to the channel , ${channel_name}`);

        }
      }
    } catch(error) {
      e(`Failed to join channel due to error:  ${error}`);
      error_message = error.toString();
    }

    // need to shutdown open event streams
    all_eventhubs.forEach((eh) => {
      eh.disconnect();
    });

    if (!error_message) {
      d(`Successfully joined peers in organization %s to the channel 
          ${org_name}  ${channel_name}`);

      // build a response to send back to the REST caller
      return true;
    } else {
      e(`Failed to join all peers to channel. cause:%s ${error_message}`);

      // build a response to send back to the REST caller
      return false;
    }
  };


  /**
   * Load the list of orderer from the config file
   */
  private async _loadOrderersFromConfig(): Promise<void> {
    // @ts-ignore
    const { orderers } = this.config.networkProfile;
    for(const key in orderers) {
      if(key) {
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


  private async _loadPeersFromConfig(): Promise<void> {
    // @ts-ignore
    console.log('loading peers')
    const { peers } = this.config.networkProfile;
    for(const key in peers) {
      if(key) {
        console.log('keeeeey', key)
        const peer = this.client.getPeer(key);
        console.log(peer)

        // store the orderer instance in the class field
        this.peers.push(peer);
      }
    }
  }

}
