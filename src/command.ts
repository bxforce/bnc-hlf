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

/* tslint:disable:no-unused-variable */
import * as program from 'commander';
const pkg = require('../package.json');

import { CLI } from './cli';
import { CONFIG_DEFAULT_PATH, CHANNEL_DEFAULT_NAME } from './utils/constants';

/**
 *
 * @author Ahmed Souissi
 * @author Sahar Fehri
 * @author wassim.znaidi@gmail.com
 */
program
  .command('init')
  .description("creates genesis.block and configtx files for channel and anchor update")
  .option('--genesis', 'generate genesis block')
  .option('--configtx', 'generate channel configuration file')
  .option('--anchortx', 'generate anchor peer update file')
  .option('-f, --config <path>', 'Absolute path to the genesis deployment definition file', CONFIG_DEFAULT_PATH)
  .action(async cmd => {
    await CLI.init(cmd.config, cmd.genesis, cmd.configtx, cmd.anchortx);
  });

program
  .command('enroll-peers')
  .description('creates crypto material for the peers')
  .option('-f, --config <path>', 'Absolute Path to the blockchain deployment  definition file', CONFIG_DEFAULT_PATH)
  .action(async (cmd: any) => {
    if (cmd) {
      await CLI.generatePeersCredentials(cmd.config);
    }
  });

program
  .command('enroll-orderers')
  .description('creates crypto material for the orderers')
  .option('-f, --config <path>', 'Absolute Path to the genesis deployment  definition file', CONFIG_DEFAULT_PATH)
  .action(async (cmd: any) => {
    if (cmd) {
      await CLI.generateOrdererCredentials(cmd.config);
    }
  });

program
  .command('generate')
  .description("creates crypto material, genesis.block and configtx files")
  .option('--genesis', 'generate genesis block')
  .option('--configtx', 'generate channel configuration file')
  .option('--anchortx', 'generate anchor peer update file')
  .option('-f, --config <path>', 'Absolute path to the genesis deployment definition file', CONFIG_DEFAULT_PATH)
  .action(async cmd => {
    await CLI.generatePeersCredentials(cmd.config);
    await CLI.generateOrdererCredentials(cmd.config);
    await CLI.init(cmd.config, cmd.genesis, cmd.configtx, cmd.anchortx);
  });

program
  .command('start')
  .description('create/start network')
  .option('-f, --config <path>', 'Absolute Path to the blockchain deployment  definition file', CONFIG_DEFAULT_PATH)
  .action(async cmd => {
    await CLI.deployHlfServices(cmd.config, !!cmd.skipDownload, true, true);
  });

program
  .command('stop')
  .description('stop the blockchain')
  .option('-f, --config <path>', 'Absolute Path to the blockchain deployment  definition file', CONFIG_DEFAULT_PATH)
  .option('-r, --rmi', 'remove docker containers')
  .action(async (cmd: any) => {
    await CLI.stopHlfServices(cmd.config, cmd.rmi);
  });

program
  .command('clean')
  .option('-R, --no-rmi', 'Do not remove docker images')
  .action(async (cmd: any) => {
    await CLI.cleanNetwork(cmd.rmi); // if -R is not passed cmd.rmi is true
  });

const channelCmd = program.command('channel');
channelCmd
  .command('create')
  .description('create channel if it does not exist')
  .option('-f, --config <path>', 'Absolute path to the genesis deployment definition file', CONFIG_DEFAULT_PATH)
  //.requiredOption('-t, --channel-tx <channel-path>', 'channel configuration file path')
  .requiredOption('-n, --namech <channel-name>', 'name of the channel')
  .action(async cmd => {
    await CLI.createChannel(cmd.namech, cmd.config);
  });

channelCmd
   .command('join')
   .description('join peers to channel')
   .option('-f, --config <path>', 'Absolute path to the genesis deployment definition file', CONFIG_DEFAULT_PATH)
   .requiredOption('-n, --namech <channel-name>', 'name of the channel')
   .action(async cmd => {
     await CLI.joinChannel(cmd.namech, cmd.config);
   });

channelCmd
    .command('update')
    .description('commit anchor update to peers on channel')
    .option('-f, --config <path>', 'Absolute path to the genesis deployment definition file', CONFIG_DEFAULT_PATH)
    //.requiredOption('-a, --anchortx <update-path>', 'configurationTemplateFilePath')
    .requiredOption('-n, --namech <channel-name>', 'name of the channel')
    .action(async (cmd) => {
      await CLI.updateChannel(cmd.namech, cmd.config);
    });

channelCmd
    .command('deploy')
    .description('deploy channel')
    .option('-f, --config <path>', 'Absolute path to the genesis deployment definition file', CONFIG_DEFAULT_PATH)
    .option('-n, --namech <channel-name>', 'name of the channel', CHANNEL_DEFAULT_NAME)
    .action(async (cmd) => {
      await CLI.createChannel(cmd.namech, cmd.config);
      await CLI.joinChannel(cmd.namech, cmd.config);
      await CLI.updateChannel(cmd.namech, cmd.config);
    });

const chaincodeCmd = program.command('chaincode');
chaincodeCmd
    .command('install')
    .description('install chaincode')
    .option('-f, --config <path>', 'Absolute path to the chaincode', CONFIG_DEFAULT_PATH)
    .requiredOption('-cRootPath, --chroot <path>', 'path to chaincode root')
    .requiredOption('-cPath, --ch <path>', 'path to chaincode starting from root')
    .requiredOption('-n, --namech <chaincode-name>', 'name of the chaincode')
    .requiredOption('-v, --vch <chaincode-version>', 'version of the chaincode')
    .option('-p, --list <items>', 'comma separated list', x => { x.split(','); })
    .action(async (cmd) => {
      await CLI.installChaincode(cmd.namech, cmd.config, cmd.vch, cmd.chroot, cmd.ch, cmd.list);
    });

chaincodeCmd
    .command('approve')
    .description('approve chaincode')
    .option('-f, --config <path>', 'Absolute path to the chaincode', CONFIG_DEFAULT_PATH)
    .requiredOption('-n, --namech <chaincode-name>', 'name of the chaincode')
    .requiredOption('-v, --vch <chaincode-version>', 'version of the chaincode')
    .option('--upgrade', 'option used when approving to upgrade chaincode')
    .requiredOption('-channel, --channel <channel-name>', 'name of the channel')
    .action(async (cmd) => {
      await CLI.approveChaincode(cmd.config, cmd.namech, cmd.vch, cmd.channel, cmd.upgrade);
    });

chaincodeCmd
    .command('commit')
    .description('commit chaincode')
    .option('-f, --config <path>', 'Absolute path to the config deploy file', CONFIG_DEFAULT_PATH)
    .option('-c, --confCommit <path>', 'Absolute path to the commit config', CONFIG_DEFAULT_PATH)
    .option('--upgrade', 'option used when approving to upgrade chaincode')
    .action(async (cmd) => {
      await CLI.commitChaincode(cmd.config, cmd.confCommit, cmd.upgrade);
    });

chaincodeCmd
    .command('deploy')
    .description('deploys chaincode')
    .option('-f, --config <path>', 'Absolute path to deploy config file', CONFIG_DEFAULT_PATH)
    .option('-c, --confCommit <path>', 'Absolute path to the commit config', CONFIG_DEFAULT_PATH)
    .option('-p, --list <items>', 'comma separated list of list peers to install chaincode on', x => { x.split(','); })
    .option('--upgrade', 'option used when approving to upgrade chaincode')
    .action(async (cmd) => {
      await CLI.deployChaincode(cmd.config, cmd.confCommit, cmd.list, cmd.upgrade);
    });

chaincodeCmd
    .command('cli')
    .description('start fabric cli')
    .option('-f, --config <path>', 'Absolute path to deploy config file', CONFIG_DEFAULT_PATH)
    .option('-c, --confCommit <path>', 'Absolute path to the commit config', CONFIG_DEFAULT_PATH)
    .action(async (cmd) => {
      await CLI.startFabricCli(cmd.config, cmd.confCommit);
    });

program.version(pkg.version);
program.parse(process.argv);
