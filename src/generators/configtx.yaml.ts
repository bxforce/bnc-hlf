import { BaseGenerator } from './base';
import { Network } from '../models/network';
import { DockerComposeYamlOptions } from '../utils/data-type';

export class ConfigtxYamlGenerator extends BaseGenerator {
  contents = `
Organizations:
${this.network.organizations
  .map(
    org => `
  - &${org.name}
    Name: ${org.name}
    SkipAsForeign: false
    ID: ${org.mspName}
    MSPDir: ${this.network.options.networkConfigPath}/organizations/peerOrganizations/${org.fullName}/msp
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
        OrdererEndpoints:
${org.orderers
  .map(
    (ord, i) => `
            - ${ord.options.host}:${ord.options.ports[i]}
`
  )
  .join('')}        
        AnchorPeers:
            - Host: ${org.peers[0].options.host}
              Port: ${org.peers[0].options.ports[0]}
`
  )
  .join('')}

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
    Addresses:
${this.network.organizations
  .map(
    org => `
${org.orderers
  .map((ord, i) => `
        # - ${ord.options.host}:${ord.options.ports[i]}
`).join('')}
`)
  .join('')}     
        
    BatchTimeout: 2s
    BatchSize:
        MaxMessageCount: 500
        AbsoluteMaxBytes: 10 MB
        PreferredMaxBytes: 2 MB
    MaxChannels: 0
    EtcdRaft:
        Consenters:
${this.network.organizations
  .map(
    org => `
${org.orderers
  .map(
    (ord, i) => `
            - Host: ${ord.options.host}
              Port: ${ord.options.ports[i]}
              ClientTLSCert: ${this.network.options.networkConfigPath}/crypto-config/ordererOrganizations/${org.domainName}/orderers/${ord.options.host.toLowerCase()}/tls/server.crt
              ServerTLSCert: ${this.network.options.networkConfigPath}/crypto-config/ordererOrganizations/${org.domainName}/orderers/${ord.options.host.toLowerCase()}/tls/server.crt
`
  )
  .join('')}
`
  )
  .join('')}        
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
    SampleDevModeEtcdRaft:
        <<: *ChannelDefaults
        Orderer:
            <<: *OrdererDefaults
            OrdererType: etcdraft
            Organizations:
${this.network.organizations
  .map(
    org => `
                - <<: *${org.name}
                  Policies:
                      <<: *${org.name}POLICIES
                      Admins:
                          Type: Signature
                          Rule: "OR('${org.name}.member')"
`
  )
  .join('')}            
        Application:
            <<: *ApplicationDefaults
            Organizations:
${this.network.organizations
  .map(
    org => `
                - <<: *${org.name}
                  Policies:
                      <<: *${org.name}POLICIES
                      Admins:
                          Type: Signature
                          Rule: "OR('${org.name}.member')"
`
  )
  .join('')}                        
        Consortiums:
            SampleConsortium:
                Organizations:
${this.network.organizations
  .map(
    org => `
                - <<: *${org.name}
                  Policies:
                      <<: *${org.name}POLICIES
                      Admins:
                          Type: Signature
                          Rule: "OR('${org.name}.member')"
`
  )
  .join('')}                        
  `;

  constructor(filename: string, path: string, private network: Network, private options?: DockerComposeYamlOptions) {
    super(filename, path);
  }
}
