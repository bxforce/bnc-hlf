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

  async enroll(type, id, secret, affiliation, mspID) {
    return await CLI.enroll(type, id, secret, affiliation, mspID);
  },

  async fetchIdentity(id) {
    return await CLI.fetchIdentity(id);
  },

  async deleteIdentity(id) {
    return await CLI.deleteIdentity(id);
  },

  async installChaincode() {
    l('Not yet implemented');

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
program
  .command('enroll <type> <id> <secret> <affiliation> <mspID> [args...]')
  .option('-R, --no-rmi', 'Do not remove docker images')
  .action(async (type:string, id:string , secret:string,affiliation:string ,mspID:string,  args:string[], cmd:any ) => {
    await tasks.enroll(type, id, secret, affiliation, mspID); // if -R is not passed cmd.rmi is true
  });

program
  .command('fetch-dentity <id> [args...]')
  .option('-R, --no-rmi', 'Do not remove docker images')
  .action(async (id:string, args:string[], cmd: any) => {
    await tasks.fetchIdentity(id);
  });

program  // just for testing to be deleted
  .command('delete-identity <id> [args...]')
  .option('-R, --no-rmi', 'Do not remove docker images')
  .action(async (id:string, args:string[], cmd: any) => {
    await tasks.deleteIdentity(id);
  });

program.command('start-root-ca').action(async () => {
  await tasks.createRootCA();
});

program.version(pkg.version);

program.parse(process.argv);
