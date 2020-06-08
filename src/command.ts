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

#!/usr/bin/env node
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

    if (!(genesis || configtx || anchortx)) {
      l('[Init]: generate all config files (genesis, configtx, anchortx)...');

    } else {
      if (genesis) {
        l('[Init]: generate genesis block ... ');

        await CLI.generateGenesis(genesisConfigPath);

        l('[Init]: genesis block generated done !!! ');
      }

      if (configtx) {
        l('[Init]: generate configtx.yaml file... ');

        await CLI.generateConfigtx(genesisConfigPath);

        l('[Init]: configtx.yaml file generated done !!! ');
      }

      if (anchortx) {
        l('AnchorTx generated not yet supported');
      }
    }

    l('[Init]: exit command !!!');
  },
  enrollConfig(config: string, admin: boolean) {
    if (admin) {
      l('[enroll admin] Not yet implemented');
    } else {
      l('[enroll all] Not yet implemented');
    }
    //l('config file: ' + config;
  },
  start(config: string) {
    l('[start] not yet implemented');
    //l('config file: ' + config;
  },
  async stop() {
    l('[stop] not yet implemented');
  }
  // async createChannel(channeltxPath, nameChannel, nameOrg) {
  //   return await CLI.createChannel(channeltxPath, nameChannel, nameOrg);
  // },
  // async joinChannel(nameChannel, nameOrg, listPeers) {
  //   let arrPeers = listPeers.split(",").map(String)
  //   return await CLI.joinChannel(nameChannel, nameOrg, arrPeers);
  // },
  // async updateChannel(anchortx, namech, nameorg) {
  //   return await CLI.updateChannel(anchortx, namech, nameorg);
  // }
};

program
  .command('init')
  .option('--genesis', 'generate genesis_block')
  .option('--configtx', 'generate configTx')
  .option('--anchortx', 'generate anchorTx')
  .requiredOption('-f, --config <path>', 'Absolute path to the genesis deployment defintion file')
  .action(async cmd => {
    await tasks.init(cmd.config, cmd.genesis, cmd.configtx, cmd.anchortx);
  });

program
  .command('enroll-peers')
  .requiredOption('-f, --config <path>', 'Absolute Path to the blockchain deployment  definition file')
  .action(async (cmd: any) => {
    if (cmd) {
      await tasks.generatePeersCredentials(cmd.config);
    }
  });

program
  .command('enroll-orderers')
  .requiredOption('-f, --config <path>', 'Absolute Path to the genesis deployment  definition file')
  .action(async (cmd: any) => {
    if (cmd) {
      await tasks.generateOrdererCredentials(cmd.config);
    }
  });

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

program
  .command('clean')
  .option('-R, --no-rmi', 'Do not remove docker images')
  .action(async (cmd: any) => {
    await tasks.cleanNetwork(cmd.rmi); // if -R is not passed cmd.rmi is true
  });

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

program
  .command('start')
  .description('create/start network')
  .requiredOption('-f, --config <path>', 'configurationTemplateFilePath')
  .action(async cmd => {
    await tasks.start(cmd.config);
  });
program
  .command('stop')
  .description('stop network')
  .action(async () => {
    await tasks.stop();
  });

const channelCmd = program.command('channel');
// channelCmd
//   .command('create')
//   .description('create channel if it does not exist')
//   .requiredOption('-t, --channel-tx <channel-path>', 'configurationTemplateFilePath')
//   .requiredOption('-n, --namech <channel-name>', 'name of the channel')
//   .requiredOption('-o, --nameorg <org-name>', 'name of the organization')
//   .action(async cmd => {
//     await tasks.createChannel(cmd.channelTx, cmd.namech, cmd.nameorg );
//   });
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
