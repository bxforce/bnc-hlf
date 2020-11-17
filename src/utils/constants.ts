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

export enum PeerDbType {
  Couchdb = 'couchdb',
  LevelDb = 'leveldb'
}

export enum AgentType {
  Docker = 'docker',
  Kubernetes = 'k8s'
}

export enum ConsensusType {
  RAFT = 'raft',
  KAFKA = 'kafka',
  SOLO = 'solo'
}

export enum HLF_DEFAULT_VERSION {
  FABRIC = '2.2.1',
  THIRDPARTY = '0.4.18',
  CA = '1.4.4'
}

export enum USER_TYPE {
  admin = 'admin',
  user = 'user'
}

export enum DOCKER_DEFAULT {
  IP = '127.0.0.1',
  PORT = 2375
}

export enum HLF_CLIENT_ACCOUNT_ROLE {
  peer = 'peer',
  client = 'client',
  admin= 'admin',
  orderer = 'orderer',
}

export const enum HLF_WALLET_TYPE {
  FileSystem = 'filesystem',
  CouchDB = 'couchdb',
  Memory = 'memory'
}

export const CA_DEFAULT_PORT = 7054;

export const ORDERER_DEFAULT_PORT = {
  main: 7050,
  operations: 8443
};

export const PEER_DEFAULT_PORT = {
  event: 7051,
  event_chaincode: 7052,
  event_hub: 7053,
  operations: 9443,
  couchdb: 5984
};

export const DEFAULT_CA_ADMIN = {
  name: 'admin',
  password: 'adminpw'
};

export const UNIX_DOCKER_SOCKET = '/var/run/docker.sock';

/* default folder to store all generated tools files and data */
export const NETWORK_ROOT_PATH = './hyperledger-fabric-network';

/* default file containing the whole configuration */
export const CONFIG_DEFAULT_PATH = '/bnc/config/config.yaml';

export const GENESIS_FILE_NAME = 'genesis.block';
export const channelTimeout = 10000;
export const updateTimeout = 60000;
export const BNC_TOOL_NAME = 'BNC';
export const BNC_NETWORK = 'bnc_network';
export const DOCKER_CA_DELAY = 3000;
export const DOCKER_DELAY = 5000;
export const MAX_ENROLLMENT_COUNT = 3;
export const ENABLE_CONTAINER_LOGGING = true;
export const CHANNEL_RAFT_ID = 'system-channel';
export const CHANNEL_DEFAULT_NAME = 'mychannel';
export const SEQUENCE = 1;
export const BLOCK_SIZE = 50;
