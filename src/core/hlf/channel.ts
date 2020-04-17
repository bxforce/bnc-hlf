/**
 * Copyright 2017 Kapil Sachdeva All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as helper from './helper';
import { ChannelEventHub, Peer, ProposalResponse, ChaincodeInvokeRequest,
  ChaincodeQueryRequest, ChannelInfo } from 'fabric-client';

//const logger = helper.getLogger('ChannelApi');
// tslint:disable-next-line:no-var-requires

//Jim
//Org1
//network-config.yaml
//org1.yaml
//artifacts/channel/mychannel.tx
//artifacts/channel/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt

export async function createChannel(channelName, channelConfigPath, orgName) {
  console.log('\n====== Creating Channel \'' + channelName + '\' ======\n');
  try {
    // first setup the client for this org
    var client = await helper.getClientForOrg(orgName);
    console.log('Successfully got the fabric client for the organization "%s"', orgName);

    // read in the envelope for the channel config raw bytes
    var envelope = fs.readFileSync(path.join(__dirname,'../', channelConfigPath));
    // extract the channel config bytes from the envelope to be signed
    var channelConfig = client.extractChannelConfig(envelope);

    //Acting as a client in the given organization provided with "orgName" param
    // sign the channel config bytes as "endorsement", this is required by
    // the orderer's channel creation policy
    // this will use the admin identity assigned to the client when the connection profile was loaded
    let signature = client.signChannelConfig(channelConfig);

    let request = {
      config: channelConfig,
      signatures: [signature],
      name: channelName,
      txId: client.newTransactionID(true) // get an admin based transactionID
    };

    // send to orderer
    var response = await client.createChannel(request)
    console.log(' response ::%j', response);
    if (response && response.status === 'SUCCESS') {
      console.log('Successfully created the channel.');
      let response = {
        success: true,
        message: 'Channel \'' + channelName + '\' created Successfully'
      };
      return response;
    } else {
      console.log('\n!!!!!!!!! Failed to create the channel \'' + channelName +
        '\' !!!!!!!!!\n\n');
      throw new Error('Failed to create the channel \'' + channelName + '\'');
    }
  } catch (err) {
    console.log('Failed to initialize the channel: ' + err.stack ? err.stack :	err);
    throw new Error('Failed to initialize the channel: ' + err.toString());
  }
};

