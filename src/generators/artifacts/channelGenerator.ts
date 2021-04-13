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

import { X509Identity } from 'fabric-network';
import { BaseGenerator } from '../base';
import { AdminCAAccount } from '../crypto/createOrgCerts';
import { ClientConfig } from '../../core/hlf/client';
import { Channels } from '../../core/hlf/channels';
import { Network } from '../../parser/model/network';
import { User } from '../../parser/model/user';
import { DEFAULT_CA_ADMIN, GENESIS_FILE_NAME} from '../../utils/constants';
import { Utils } from '../../utils/helper';
import getPeerMspPath = Utils.getPeerMspPath;
import getPropertiesPath = Utils.getPropertiesPath;
import getHlfBinariesPath = Utils.getHlfBinariesPath;
import getNewOrgRequestPath = Utils.getNewOrgRequestPath;
import getAddOrdererRequestPath = Utils.getAddOrdererRequestPath;
import getArtifactsPath = Utils.getArtifactsPath;
import { Configtxlator } from '../../utils/configtxlator';
import { CHANNEL_RAFT_ID, GENESIS_ORDERER_FILE_NAME } from '../../utils/constants';

import { SysWrapper } from '../../utils/sysWrapper';
import createFile = SysWrapper.createFile;
import copyFile = SysWrapper.copyFile;
import { e, l } from '../../utils/logs';

/**
 * Class responsible to create the hyperledger fabric channel instance
 *
 * @author wassim.znaidi@gmail.com
 */
export class ChannelGenerator extends BaseGenerator {
  /* connection profile content to load the client instance */
  contents = `
version: "1.0"
name: ${this.network.organizations[0].domainName}
client:
  organization: ${this.network.organizations[0].name}
  credentialStore:
    path: ${this.network.options.networkConfigPath}/wallets/organizations/${this.network.organizations[0].fullName}
    cryptoStore:
      path: ${this.network.options.networkConfigPath}/wallets/organizations/${this.network.organizations[0].fullName}
organizations:
    ${this.network.organizations[0].name}:
      mspid: ${this.network.organizations[0].mspName}
      peers:
      ${this.network.organizations[0].peers.map((peer, index) => `
        - ${peer.name}.${this.network.organizations[0].fullName}`).join('')}
peers:
${this.network.organizations[0].peers.map((peer, index) => `
  ${peer.name}.${this.network.organizations[0].fullName}:
    url: grpc${this.network.organizations[0].isSecure ? 's' : ''}://${peer.name}.${this.network.organizations[0].fullName}:${peer.options.ports[0]}
    grpcOptions:
      ssl-target-name-override: ${peer.name}.${this.network.organizations[0].fullName}
      request-timeout: 120001
      grpc.keepalive_time_ms: 600000
    tlsCACerts:
      path: ${getPeerMspPath(this.network.options.networkConfigPath, this.network.organizations[0], peer)}/tlscacerts/tlsca.${this.network.organizations[0].fullName}-cert.pem
`).join('')}

orderers:
    ${this.network.organizations[0].orderers[0].name}.${this.network.ordererOrganization[0].domainName}:
      url: grpc${this.network.organizations[0].isSecure ? 's' : ''}://${this.network.organizations[0].orderers[0].fullName}:${this.network.ordererOrganization[0].orderers[0].options.ports[0]}
      grpcOptions:
        ssl-target-name-override: ${this.network.ordererOrganization[0].orderers[0].name}.${this.network.ordererOrganization[0].domainName}
        grpc-max-send-message-length: 40000
      tlsCACerts:
        path: ${this.network.options.networkConfigPath}/organizations/ordererOrganizations/${this.network.organizations[0].fullName}/tlsca/tlsca.${this.network.ordererOrganization[0].domainName}-cert.pem
  
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
              private admin: AdminCAAccount = { name: DEFAULT_CA_ADMIN.name , password: DEFAULT_CA_ADMIN.password }) {
    super(filename, getPropertiesPath(path));
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
      const configExists = await SysWrapper.existsPath(channelConfigPath);
      if(!configExists) {
        e(`Channel configuration file (${channelConfigPath}) does not exists`);
        return false;
      }

      // store the connection profile
      await this.save();

      // Initiate the channel entity
      const clientConfig: ClientConfig = { networkProfile: this.filePath };
      const channelClient = new Channels(clientConfig);
      await channelClient.init();

      // load the admin user into the client
      const adminLoaded = await this._loadOrgAdminAccount(channelClient, channelClient.client.getClientConfig().organization);
      if(!adminLoaded) {
        e('[Channel]: Not able to load the admin account into the channel client instance -- exit !!!');
        return false;
      }

      // create the provided channel
      const isCreated = await channelClient.createChannel(channelName, channelConfigPath);
      if(!isCreated) {
        e(`Error channel (${channelName}) creation !!!`);
        return false;
      }

      l(`Channel (${channelName}) creation successfully !!!`);
      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  /**
   *
   * @param channelName
   * @param peers
   */
  async joinChannel(channelName: string): Promise<boolean> {
    try {
      l(`Start channel (${channelName}) join...`);

      // store the connection profile
      await this.save();

      // Initiate the channel entity
      const clientConfig: ClientConfig = { networkProfile: this.filePath };
      const channelClient = new Channels(clientConfig);
      await channelClient.init();

      // load the admin user into the client
      const adminLoaded = await this._loadOrgAdminAccount(channelClient, channelClient.client.getClientConfig().organization);
      if(!adminLoaded) {
        e('[Channel]: Not able to load the admin account into the channel client instance -- exit !!!');
        return false;
      }

      // create the provided channel
      const isJoined = await channelClient.joinChannel(channelName, this.network.organizations[0].mspName);
      if(!isJoined) {
        e(`Error channel (${channelName}) join !!!`);
        return false;
      }

      l(`Channel (${channelName}) join successfully !!!`);
      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  async updateChannel(channelName: string, anchorConfigPath: string): Promise<boolean> {
    try {
      l(`Start channel (${channelName}) update...`);

      // check if channel configuration file exists
      const configExists = await SysWrapper.existsPath(anchorConfigPath);
      if(!configExists) {
        e(`Channel configuration file (${anchorConfigPath}) does not exists`);
        return false;
      }

      // store the connection profile
      await this.save();

      // Initiate the channel entity
      const clientConfig: ClientConfig = { networkProfile: this.filePath };
      const channelClient = new Channels(clientConfig);
      await channelClient.init();

      // load the admin user into the client
      const adminLoaded = await this._loadOrgAdminAccount(channelClient, channelClient.client.getClientConfig().organization);
      if(!adminLoaded) {
        e('[Channel]: Not able to load the admin account into the channel client instance -- exit !!!');
        return false;
      }

      // update the provided channel
      let sig= await channelClient.signConfig(anchorConfigPath);
      const isUpdated = await channelClient.submitChannelUpdate(anchorConfigPath, [sig], channelName, this.network.organizations[0].mspName);
      if(!isUpdated) {
        e(`Error channel (${channelName}) update !!!`);
        return false;
      }

      l(`Channel (${channelName}) updated successfully !!!`);
      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }


  async addNewOrdererOrganization(orgDefinitionPath, nameChannel){
    l(`Fetching latest channel definition!!!`);
    console.log(nameChannel)

    // Initiate the channel entity
    const clientConfig: ClientConfig = { networkProfile: this.filePath };
    const channelClient = new Channels(clientConfig);
    await channelClient.init();

    // if nameChannel undefined then load admin orderer to get the system channel instead
    let adminLoaded;
    if(!nameChannel){
      console.log("loading orderer account to modify system channel")
      adminLoaded = await this._loadOrgAdminAccountOrderer(channelClient, channelClient.client.getClientConfig().organization);
    } else {
      adminLoaded = await this._loadOrgAdminAccount(channelClient, channelClient.client.getClientConfig().organization);
    }

    if(!adminLoaded) {
      e('[Channel]: Not able to load the admin account into the channel client instance -- exit !!!');
      return false;
    }

    let currentChannelName = nameChannel? nameChannel: CHANNEL_RAFT_ID;

    try{
      let envelope = await channelClient.getLatestChannelConfigFromOrderer(currentChannelName, this.network.organizations[0].mspName);
      const configtxlator = new Configtxlator(getHlfBinariesPath(this.network.options.networkConfigPath, this.network.options.hyperledgerVersion), this.network.options.networkConfigPath);
      await configtxlator.createInitialConfigPb(envelope);
      await configtxlator.convert(configtxlator.names.initialPB, configtxlator.names.initialJSON, configtxlator.protobufType.config, configtxlator.convertType.decode)

      let original = await configtxlator.getFile(configtxlator.names.initialJSON);
      let modified = await configtxlator.getFile(configtxlator.names.initialJSON);

      let newOrgDefinition = await SysWrapper.readFile(orgDefinitionPath);
      let newOrgJsonDef = JSON.parse(newOrgDefinition);
      let newOrgMSP= newOrgJsonDef.policies.Admins.policy.value.identities[0].principal.msp_identifier;
      let ordererOrgName = newOrgMSP.slice(0, newOrgMSP.length - 3);
      console.log("before", JSON.stringify(modified))
      if(nameChannel){
        console.log('Acting on application channel')
        modified.channel_group.groups.Orderer.groups[`${ordererOrgName}`] = newOrgJsonDef;

      } else {
        console.log('manipulating system channel')
        // add into system channel
        modified.channel_group.groups.Orderer.groups[`${ordererOrgName}`] = newOrgJsonDef;
      }

      console.log("after", JSON.stringify(modified))

      //save modified.json FILE
      await configtxlator.saveFile(configtxlator.names.modifiedJSON, JSON.stringify(modified))
      //convert it to modified.pb
      await configtxlator.convert(configtxlator.names.modifiedJSON, configtxlator.names.modifiedPB, configtxlator.protobufType.config, configtxlator.convertType.encode)

      //calculate delta between config.pb and modified.pb
      await configtxlator.calculateDeltaPB(configtxlator.names.initialPB, configtxlator.names.modifiedPB, configtxlator.names.deltaPB, currentChannelName);

      //convert the delta.pb to json
      await configtxlator.convert(configtxlator.names.deltaPB, configtxlator.names.deltaJSON, configtxlator.protobufType.update, configtxlator.convertType.decode)
      //get the delta json file to add the header

      let deltaJSON = await configtxlator.getFile(configtxlator.names.deltaJSON);

      let config_update_as_envelope_json = {
        "payload": {
          "header": {
            "channel_header": {
              "channel_id": currentChannelName,
              "type": 2
            }
          },
          "data": {
            "config_update": deltaJSON
          }
        }
      }
      //save the new delta.json
      await configtxlator.saveFile(configtxlator.names.deltaJSON, JSON.stringify(config_update_as_envelope_json))
      await configtxlator.convert(configtxlator.names.deltaJSON, configtxlator.names.deltaPB, configtxlator.protobufType.envelope, configtxlator.convertType.encode)
      //copy the final delta pb under artifacts
    //  await configtxlator.copyFile(configtxlator.names.deltaPB, `${getNewOrgRequestPath(this.network.options.networkConfigPath, currentChannelName)}/${configtxlator.names.finalPB}`)
      await configtxlator.copyFile(configtxlator.names.deltaPB, `${getAddOrdererRequestPath(this.network.options.networkConfigPath, currentChannelName)}/${configtxlator.names.finalPB}`)


      await configtxlator.clean();
      console.log('saved to path, ', `${getAddOrdererRequestPath(this.network.options.networkConfigPath, currentChannelName)}/${configtxlator.names.finalPB}`)

    }catch (err) {
      e(err);
      e("ERROR generating new channel DEF")
      return err;
    }
  }


  async generateCustomChannelDef(orgDefinitionPath, anchorDefPAth, nameChannel){
    l(`Fetching latest channel definition on  (${nameChannel}) !!!`);

    // Initiate the channel entity
    const clientConfig: ClientConfig = { networkProfile: this.filePath };
    const channelClient = new Channels(clientConfig);
    await channelClient.init();

    // if nameChannel undefined then load admin orderer to get the system channel instead
    let adminLoaded;
    if(!nameChannel){
      console.log("loading orderer account to modify system channel")
      adminLoaded = await this._loadOrgAdminAccountOrderer(channelClient, channelClient.client.getClientConfig().organization);
    } else {
      adminLoaded = await this._loadOrgAdminAccount(channelClient, channelClient.client.getClientConfig().organization);
    }

    if(!adminLoaded) {
      e('[Channel]: Not able to load the admin account into the channel client instance -- exit !!!');
      return false;
    }
    
    let currentChannelName = nameChannel? nameChannel: CHANNEL_RAFT_ID;

    try{
      let envelope = await channelClient.getLatestChannelConfigFromOrderer(currentChannelName, this.network.organizations[0].mspName);
      const configtxlator = new Configtxlator(getHlfBinariesPath(this.network.options.networkConfigPath, this.network.options.hyperledgerVersion), this.network.options.networkConfigPath);
      await configtxlator.createInitialConfigPb(envelope);
      await configtxlator.convert(configtxlator.names.initialPB, configtxlator.names.initialJSON, configtxlator.protobufType.config, configtxlator.convertType.decode)

      let original = await configtxlator.getFile(configtxlator.names.initialJSON);
      let modified = await configtxlator.getFile(configtxlator.names.initialJSON);

      let newOrgDefinition = await SysWrapper.readFile(orgDefinitionPath);
      let newOrgAnchorDefinition = await SysWrapper.readFile(anchorDefPAth);

      let newOrgJsonDef = JSON.parse(newOrgDefinition);
      let newOrgAnchorJson = JSON.parse(newOrgAnchorDefinition);
      let newOrgMSP= newOrgJsonDef.policies.Admins.policy.value.identities[0].principal.msp_identifier;

      if(nameChannel){
        console.log('Acting on application channel')
        modified.channel_group.groups.Application.groups[`${newOrgMSP}`] = newOrgJsonDef;

        let AnchorPeers = newOrgAnchorJson;

        let target = modified.channel_group.groups.Application.groups.org3MSP.values;
        let startAdded = {AnchorPeers, ...target}
       // console.log('modified before', JSON.stringify(modified))
        modified.channel_group.groups.Application.groups.org3MSP.values = startAdded
        console.log(JSON.stringify(modified))

      } else {
      console.log('manipulating system channel')
        // add into system channel
        modified.channel_group.groups.Consortiums.groups['BncConsortium'].groups[`${newOrgMSP}`] = newOrgJsonDef;
      }

      //save modified.json FILE
      await configtxlator.saveFile(configtxlator.names.modifiedJSON, JSON.stringify(modified))
      //convert it to modified.pb
      await configtxlator.convert(configtxlator.names.modifiedJSON, configtxlator.names.modifiedPB, configtxlator.protobufType.config, configtxlator.convertType.encode)

      //calculate delta between config.pb and modified.pb
      await configtxlator.calculateDeltaPB(configtxlator.names.initialPB, configtxlator.names.modifiedPB, configtxlator.names.deltaPB, currentChannelName);

      //convert the delta.pb to json
      await configtxlator.convert(configtxlator.names.deltaPB, configtxlator.names.deltaJSON, configtxlator.protobufType.update, configtxlator.convertType.decode)
      //get the delta json file to add the header

      let deltaJSON = await configtxlator.getFile(configtxlator.names.deltaJSON);

      let config_update_as_envelope_json = {
        "payload": {
          "header": {
            "channel_header": {
              "channel_id": currentChannelName,
              "type": 2
            }
          },
          "data": {
            "config_update": deltaJSON
          }
        }
      }
      //save the new delta.json
      await configtxlator.saveFile(configtxlator.names.deltaJSON, JSON.stringify(config_update_as_envelope_json))
      await configtxlator.convert(configtxlator.names.deltaJSON, configtxlator.names.deltaPB, configtxlator.protobufType.envelope, configtxlator.convertType.encode)
      //copy the final delta pb under artifacts
      if(nameChannel){
        await configtxlator.copyFile(configtxlator.names.deltaPB, `${getNewOrgRequestPath(this.network.options.networkConfigPath, currentChannelName)}/${configtxlator.names.finalPB}`)
        console.log('sent here', `${getNewOrgRequestPath(this.network.options.networkConfigPath, currentChannelName)}/${configtxlator.names.finalPB}`)
      }else{
        await configtxlator.copyFile(configtxlator.names.deltaPB, `${getAddOrdererRequestPath(this.network.options.networkConfigPath, currentChannelName)}/${configtxlator.names.finalPB}`)
        console.log('sent here', `${getAddOrdererRequestPath(this.network.options.networkConfigPath, currentChannelName)}/${configtxlator.names.finalPB}`)
      }
      
      await configtxlator.clean();

    }catch (err) {
      e(err);
      e("ERROR generating new channel DEF")
      return err;
    }
  }
  
  async addOrdererToChannel(ordererJson, nameOrderer, port, addTLS, addEnpoint, channelName){
    l(`Fetching latest channel definition on  (${channelName}) !!!`);
    // Initiate the channel entity
    const clientConfig: ClientConfig = { networkProfile: this.filePath };
    const channelClient = new Channels(clientConfig);
    await channelClient.init();
    let adminLoaded;
    adminLoaded = await this._loadOrgAdminAccountOrderer(channelClient, channelClient.client.getClientConfig().organization);

    if(!adminLoaded) {
      e('[Channel]: Not able to load the admin account into the channel client instance -- exit !!!');
      return false;
    }

    try{
      let envelope = await channelClient.getLatestChannelConfigFromOrderer(channelName, this.network.organizations[0].mspName);
      const configtxlator = new Configtxlator(getHlfBinariesPath(this.network.options.networkConfigPath, this.network.options.hyperledgerVersion), this.network.options.networkConfigPath);

      await configtxlator.createInitialConfigPb(envelope);
      await configtxlator.convert(configtxlator.names.initialPB, configtxlator.names.initialJSON, configtxlator.protobufType.config, configtxlator.convertType.decode)
      let original = await configtxlator.getFile(configtxlator.names.initialJSON);
      let modified = await configtxlator.getFile(configtxlator.names.initialJSON);
      if(addTLS){
        //add TLS to consenters
        modified.channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters.push(ordererJson)
        console.log('here', JSON.stringify(modified))
      }
      if (addEnpoint){
        let endpoint = `${nameOrderer}:${port}`
        modified.channel_group.values.OrdererAddresses.value.addresses.push(endpoint)
      }
      console.log("pooo", JSON.stringify(modified))
      //save modified.json FILE
      await configtxlator.saveFile(configtxlator.names.modifiedJSON, JSON.stringify(modified))
      //convert it to modified.pb
      await configtxlator.convert(configtxlator.names.modifiedJSON, configtxlator.names.modifiedPB, configtxlator.protobufType.config, configtxlator.convertType.encode)

       //calculate delta between config.pb and modified.pb
      await configtxlator.calculateDeltaPB(configtxlator.names.initialPB, configtxlator.names.modifiedPB, configtxlator.names.deltaPB, channelName);

       //convert the delta.pb to json
      await configtxlator.convert(configtxlator.names.deltaPB, configtxlator.names.deltaJSON, configtxlator.protobufType.update, configtxlator.convertType.decode)
       //get the delta json file to add the header

      let deltaJSON = await configtxlator.getFile(configtxlator.names.deltaJSON);

      let config_update_as_envelope_json = {
        "payload": {
          "header": {
            "channel_header": {
              "channel_id": channelName,
              "type": 2
            }
          },
          "data": {
            "config_update": deltaJSON
          }
        }
      }
      //save the new delta.json
      await configtxlator.saveFile(configtxlator.names.deltaJSON, JSON.stringify(config_update_as_envelope_json))
      await configtxlator.convert(configtxlator.names.deltaJSON, configtxlator.names.deltaPB, configtxlator.protobufType.envelope, configtxlator.convertType.encode)
      //copy the final delta pb under artifacts
      await configtxlator.copyFile(configtxlator.names.deltaPB, `${getAddOrdererRequestPath(this.network.options.networkConfigPath, channelName)}/${configtxlator.names.finalPB}`)
      await configtxlator.clean();
      console.log('##################', `${getAddOrdererRequestPath(this.network.options.networkConfigPath, channelName)}/${configtxlator.names.finalPB}`)

    }catch (err) {
      e(err);
      e("ERROR generating new channel DEF")
      return err;
    }
  }

  async signConfig(config, isOrdererReq, isSystemChannel){
    // Initiate the channel entity
    const clientConfig: ClientConfig = { networkProfile: this.filePath };
    const channelClient = new Channels(clientConfig);
    await channelClient.init();
    // load the admin user into the client
    let adminLoaded;
    if(isOrdererReq || isSystemChannel){
      console.log('load orderer admin')
      adminLoaded = await this._loadOrgAdminAccountOrderer(channelClient, channelClient.client.getClientConfig().organization);
    } else {
      adminLoaded = await this._loadOrgAdminAccount(channelClient, channelClient.client.getClientConfig().organization);
    }

    if(!adminLoaded) {
      e('[Channel]: Not able to load the admin account into the channel client instance -- exit !!!');
      return false;
    }

    try{
      let sig= await channelClient.signConfig(config);
      return sig
    }catch(err){
      e(err)
      return err;
    }
  }

  async submitChannelUpdate(config, sigs, nameChannel, addOrdererReq, isSystemChannel){
    // Initiate the channel entity
    const clientConfig: ClientConfig = { networkProfile: this.filePath };
    const channelClient = new Channels(clientConfig);
    await channelClient.init();
    
    let adminLoaded;
    // load the admin user into the client
    if(addOrdererReq || isSystemChannel){
      adminLoaded = await this._loadOrgAdminAccountOrderer(channelClient, channelClient.client.getClientConfig().organization);

    } else {
      adminLoaded = await this._loadOrgAdminAccount(channelClient, channelClient.client.getClientConfig().organization);

    }
  
    if(!adminLoaded) {
      e('[Channel]: Not able to load the admin account into the channel client instance -- exit !!!');
      return false;
    }

    try{
      //return signature
      let isSubmitted = await channelClient.submitChannelUpdate(config, sigs, nameChannel, this.network.organizations[0].mspName);
      if(!isSubmitted) {
        e(`Error channel update !!!`);
        return
      }

      l(`Channel  updated successfully !!!`);

    }catch(err){
      return err;
    }
  }

  /**
   * load the organization admin user into client context to operate channel task
   * @param channel
   * @param organizationName
   * @private
   */
  private async _loadOrgAdminAccount(channel: Channels, organizationName: string): Promise<boolean> {
    try {
      // check if org admin account exist on wallet
      const identity = await channel.wallet.getIdentity(`${organizationName}admin`);

      if(identity.type !== 'X.509') {
        e(`Identity type in the current wallet not supported (type ${identity.type})`);
        return false;
      }

      // cast the identity as X509 identity
      const adminIdentity: X509Identity = identity as X509Identity;
      const adminKey = adminIdentity.credentials.privateKey;
      const adminCert = adminIdentity.credentials.certificate;

      // Create user context
      const user = await channel.client.createUser({
        username: 'peer' + this.network.organizations[0].name + 'Admin',
        mspid: this.network.organizations[0].mspName,
        cryptoContent: {
          privateKeyPEM: adminKey,
          signedCertPEM: adminCert
        },
        skipPersistence: false
      });

      return true;
    } catch(err) {
      e(err);
      return false;
    }
  }

  private async _loadOrgAdminAccountOrderer(channel: Channels, organizationName: string): Promise<boolean> {
    try {
      // check if org admin account exist on wallet
      const identity = await channel.wallet.getIdentity(`${organizationName}Admin`);

      if(identity.type !== 'X.509') {
        e(`Identity type in the current wallet not supported (type ${identity.type})`);
        return false;
      }

      // cast the identity as X509 identity
      const adminIdentity: X509Identity = identity as X509Identity;
      const adminKey = adminIdentity.credentials.privateKey;
      const adminCert = adminIdentity.credentials.certificate;

      // Create user context
      const user = await channel.client.createUser({
        username: `${organizationName}Admin`,
        mspid: `${organizationName}MSP`,
        cryptoContent: {
          privateKeyPEM: adminKey,
          signedCertPEM: adminCert
        },
        skipPersistence: false
      });

      return true;
    } catch(err) {
      e(err);
      return false;
    }
  }
}
