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

import { BaseGenerator } from './base';
import { Network } from '../models/network';
import { Utils } from '../utils/utils';
import { e } from '../utils/logs';
import { SysWrapper } from '../utils/sysWrapper';
import { CHANNEL_NAME_DEFAULT, GENESIS_FILE_NAME } from '../utils/constants';
import getOrdererOrganizationRootPath = Utils.getOrdererOrganizationRootPath;
import getOrdererTlsPath = Utils.getOrdererTlsPath;
import getHlfBinariesPath = Utils.getHlfBinariesPath;
import getArtifactsPath = Utils.getArtifactsPath;
import execContent = SysWrapper.execContent;
import getOrganizationMspPath = Utils.getOrganizationMspPath;
import existsPath = SysWrapper.existsPath;

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
  - &${this.network.ordererOrganization.name}
    Name: ${this.network.ordererOrganization.name}
    ID: ${this.network.ordererOrganization.mspName}
    MSPDir: ${getOrdererOrganizationRootPath(this.network.options.networkConfigPath, this.network.ordererOrganization.domainName)}/msp
    Policies: &${this.network.ordererOrganization.name}POLICIES
        Readers:
            Type: Signature
            Rule: "OR('${this.network.ordererOrganization.name}.member')"
        Writers:
            Type: Signature
            Rule: "OR('${this.network.ordererOrganization.name}.member')"
        Admins:
            Type: Signature
            Rule: "OR('${this.network.ordererOrganization.name}.admin')"
    OrdererEndpoints:
${this.network.ordererOrganization.orderers.map((ord, i) => `
        - ${ord.options.host}:${ord.options.ports[0]}
`).join('')}        
  
${this.network.organizations.map(org => `
  - &${org.name}
    Name: ${org.name}
    ID: ${org.mspName}
    MSPDir: ${getOrganizationMspPath(this.network.options.networkConfigPath, org)}
    Policies: &${org.name}POLICIES
        Readers:
            Type: Signature
            Rule: "OR('${org.name}.member')"
        Writers:
            Type: Signature
            Rule: "OR('${org.name}.member')"
        Admins:
            Type: Signature
            Rule: "OR('${org.name}.admin')"
        Endorsement:
            Type: Signature
            Rule: "OR('${org.name}.member')"
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
    ACLs: &ACLsDefault
        _lifecycle/CheckCommitReadiness: /Channel/Application/Writers
        _lifecycle/CommitChaincodeDefinition: /Channel/Application/Writers
        _lifecycle/QueryChaincodeDefinition: /Channel/Application/Readers
        _lifecycle/QueryChaincodeDefinitions: /Channel/Application/Readers
        lscc/ChaincodeExists: /Channel/Application/Readers
        lscc/GetDeploymentSpec: /Channel/Application/Readers
        lscc/GetChaincodeData: /Channel/Application/Readers
        lscc/GetInstantiatedChaincodes: /Channel/Application/Readers
        qscc/GetChainInfo: /Channel/Application/Readers
        qscc/GetBlockByNumber: /Channel/Application/Readers
        qscc/GetBlockByHash: /Channel/Application/Readers
        qscc/GetTransactionByID: /Channel/Application/Readers
        qscc/GetBlockByTxID: /Channel/Application/Readers
        cscc/GetConfigBlock: /Channel/Application/Readers
        cscc/GetConfigTree: /Channel/Application/Readers
        cscc/SimulateConfigTreeUpdate: /Channel/Application/Readers
        peer/Propose: /Channel/Application/Writers
        peer/ChaincodeToChaincode: /Channel/Application/Readers
        event/Block: /Channel/Application/Readers
        event/FilteredBlock: /Channel/Application/Readers

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
    BatchTimeout: 2s
    BatchSize:
        MaxMessageCount: 10
        AbsoluteMaxBytes: 99 MB
        PreferredMaxBytes: 512 KB
    MaxChannels: 0
    EtcdRaft:
        Consenters:
${this.network.organizations.map(org => `
${org.orderers.map((ord, i) => `
            - Host: ${ord.options.host}
              Port: ${ord.options.ports[0]}
              ClientTLSCert: ${getOrdererTlsPath(this.network.options.networkConfigPath, this.network.ordererOrganization, ord)}/server.crt
              ServerTLSCert: ${getOrdererTlsPath(this.network.options.networkConfigPath, this.network.ordererOrganization, ord)}/server.crt
`).join('')}
`).join('')}        
        Options:
            TickInterval: 500ms
            ElectionTick: 10
            HeartbeatTick: 1
            MaxInflightBlocks: 5
            SnapshotIntervalSize: 16 MB
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
    BncRaft:
        <<: *ChannelDefaults
        Orderer:
            <<: *OrdererDefaults
            OrdererType: etcdraft
            Organizations:
            - *${this.network.ordererOrganization.name}
            Capabilities:
                <<: *OrdererCapabilities       
        Application:
            <<: *ApplicationDefaults
            Organizations:
                - <<: *${this.network.ordererOrganization.name}
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
  constructor(filename: string, path: string, private network: Network) {
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
configtxgen --configPath ${this.path} -profile BncRaft -channelID ${CHANNEL_NAME_DEFAULT} -outputBlock ${this.path}/${GENESIS_FILE_NAME}
res=$?
set +x
if [ $res -ne 0 ]; then
  echo "Failed to generate orderer genesis block..."
  exit 1
fi
    `;

    try {
      // check if configtx.yaml exists
      const configtxPath = `${this.path}/configtx.yaml`; // TODO differentiate between different configtx of different organization
      const genesisExist = existsPath(configtxPath);
      if(!genesisExist) {
        e('Configuration configtx.yaml does not exists, exit genesis generation task !!! ');
        return false;
      }

      // execute the scripts
      await execContent(scriptContent);

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }
}
