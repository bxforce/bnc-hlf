
import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as helper from './helper';
import { ChannelEventHub, Peer, ProposalResponse, ChaincodeInvokeRequest,
  ChaincodeQueryRequest, ChannelInfo } from 'fabric-client';


import {l, d, e } from '../../utils/logs';


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


export async function joinChannel (channel_name, peers, org_name) {
  l('\n\n============ Join Channel start ============\n');
  var error_message = null;
  var all_eventhubs = [];
  try {
    l('Calling peers in organization "%s" to join the channel');

    // first setup the client for this org
    var client = await helper.getClientForOrg(org_name);
    l('Successfully got the fabric client for the organization "%s"');
    var channel = client.getChannel(channel_name);
    if(!channel) {
      l('no channle found ')
      let message = util.format('Channel %s was not defined in the connection profile', channel_name);
      l(message);
      throw new Error(message);
    }
    // next step is to get the genesis_block from the orderer,
    // the starting point for the channel that we want to join
    let request = {
      txId : 	client.newTransactionID(true) //get an admin based transactionID
    };

    let genesis_block = await channel.getGenesisBlock(request);

    // tell each peer to join and wait 10 seconds
    // for the channel to be created on each peer
    var promises = [];
    promises.push(new Promise(resolve => setTimeout(resolve, 10000)));

    let join_request = {
      targets: peers, //using the peer names which only is allowed when a connection profile is loaded
      txId: client.newTransactionID(true), //get an admin based transactionID
      block: genesis_block
    };
    let join_promise = channel.joinChannel(join_request);
    promises.push(join_promise);
    let results = await Promise.all(promises);
    console.log(util.format('Join Channel R E S P O N S E : %j', results));

    // lets check the results of sending to the peers which is
    // last in the results array
    let peers_results = results.pop();
    // then each peer results
    for(let i in peers_results) {
      let peer_result = peers_results[i];
      if (peer_result instanceof Error) {
        error_message = util.format('Failed to join peer to the channel with error :: %s', peer_result.toString());
        e(error_message);
      } else if(peer_result.response && peer_result.response.status == 200) {
        l('Successfully joined peer to the channel %s');
      } else {
        error_message = util.format('Failed to join peer to the channel %s',channel_name);
        e(error_message);
      }
    }
  } catch(error) {
    console.log('Failed to join channel due to error: ' + error.stack ? error.stack : error);
    error_message = error.toString();
  }

  // need to shutdown open event streams
  all_eventhubs.forEach((eh) => {
    eh.disconnect();
  });

  if (!error_message) {
    let message = util.format(
      'Successfully joined peers in organization %s to the channel:%s',
      org_name, channel_name);
    l(message);
    // build a response to send back to the REST caller
    const response = {
      success: true,
      message: message
    };
    return response;
  } else {
    let message = util.format('Failed to join all peers to channel. cause:%s',error_message);
    e(message);
    // build a response to send back to the REST caller
    const response = {
      success: false,
      message: message
    };
    return response;


  }


};

