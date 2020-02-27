#!/usr/bin/env node
import * as program from 'commander';
import { l } from './utils/logs';
import { CLI } from './cli';

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

program.version(pkg.version);

program.parse(process.argv);
