#!/usr/bin/env node

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

import * as program from 'commander';
import { l } from './utils/logs';
import { CLI } from './cli';

const pkg = require('../package.json');

/**
 *
 * @author ahmed Souissi
 * @author sahar Fehri
 * @author wassim.znaidi@gmail.com
 */
const tasks = {
  async generateGenesis(filePath: string) {
    return await CLI.generateGenesis(filePath);
  },

  async generateChannelConfig(genesisConfigFilePath: string) {
    return await CLI.generateChannelConfig(genesisConfigFilePath);
  },

  async generateAnchorPeer(genesisConfigFilePath: string) {
    return await CLI.generateAnchorPeer(genesisConfigFilePath);
  },

  async generateOrdererCredentials(genesisConfigFilePath: string) {
    return await CLI.generateOrdererCredentials(genesisConfigFilePath);
  },

  async generatePeersCredentials(deploymentConfigFilePath: string) {
    return await CLI.generatePeersCredentials(deploymentConfigFilePath);
  },

  async createNetwork(filePath: string) {
    return await CLI.createNetwork(filePath);
  },

  async cleanNetwork(rmi: boolean) {
    return await CLI.cleanNetwork(rmi);
  },

  async validateAndParse(filePath: string, skipDownload?: boolean) {
    return await CLI.validateAndParse(filePath, skipDownload);
  },

  async deployHlfServices(filePath: string, skipDownload?: boolean, enablePeers = true, enableOrderers = true) {
    return await CLI.deployHlfContainers(filePath, skipDownload, enablePeers, enableOrderers);
  },

  async enroll(type, id, secret, affiliation, mspID, caInfo, walletDirectoryName, ccpPath) {
    return await CLI.enroll(type, id, secret, affiliation, mspID, caInfo, walletDirectoryName, ccpPath);
  },

  async fetchIdentity(id, caInfo, walletDirectoryName, ccpPath) {
    return await CLI.fetchIdentity(id, caInfo, walletDirectoryName, ccpPath);
  },

  async deleteIdentity(id, caInfo, walletDirectoryName, ccpPath) {
    return await CLI.deleteIdentity(id, caInfo, walletDirectoryName, ccpPath);
  },

  async installChaincode() {
    l('[Install Chaincode] Not yet implemented');
  },

  async upgradeChaincode() {
    l('[Upgrade Chaincode] Not yet implemented');
  },

  async invokeChaincode() {
    l('[Invoke Chaincode] Not yet implemented');
  },

  async init(genesisConfigPath: string, genesis: boolean, configtx: boolean, anchortx: any) {
    l('Request Init command ...');

    // Generate the configtx.yaml file (mainly for genesis block)
    await CLI.generateConfigtx(genesisConfigPath);

    if (!(genesis || configtx || anchortx)) {
      l('[Init]: generate all config files (genesis, configtx, anchortx)...');

      await CLI.generateGenesis(genesisConfigPath);
      await CLI.generateChannelConfig(genesisConfigPath);
      await CLI.generateAnchorPeer(genesisConfigPath);

    } else {
      if (genesis) {
        l('[Init]: generate genesis block ... ');

        await CLI.generateGenesis(genesisConfigPath);

        l('[Init]: genesis block generated done !!! ');
      }

      if (configtx) {
        l('[Init]: generate channel config file... ');

        await CLI.generateChannelConfig(genesisConfigPath);

        l('[Init]: channel configuration generated done !!! ');
      }

      if (anchortx) {
        l('[Init]: generate the anchor peer update file...');

        await CLI.generateAnchorPeer(genesisConfigPath);

        l('[Init]: anchor peer update generated done !!!');
      }
    }

    l('[Init]: exit command !!!');
  },

  async enrollConfig(config: string, admin: boolean) {
    if (admin) {
      l('[enroll admin] Not yet implemented');
    } else {
      l('[enroll all] Not yet implemented');
    }
    //l('config file: ' + config;
  },

  async stop(deployConfigFilePath: string, forceRemove: boolean) {
    l('Request stop command ...');

    await CLI.stopBlockchain(deployConfigFilePath, false, false, forceRemove);

    l('Blockchain stopped !!!');
  },

  async createChannel(channelName, channeltxPath, deploymentConfigFilePath) {
    return await CLI.createChannel(channelName, channeltxPath, deploymentConfigFilePath);
  },

   async joinChannel(nameChannel, nameOrg, listPeers, deploymentConfigFilePath, allPeers) {
     let arrPeers;
    if(!allPeers){
      arrPeers = listPeers.split(/(?:,| )+/).map(String);
    }
     return await CLI.joinChannel(nameChannel, nameOrg, arrPeers, deploymentConfigFilePath, allPeers);
   },
  async updateChannel(anchortx, namech, deploymentConfigFilePath) {
    return await CLI.updateChannel(anchortx, namech, deploymentConfigFilePath);
  }
};

// --> start official commands

program
  .command('init')
    .description("creates genesis.block and configtx files for channel and anchor update")
  .option('--genesis', 'generate genesis block')
  .option('--configtx', 'generate channel configuration file')
  .option('--anchortx', 'generate anchor peer update file')
  .requiredOption('-f, --config <path>', 'Absolute path to the genesis deployment definition file')
  .action(async cmd => {
    await tasks.init(cmd.config, cmd.genesis, cmd.configtx, cmd.anchortx);
  });

program
  .command('enroll-peers')
  .description('creates crypto material for the peers')
  .requiredOption('-f, --config <path>', 'Absolute Path to the blockchain deployment  definition file')
  .action(async (cmd: any) => {
    if (cmd) {
      await tasks.generatePeersCredentials(cmd.config);
    }
  });

program
  .command('enroll-orderers')
  .description('creates crypto material for the orderers')
  .requiredOption('-f, --config <path>', 'Absolute Path to the genesis deployment  definition file')
  .action(async (cmd: any) => {
    if (cmd) {
      await tasks.generateOrdererCredentials(cmd.config);
    }
  });

program
  .command('start')
  .description('create/start network')
  .requiredOption('-f, --config <path>', 'Absolute Path to the blockchain deployment  definition file')
  .action(async cmd => {
    await tasks.deployHlfServices(cmd.config, !!cmd.skipDownload, true, true);
  });

program
  .command('stop')
  .description('stop the blockchain')
  .requiredOption('-f, --config <path>', 'Absolute Path to the blockchain deployment  definition file')
  .option('-r, --rmi', 'remove docker containers')
  .action(async (cmd: any) => {
    await tasks.stop(cmd.config, cmd.rmi);
  });

const channelCmd = program.command('channel');
channelCmd
  .command('create')
  .description('create channel if it does not exist')
  .requiredOption('-f, --config <path>', 'Absolute path to the genesis deployment definition file')
  .requiredOption('-t, --channel-tx <channel-path>', 'channel configuration file path')
  .requiredOption('-n, --namech <channel-name>', 'name of the channel')
  .action(async cmd => {
    await tasks.createChannel(cmd.namech, cmd.channelTx, cmd.config);
  });

channelCmd
   .command('join')
   .description('join peers to channel')
    .requiredOption('-f, --config <path>', 'Absolute path to the genesis deployment definition file')
   .requiredOption('-n, --namech <channel-name>', 'name of the channel')
   .option('-p, --list <items>', 'comma separated list')
    .option('-all, --all', 'all peers')
   .action(async cmd => {
     const allPeers = cmd.all ? true : false;
     await tasks.joinChannel(cmd.namech, cmd.nameorg, cmd.list, cmd.config, allPeers);
   });

channelCmd
    .command('update')
    .description('commit anchor update to peers on channel')
    .requiredOption('-f, --config <path>', 'Absolute path to the genesis deployment definition file')
    .requiredOption('-t, --anchortx <update-path>', 'configurationTemplateFilePath')
    .requiredOption('-n, --namech <channel-name>', 'name of the channel')
    .action(async (cmd) => {
      await tasks.updateChannel(cmd.anchortx, cmd.namech, cmd.config);
    });
/*
program
  .command('new')
  .requiredOption('-f, --config <path>', 'Absolute Path to the blockchain deployment  definition file')
  .action(async (cmd: any) => {
    if (cmd) {
      // TODO check if the file exists

      await tasks.createNetwork(cmd.config);
    }
  });



program
  .command('parse')
  .requiredOption('-c, --config <path>', 'Absolute Path to the blockchain deployment  definition file')
  .option('--skip-download', 'Skip downloading the Fabric Binaries and Docker images')
  .action(async (cmd: any) => {
    if (cmd) {
      await tasks.validateAndParse(cmd.config, !!cmd.skipDownload);
    }
  });

program
  .command('deploy-hlf')
  .requiredOption('-c, --config <path>', 'Absolute Path to the blockchain deployment  definition file')
  .option('--skip-download', 'Skip downloading the Fabric Binaries and Docker images')
  .action(async (cmd: any) => {
    if (cmd) {
      await tasks.deployHlfServices(cmd.config, !!cmd.skipDownload, true, true);
    }
  });

program
  .command('deploy-orderers')
  .requiredOption('-c, --config <path>', 'Absolute Path to the blockchain deployment  definition file')
  .option('--skip-download', 'Skip downloading the Fabric Binaries and Docker images')
  .action(async (cmd: any) => {
    if (cmd) {
      await tasks.deployHlfServices(cmd.config, !!cmd.skipDownload, false, true);
    }
  });

 */

program
  .command('clean')
  .option('-R, --no-rmi', 'Do not remove docker images')
  .action(async (cmd: any) => {
    await tasks.cleanNetwork(cmd.rmi); // if -R is not passed cmd.rmi is true
  });
/*
program
  .command('enroll <type> <id> <secret> <affiliation> <mspID> [args...]')
  .option('-R, --no-rmi', 'Do not remove docker images')
  .option('-ca, --caInfo <caInfo>', 'add ca info', 'ca.org1.example.com')
  .option('-w, --walletDirectoryName <walletDirectoryName>', 'add walle t directory name', 'wallet')
  .option('-ccp, --ccpPath <ccpPath>', 'add ccpPath', '../../../tests/ca/connection-org1.json')
  .action(async (type: string, id: string, secret: string, affiliation: string, mspID: string, args: string[], cmd: any) => {
    await tasks.enroll(type, id, secret, affiliation, mspID, cmd.caInfo, cmd.walletDirectoryName, cmd.ccpPath); // if -R is not passed cmd.rmi is true

  });

program
  .command('fetch-identity <id> [args...]')
  .option('-R, --no-rmi', 'Do not remove docker images')
  .option('-ca, --caInfo <caInfo>', 'add ca info', 'ca.org1.example.com')
  .option('-w, --walletDirectoryName <walletDirectoryName>', 'add walle t directory name', 'wallet')
  .option('-ccp, --ccpPath <ccpPath>', 'add ccpPath', '../../../tests/ca/connection-org1.json')
  .action(async (id: string, args: string[], cmd: any) => {
    await tasks.fetchIdentity(id, cmd.caInfo, cmd.walletDirectoryName, cmd.ccpPath);
  });

program  // just for testing to be deleted
  .command('delete-identity <id> [args...]')
  .option('-R, --no-rmi', 'Do not remove docker images')
  .option('-ca, --caInfo <caInfo>', 'add ca info', 'ca.org1.example.com')
  .option('-w, --walletDirectoryName <walletDirectoryName>', 'add walle t directory name', 'wallet')
  .option('-ccp, --ccpPath <ccpPath>', 'add ccpPath', '../../../tests/ca/connection-org1.json')
  .action(async (id: string, args: string[], cmd: any) => {
    await tasks.deleteIdentity(id, cmd.caInfo, cmd.walletDirectoryName, cmd.ccpPath);
  });



program
  .command('enroll')
  .option('--admin', 'enroll admin')
  .requiredOption('-f, --config <path>', 'configurationTemplateFilePath')
  .action(async cmd => {
    await tasks.enrollConfig(cmd.config, cmd.admin);
  });

 */

// channelCmd
//   .command('join')
//   .description('join channel')
//   .requiredOption('-n, --namech <channel-name>', 'name of the channel')
//   .requiredOption('-o, --nameorg <org-name>', 'name of the organization')
//   .option('-p, --list <items>', 'comma separated list')
//   .action(async cmd => {
//     await tasks.joinChannel(cmd.namech, cmd.nameorg, cmd.list);
//   });
// channelCmd
//   .command('update')
//   .description('update channel')
//   .requiredOption('-t, --anchortx <update-path>', 'configurationTemplateFilePath')
//   .requiredOption('-n, --namech <channel-name>', 'name of the channel')
//   .requiredOption('-o, --nameorg <org-name>', 'name of the organization')
//   .action(async (cmd) => {
//     await tasks.updateChannel(cmd.anchortx, cmd.namech, cmd.nameorg);
//   });

program.version(pkg.version);

program.parse(process.argv);
