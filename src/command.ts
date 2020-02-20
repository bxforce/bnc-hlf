#!/usr/bin/env node
import * as program from 'commander';
import { l } from './utils/logs';
import { CLI } from './cli';

const pkg = require('../package.json');

function collect(val, memo) {
    memo.push(val);
    return memo;
}

const tasks = {
    async createNetwork() {
      throw new Error('not implemented');
    },

    async cleanNetwork(rmi: boolean) {
      l('Not yet implemented');
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
      l('Not yet implemented');
    },

    async invokeChaincode() {
      l('Not yet implemented');
    },
};

program
    .command('new')
    // .option('-v, --version <version>', 'Hyperledger Fabric version')
    .option('-n, --network <path>', 'Path to the network definition file')
    .option('-c, --channels <channels>', 'Channels in the network')
    .option('-o, --organizations <organizations>', 'Amount of organizations')
    .option('-u, --users <users>', 'Users per organization')
    .option('-p, --path <path>', 'Path to deploy the network')
    .option('-i, --inside', 'Optimized for running inside the docker compose network')
    .option('--skip-download', 'Skip downloading the Fabric Binaries and Docker images')
    // .option('-p, --peers <peers>', 'Peers per organization')
    .action(async (cmd: any) => {
        if (cmd) {
            await tasks.createNetwork();
        } else {
            await tasks.createNetwork();
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

//chaincode: string, language: string, channel?: string,
// version?: string, params?: string, path?: string 
program
    .command('upgrade <name> <language> <ver>')
    .option('-o, --org <organization>', 'Organisation name', collect, [])
    .option('-C, --channel <channel>', 'Channel name', collect, [])
    .option('-c, --ctor <constructor>', 'Smart contract constructor params')
    .option('-x, --collections-config <collections-config>', 'Collections config file path (private data)')
    .option('-p, --path <path>', 'Path to deploy the network folder')
    .option('-P, --chaincode-path <path>', 'Path to chaincode package. Default to ./<name>')
    .option('-i, --inside', 'Optimized for running inside the docker compose network')
    .action(async (name: string, language: string, ver: string, cmd: any) => {
        cmd.channel = (!cmd.channel || cmd.channel.length === 0) ? ['ch1'] : cmd.channel;
        await Promise.all(cmd.channel.map(channel => {
            return tasks.upgradeChaincode();
        }));
    });
program
    .command('invoke <chaincode> <fn> [args...]')
    .option('-C, --channel <channel>', 'Select a specific channel to execute the command. Default \'ch1\'')
    .option('-p, --path <path>', 'Path to deploy the network folder')
    .option('-t, --transient-data <transient-data>', 'Private data, must be BASE64')
    // .option('-c, --ctor <constructor>', 'Smart contract request params')
    .option('-u, --user <user>', 'Select an specific user to execute command. Default \'user1\'')
    .option('-o, --organization <organization>', 'Select an specific organization to execute command. Default \'org1\'')
    .option('-i, --inside', 'Optimized for running inside the docker compose network')
    .action(async (chaincode: string, fn: string, args: string[], cmd: any) => {
        args.forEach(arg => l(arg));
        await tasks.invokeChaincode();
    });

program
    .version(pkg.version);

program.parse(process.argv);