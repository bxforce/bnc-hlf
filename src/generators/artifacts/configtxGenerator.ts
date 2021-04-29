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
import { Network } from '../../parser/model/network';
import { CHANNEL_RAFT_ID, ConsensusType, GENESIS_FILE_NAME, BLOCK_SIZE } from '../../utils/constants';
import { Utils } from '../../utils/helper';
import getOrdererOrganizationRootPath = Utils.getOrdererOrganizationRootPath;
import getOrdererTlsRootPath = Utils.getOrdererTlsRootPath;
import getHlfBinariesPath = Utils.getHlfBinariesPath;
import getArtifactsPath = Utils.getArtifactsPath;
import getOrganizationMspPath = Utils.getOrganizationMspPath;
import { SysWrapper } from '../../utils/sysWrapper';
import {ConfigTxBatchOptions} from '../../utils/datatype';
import { e } from '../../utils/logs';

/**
 * Class Responsible to generate ConfigTx.yaml and generate the Genesis block
 * This use the configtxgen binary provided by HLF
 *
 * @author wassim.znaidi@gmail.com
 */
export class ConfigtxYamlGenerator extends BaseGenerator {
  /* configtx.yaml contents */
  contents = `
Organizations:
${this.network.ordererOrganization.map(ordOrg => `
  - &${ordOrg.name}
    Name: ${ordOrg.name}
    ID: ${ordOrg.mspName}
    MSPDir: ${getOrdererOrganizationRootPath(this.network.options.networkConfigPath, ordOrg.fullOrgName)}/msp
    Policies: &${ordOrg.name}POLICIES
        Readers:
            Type: Signature
            Rule: "OR('${ordOrg.mspName}.member')"
        Writers:
            Type: Signature
            Rule: "OR('${ordOrg.mspName}.member')"
        Admins:
            Type: Signature
            Rule: "OR('${ordOrg.mspName}.admin')"
    OrdererEndpoints:
${this.network.organizations.map(org => `    
        - ${org.orderers[0].options.host}:${org.orderers[0].options.ports[0]}
`).join('')}

`).join('')}         
  
${this.network.organizations.map(org => `
  - &${org.name}
    Name: ${org.mspName}
    ID: ${org.mspName}
    MSPDir: ${getOrganizationMspPath(this.network.options.networkConfigPath, org)}
    Policies: &${org.name}POLICIES
        Readers:
            Type: Signature
            Rule: "OR('${org.mspName}.admin', '${org.mspName}.peer', '${org.mspName}.client')"
        Writers:
            Type: Signature
            Rule: "OR('${org.mspName}.admin', '${org.mspName}.client')"
        Admins:
            Type: Signature
            Rule: "OR('${org.mspName}.admin')"
        Endorsement:
            Type: Signature
            Rule: "OR('${org.mspName}.peer')"
    AnchorPeers:
        - Host: ${org.peers[0].options.host}
          port: ${org.peers[0].options.ports[0]}
`).join('')}

Capabilities:
    Channel: &ChannelCapabilities
        V2_0: true
    Orderer: &OrdererCapabilities
        V2_0: true
    Application: &ApplicationCapabilities
        V2_0: true

Application: &ApplicationDefaults
    Organizations:

    Policies: &ApplicationDefaultPolicies
        LifecycleEndorsement:
            Type: ImplicitMeta
            Rule: "MAJORITY Endorsement"
        Endorsement:
            Type: ImplicitMeta
            Rule: "MAJORITY Endorsement"
        Readers:
            Type: ImplicitMeta
            Rule: "ANY Readers"
        Writers:
            Type: ImplicitMeta
            Rule: "ANY Writers"
        Admins:
            Type: ImplicitMeta
            Rule: "MAJORITY Admins"
    Capabilities:
        <<: *ApplicationCapabilities
  
Orderer: &OrdererDefaults
    OrdererType: etcdraft
    Addresses:
${this.network.organizations.map(org => `
${org.orderers.map((ord, i) => `
        - ${ord.options.host}:${ord.options.ports[0]}
`).join('')}
`).join('')}     
    BatchTimeout: ${this.options.batchTimeout}
    BatchSize:
        MaxMessageCount: ${this.options.maxMessageCount}
        AbsoluteMaxBytes: ${this.options.absoluteMaxBytes}
        PreferredMaxBytes: ${this.options.preferredMaxBytes}
    EtcdRaft:
        Consenters:
${this.network.organizations.map(org => `
${org.orderers.map((ord, i) => `
            - Host: ${ord.options.host}
              Port: ${ord.options.ports[0]}
              ClientTLSCert: ${getOrdererTlsRootPath(this.network.options.networkConfigPath, org.fullName, ord)}/server.crt
              ServerTLSCert: ${getOrdererTlsRootPath(this.network.options.networkConfigPath, org.fullName, ord)}/server.crt
`).join('')}
`).join('')}
    Organizations:
    Policies:
        Readers:
            Type: ImplicitMeta
            Rule: "ANY Readers"
        Writers:
            Type: ImplicitMeta
            Rule: "ANY Writers"
        Admins:
            Type: ImplicitMeta
            Rule: "MAJORITY Admins"
        BlockValidation:
            Type: ImplicitMeta
            Rule: "ANY Writers"
    Capabilities:
        <<: *OrdererCapabilities

Channel: &ChannelDefaults
    Policies:
        Readers:
            Type: ImplicitMeta
            Rule: "ANY Readers"
        Writers:
            Type: ImplicitMeta
            Rule: "ANY Writers"
        Admins:
            Type: ImplicitMeta
            Rule: "MAJORITY Admins"
    Capabilities:
        <<: *ChannelCapabilities

Profiles:
    BncChannel:
        Consortium: BncConsortium
        <<: *ChannelDefaults
        Application:
            <<: *ApplicationDefaults
            Organizations:
${this.network.organizations.map(org => `
                - *${org.name}
`).join('')}                        
            Capabilities:
                <<: *ApplicationCapabilities
    BncRaft:
        <<: *ChannelDefaults
        Orderer:
            <<: *OrdererDefaults
            Organizations:
            ${this.network.ordererOrganization.map(org => `
                - *${org.name}
`).join('')}   
            Capabilities:
                <<: *OrdererCapabilities       
        Consortiums:
            BncConsortium:
                Organizations:
${this.network.organizations.map(org => `
                - *${org.name}
`).join('')}                        
  `;

  /**
   * Constructor
   * @param filename
   * @param path
   * @param network
   */
  constructor(filename: string, path: string, private network: Network, private options: ConfigTxBatchOptions) {
    super(filename, getArtifactsPath(path));
  }

  /**
   * Generate the genesis.block using the executable configtxgen
   */
  async generateGenesisBlock(): Promise<boolean> {
    const scriptContent = `
export PATH=${getHlfBinariesPath(this.network.options.networkConfigPath, this.network.options.hyperledgerVersion)}:${this.network.options.networkConfigPath}:$PATH
export FABRIC_CFG_PATH=${this.network.options.networkConfigPath}  

which configtxgen
if [ "$?" -ne 0 ]; then
  echo "configtxgen tool not found. exiting"
  exit 1
fi    
  
set -x
configtxgen --configPath ${this.path} -profile BncRaft -channelID ${CHANNEL_RAFT_ID} -outputBlock ${this.path}/${GENESIS_FILE_NAME}
res=$?
set +x
if [ $res -ne 0 ]; then
  echo "Failed to generate orderer genesis block..."
  exit 1
fi
    `;

    try {
      // check artifact folder path
      await SysWrapper.createFolder(this.path);

      // check if all needed files and folder exists
      const isValid = await this._validate();
      if(!isValid) {
        e('Missing files/folder are detected to generate the genesis block - exit !!!');
        return false;
      }

      // check if configtx.yaml exists
      const configtxPath = `${this.path}/configtx.yaml`; // TODO differentiate between different configtx of different organization
      const genesisExist = SysWrapper.existsPath(configtxPath);
      if(!genesisExist) {
        e('Configuration configtx.yaml does not exists, exit genesis generation task !!! ');
        return false;
      }

      // execute the scripts
      await SysWrapper.execContent(scriptContent);

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  /**
   * Generate the channel configuration tx file
   */
  async generateConfigTx(channelName: string): Promise<boolean> {
    const scriptContent = `
export PATH=${getHlfBinariesPath(this.network.options.networkConfigPath, this.network.options.hyperledgerVersion)}:${this.network.options.networkConfigPath}:$PATH
export FABRIC_CFG_PATH=${this.network.options.networkConfigPath}  

which configtxgen
if [ "$?" -ne 0 ]; then
  echo "configtxgen tool not found. exiting"
  exit 1
fi    
  
set -x
configtxgen --configPath ${this.path} -profile BncChannel -outputCreateChannelTx ${this.path}/${channelName}.tx -channelID ${channelName}
res=$?
set +x
if [ $res -ne 0 ]; then
  echo "Failed to generate channel configuration transaction..."
  exit 1
fi
    `;

    try {
      // check artifact folder path
      await SysWrapper.createFolder(this.path);

      // check if configtx.yaml exists
      const channelTxPath = `${this.path}/${channelName}.tx`;
      const channelExist = SysWrapper.existsPath(channelTxPath);
      if (!channelExist) {
        e(`Configuration channel ${channelName} does not exists, exit now !!! `);
        return false;
      }

      // execute the scripts
      await SysWrapper.execContent(scriptContent);

      return true;
    } catch (err) {
      e(err);
      return false;
    }

  }

  /**
   * Generate the anchor peer update
   */
  async generateAnchorPeer(channelName: string): Promise<boolean> {

    try {
      // check artifact folder path
      await SysWrapper.createFolder(this.path);

      for(const org of this.network.organizations) {
        const anchorFile = `${org.mspName}anchors.tx`;
        const scriptContent = `
export PATH=${getHlfBinariesPath(this.network.options.networkConfigPath, this.network.options.hyperledgerVersion)}:${this.network.options.networkConfigPath}:$PATH
export FABRIC_CFG_PATH=${this.network.options.networkConfigPath}  

which configtxgen
if [ "$?" -ne 0 ]; then
  echo "configtxgen tool not found. exiting"
  exit 1
fi    
  
set -x
configtxgen --configPath ${this.path} -profile BncChannel -outputAnchorPeersUpdate ${this.path}/${anchorFile} -channelID ${channelName} -asOrg ${org.mspName}
res=$?
set +x
if [ $res -ne 0 ]; then
  echo "Failed to generate anchor peer update for ${org.mspName}..."
  exit 1
fi
    `;
        // check if configtx.yaml exists
        const anchorPath = `${this.path}/${anchorFile}`;
        const anchorExist = SysWrapper.existsPath(anchorPath);
        if (!anchorExist) {
          e(`Anchor peer update ${anchorPath} does not exists, exit now !!! `);
          return false;
        }

        // execute the scripts
        await SysWrapper.execContent(scriptContent);
      }

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  private async _validate(): Promise<boolean> {
    try {
      // Check org msp folder
      for(const org of this.network.organizations) {
        const mspFolder = `${getOrdererOrganizationRootPath(this.network.options.networkConfigPath, org.fullName)}/msp`;
        const mspExists = await SysWrapper.existsFolder(mspFolder);
        if(!mspExists) {
          e(`MSP folder not exists on: ${mspFolder}`);
          return false;
        }
      }


      // check orderer consenter ssl certs
      if(this.network.options.consensus === ConsensusType.RAFT) {
        for(const org of this.network.organizations) {
          for (const orderer of org.orderers) {
            const ordCert = `${getOrdererTlsRootPath(this.network.options.networkConfigPath, org.fullName, orderer)}/server.crt`;
            const certExists = await SysWrapper.existsPath(ordCert);
            if(!certExists) {
              e(`Orderer SSL certs not exists on: ${ordCert}`);
              return false;
            }
          }
        }
      }

      return true;
    } catch(err) {
      e(err);
      return false;
    }
  }

}
