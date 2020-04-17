

import log4js = require('log4js');
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import Client = require('fabric-client');
//import { User, UserOpts, Channel } from 'fabric-client';
// tslint:disable-next-line:no-var-requires
const copService = require('fabric-ca-client');

//const logger = log4js.getLogger('Helper');
//logger.setLevel('DEBUG');
//Client.setLogger(logger);
//var copService = require('fabric-ca-client');
var hfc = require('fabric-client');



//import config from './config';

const clients = {};
const channels = {};
const caClients = {};



export async function getClientForOrg (userorg) {
  console.log('getClientForOrg - ****** START %s %s', userorg)

  // get a fabric client loaded with a connection profile for this org
  //let config = '-connection-profile-path';

  // build a client context and load it with a connection profile
  // lets only load the network settings and save the client for later

  //let client = hfc.loadFromConfig(hfc.getConfigSetting('network'+config));

 let client = hfc.loadFromConfig('./network-config.yaml');   // ======>  else we get eerror no identity has been assigned to this client



  // This will load a connection profile over the top of the current one one
  // since the first one did not have a client section and the following one does
  // nothing will actually be replaced.
  // This will also set an admin identity because the organization defined in the
  // client section has one defined
  //client.loadFromConfig(hfc.getConfigSetting(userorg+config));
   client.loadFromConfig(`./${userorg.toLowerCase()}.yaml`);

  // this will create both the state store and the crypto store based
  // on the settings in the client section of the connection profile
  //await client.initCredentialStores();   ================> this is optional

  // The getUserContext call tries to get the user from persistence.
  // If the user has been saved to persistence then that means the user has
  // been registered and enrolled. If the user is found in persistence
  // the call will then assign the user to the client object.
 /* if(username) {
    let user = await client.getUserContext(username, true);
    if(!user) {
      throw new Error(util.format('User was not found :', username));
    } else {
      console.log('User %s was found to be registered and enrolled', username);
    }
  }

  */
  console.log('getClientForOrg - ****** END %s %s \n\n', userorg)

  return client;
}
