#!/usr/bin/env node
import * as program from 'commander';
import { l } from './utils/logs';
import { CLI } from './cli';

const pkg = require('../package.json');

const tasks = {
  async createRootCA() {
    return await CLI.startRootCA();
  },

  async createNetwork(filePath: string) {
    return await CLI.createNetwork(filePath);
  },

  async cleanNetwork(rmi: boolean) {
    return await CLI.cleanNetwork(rmi);
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
  .command('new')
  .requiredOption('-f, --config <path>', 'Absolute Path to the blockchain deployment  definition file')
  .action(async (cmd: any) => {
    if (cmd) {
      // TODO check if the file exists

      await tasks.createNetwork(cmd.config);
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
  .action(async (type:string, id:string , secret:string,affiliation:string ,mspID:string,  args:string[], cmd:any ) => {
    console.log('lp', id, secret)
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

program
    .command('install <name> <language>')
    .option('-o, --org <organization>', 'Target organization.', collect, [])
    .option('-C, --channel <channel>', 'Channel to deploy the chaincode. Default to \'ch1\'', collect, [])
    .option('-c, --ctor <constructor>', 'Smart contract constructor params')
    .option('-x, --collections-config <collections-config>', 'Collections config file path (private data)')
    .option('-p, --path <path>', 'Path to deploy the network folder')
    .option('-P, --chaincode-path <path>', 'Path to chaincode package. Default to ./<name>')
    .option('-i, --inside', 'Optimized for running inside the docker compose network')
    .option('-D, --debug', 'Run in debug mode, no container (NodeJS chaincodes only)')
    .action(async (name: string, language: string, cmd: any) => {
        cmd.channel = (!cmd.channel || cmd.channel.length === 0) ? ['ch1'] : cmd.channel;
        await Promise.all(cmd.channel.map(channel => {
            return tasks.installChaincode();
        }));
    });
program.command('start-root-ca').action(async () => {
  await tasks.createRootCA();
});

program.version(pkg.version);

program.parse(process.argv);
