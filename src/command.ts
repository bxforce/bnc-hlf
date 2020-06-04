#!/usr/bin/env node
import * as program from 'commander';
import { l } from './utils/logs';
import { CLI } from './cli';

const pkg = require('../package.json');

const tasks = {
  async generateGenesis(filePath: string) {
    return await CLI.generateGenesis(filePath);
  },

  async generateOrdererCredentials(filePath: string) {
    return await CLI.generateOrdererCredentials(filePath);
  },

  async generatePeersCredentials(filePath: string) {
    return await CLI.generatePeersCredentials(filePath);
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

  async deployPeers(filePath: string, skipDownload?: boolean) {
    return await CLI.deployPeers(filePath, skipDownload);
  },

  async enroll(type, id, secret, affiliation, mspID, caInfo, walletDirectoryName, ccpPath) {
    return await CLI.enroll(type, id, secret, affiliation, mspID, caInfo, walletDirectoryName, ccpPath);
  },

  async fetchIdentity(id,caInfo, walletDirectoryName, ccpPath) {
    return await CLI.fetchIdentity(id,caInfo, walletDirectoryName, ccpPath);
  },

  async deleteIdentity(id,caInfo, walletDirectoryName, ccpPath) {
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
  async init(config: string, genesis: boolean, configtx: boolean, anchortx: any) {
    if (!(genesis || configtx || anchortx)) {
      l('[init all] Not yet implemented');
    } else if (configtx) {
      l('[init configTx] Not yet implemented');
    } else if (anchortx) {
      l('[init anchorTx] Not yet implemented');
    } else if (genesis) {
      l('[init genesis] Not yet implemented');
    }
    //l('config file: ' + config;
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
  },
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
  .command('generate-genesis')
  .requiredOption('-c, --config <path>', 'Absolute Path to the blockchain deployment  definition file')
  .action(async (cmd: any) => {
    if (cmd) {
      await tasks.generateGenesis(cmd.config);
    }
  });

program
  .command('peer-msp')
  .requiredOption('-c, --config <path>', 'Absolute Path to the blockchain deployment  definition file')
  .action(async (cmd: any) => {
    if (cmd) {
      await tasks.generatePeersCredentials(cmd.config);
    }
  });

program
  .command('orderer-msp')
  .requiredOption('-c, --config <path>', 'Absolute Path to the blockchain deployment  definition file')
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
  .command('deploy-peers')
  .requiredOption('-c, --config <path>', 'Absolute Path to the blockchain deployment  definition file')
  .option('--skip-download', 'Skip downloading the Fabric Binaries and Docker images')
  .action(async (cmd: any) => {
    if (cmd) {
      await tasks.deployPeers(cmd.config, !!cmd.skipDownload);
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
  .action(async (type:string, id:string , secret:string,affiliation:string ,mspID:string,  args:string[], cmd:any ) => {
    await tasks.enroll(type, id, secret, affiliation, mspID, cmd.caInfo, cmd.walletDirectoryName, cmd.ccpPath); // if -R is not passed cmd.rmi is true

  });

program
  .command('fetch-identity <id> [args...]')
  .option('-R, --no-rmi', 'Do not remove docker images')
  .option('-ca, --caInfo <caInfo>', 'add ca info', 'ca.org1.example.com')
  .option('-w, --walletDirectoryName <walletDirectoryName>', 'add walle t directory name', 'wallet')
  .option('-ccp, --ccpPath <ccpPath>', 'add ccpPath', '../../../tests/ca/connection-org1.json')
  .action(async (id:string, args:string[], cmd: any) => {
    await tasks.fetchIdentity(id, cmd.caInfo, cmd.walletDirectoryName, cmd.ccpPath);
  });

program  // just for testing to be deleted
  .command('delete-identity <id> [args...]')
  .option('-R, --no-rmi', 'Do not remove docker images')
  .option('-ca, --caInfo <caInfo>', 'add ca info', 'ca.org1.example.com')
  .option('-w, --walletDirectoryName <walletDirectoryName>', 'add walle t directory name', 'wallet')
  .option('-ccp, --ccpPath <ccpPath>', 'add ccpPath', '../../../tests/ca/connection-org1.json')
  .action(async (id:string, args:string[], cmd: any) => {
    await tasks.deleteIdentity(id, cmd.caInfo, cmd.walletDirectoryName, cmd.ccpPath);
  });

program
  .command('init')
  .option('--genesis', 'generate genesis_block')
  .option('--configtx', 'generate configTx')
  .option('--anchortx', 'generate anchorTx')
  .requiredOption('-f, --config <path>', 'bncGenesisConfigurationFilePath')
  .action(async cmd => {
    await tasks.init(cmd.config, cmd.genesis, cmd.configtx, cmd.anchortx);
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
