#!/usr/bin/env node
import * as program from 'commander';
import { l } from './utils/logs';
import { CLI } from './cli';
import * as commander from 'commander';
import { isCombinedModifierFlagSet } from 'tslint';

const pkg = require('../package.json');

const tasks = {
  async generateGenesis(filePath: string) {
    return await CLI.generateGenesis(filePath);
  },

  async createRootCA() {
    return await CLI.startRootCA();
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

  async installChaincode() {
    l('[Install Chaincode] Not yet implemented');
  },

  async upgradeChaincode() {
    l('[Upgrade Chaincode] Not yet implemented');
  },

  async invokeChaincode() {
    l('[Invoke Chaincode] Not yet implemented');
  }
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
  .command('clean')
  .option('-R, --no-rmi', 'Do not remove docker images')
  .action(async (cmd: any) => {
    await tasks.cleanNetwork(cmd.rmi); // if -R is not passed cmd.rmi is true
  });

program
  .command('start-root-ca')
  .requiredOption('-c, --config <path>', 'Absolute Path to the blockchain deployment  definition file')
  .action(async (cmd: any) => {
    if (cmd) {
      await tasks.createRootCA();
    }
  });

const configurationCmd = program.command('configuration');
configurationCmd
  .command('generate-all')
  .description('shared Configuration files')
  .requiredOption('-f, --file-path <path>', 'bncGenesisConfigurationFilePath')
  .action(cmd => {
    l('generate-all command not yet implemented');
  });
configurationCmd
  .command('generate-genesis')
  .description('generate genesis_block')
  .requiredOption('-f, --file-path <path>', 'bncGenesisConfigurationFilePath')
  .action(cmd => {
    l('generate-genesis command not yet implemented');
  });
configurationCmd
  .command('generate-configtx')
  .description('generate configTx')
  .requiredOption('-f, --file-path <path>', 'bncGenesisConfigurationFilePath')
  .action(cmd => {
    l('generate-configtx command not yet implemented');
  });
configurationCmd
  .command('generate-anchortx')
  .description('generate anchorTx')
  .requiredOption('-f, --file-path <path>', 'bncGenesisConfigurationFilePath')
  .action(cmd => {
    l('generate-anchortx command not yet implemented');
  });

const credentialsCmd = program.command('credentials');
credentialsCmd
  .command('generate-all')
  .description("generate nodes' credentials")
  .requiredOption('-f, --file-path <path>', 'configurationTemplateFilePath')
  .action(cmd => {
    l('generate-all command not yet implemented');
  });
credentialsCmd
  .command('generate-genesis')
  .description('enroll admin')
  .requiredOption('-f, --file-path <path>', 'configurationTemplateFilePath')
  .action(cmd => {
    l('generate-genesis command not yet implemented');
  });

const networkCmd = program.command('network');
networkCmd
  .command('start-all')
  .description('create/start network')
  .requiredOption('-f, --file-path <path>', 'configurationTemplateFilePath')
  .action(cmd => {
    l('network start-all command not yet implemented');
  });
networkCmd
  .command('stop-all')
  .description('stop network')
  .action(cmd => {
    l('network stop-all command not yet implemented');
  });

const channelCmd = program.command('channel');
channelCmd
  .command('create')
  .description('create channel if it does not exist')
  .requiredOption('-f, --file-path <path>', 'configurationTemplateFilePath')
  .action(cmd => {
    l('channel create command not yet implemented');
  });
channelCmd
  .command('join')
  .description('join channel')
  .requiredOption('-f, --file-path <path>', 'configurationTemplateFilePath')
  .action(cmd => {
    l('channel join command not yet implemented');
  });
channelCmd
  .command('update')
  .description('update channel')
  .requiredOption('-f, --file-path <path>', 'configurationTemplateFilePath')
  .action(cmd => {
    l('channel update command not yet implemented');
  });

program.version(pkg.version);

program.parse(process.argv);
