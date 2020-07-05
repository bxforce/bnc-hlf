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
import { e, l } from '../../utils/logs';
import { ClientConfig } from '../../core/hlf/helpers';
import { Channels } from '../../core/hlf/channels';
import { SysWrapper } from '../../utils/sysWrapper';
import existsPath = SysWrapper.existsPath;
import { Utils } from '../../utils/utils';
import getPropertiesPath = Utils.getPropertiesPath;
import { X509Identity } from 'fabric-network';
import { User } from '../../models/user';
import { DEFAULT_CA_ADMIN } from '../../utils/constants';
import getPeerMspPath = Utils.getPeerMspPath;

/**
 * Class responsible to create the hyperledger fabric channel instance
 *
 * @author wassim.znaidi@gmail.com
 */
export class ChannelGenerator extends BaseGenerator {
  /* connection profile content to load the client instance */
  contents = `
version: "1.0"

client:
  organization: ${this.network.organizations[0].name}
  credentialStore:
    path: ${this.network.options.networkConfigPath}/wallets/organizations/${this.network.organizations[0].fullName}
    cryptoStore:
      path: ${this.network.options.networkConfigPath}/wallets/organizations/${this.network.organizations[0].fullName}

peers:
${this.network.organizations[0].peers.map((peer, index) => `
  ${peer.name}.${this.network.organizations[0].fullName}:
    url: grpc${this.network.organizations[0].isSecure ? 's' : ''}://${this.network.organizations[0].engineHost(peer.options.engineName)}:${peer.options.ports[0]}
    grpcOptions:
      ssl-target-name-override: ${peer.name}.${this.network.organizations[0].fullName}
      request-timeout: 120001
      grpc.keepalive_time_ms: 600000
    tlsCACerts:
      path: ${getPeerMspPath(this.network.options.networkConfigPath, this.network.organizations[0], peer)}/tlscacerts/tlsca.${this.network.organizations[0].fullName}-cert.pem
`).join('')}

orderers:
    ${this.network.ordererOrganization.orderers[0].name}.${this.network.ordererOrganization.domainName}:
      url: grpcs://localhost:${this.network.ordererOrganization.orderers[0].options.ports[0]}
      grpcOptions:
        ssl-target-name-override: ${this.network.ordererOrganization.orderers[0].name}.${this.network.ordererOrganization.domainName}
        grpc-max-send-message-length: 40000
      tlsCACerts:
        path: ${this.network.options.networkConfigPath}/organizations/ordererOrganizations/${this.network.organizations[0].domainName}/tlsca/tlsca.${this.network.ordererOrganization.domainName}-cert.pem
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
  async joinChannel(channelName: string, peers: string[]): Promise<boolean> {
    try {
      l(`Start channel (${channelName}) join...`);

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
      const isJoined = await channelClient.joinChannel(channelName, this.network.organizations[0].mspName, peers);
      if(!isJoined) {
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
}
