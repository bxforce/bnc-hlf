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
import { CONFIG_DEFAULT_PATH, CHANNEL_DEFAULT_NAME, DOCKER_DELAY } from './utils/constants';
import { Utils } from './utils/helper';
 
/**
 *
 * @author Ahmed Souissi
 * @author Sahar Fehri
 * @author wassim.znaidi@gmail.com
 */
program
  .command('init')
  .description("creates genesis.block and configtx files for channel and anchor update")
  .option('--genesisBlock', 'generate genesis block')
  .option('--configTx', 'generate channel configuration file')
  .option('--anchorTx', 'generate anchor peer update file')
  .option('-g, --config <path>', 'Absolute path to the genesis deployment definition file', CONFIG_DEFAULT_PATH)
  .action(async cmd => {
    await CLI.init(cmd.config, cmd.genesisBlock, cmd.configTx, cmd.anchorTx);
  });

program
  .command('enroll-orderers')
  .description('creates crypto material for the orderers')
  .option('-f, --config <path>', 'Absolute Path to the deployment  definition file', CONFIG_DEFAULT_PATH)
    .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .action(async (cmd: any) => {
    if (cmd) {
      await CLI.generateOrdererCredentials(cmd.config, cmd.hosts);
    }
  });

program
  .command('enroll-peers')
  .description('creates crypto material for the peers')
  .option('-f, --config <path>', 'Absolute Path to the blockchain deployment definition file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .action(async (cmd: any) => {
    if (cmd) {
      await CLI.generatePeersCredentials(cmd.config, cmd.hosts);
    }
  });

program
  .command('generate')
  .description("creates crypto material, genesis.block and configtx files")
  .option('--genesisBlock', 'generate genesis block')
  .option('--configTx', 'generate channel configuration file')
  .option('--anchorTx', 'generate anchor peer update file')
  .option('-f, --config <path>', 'Absolute path to the deploy deployment definition file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-g, --genesis <path>', 'Absolute path to the genesis deployment definition file')
  .action(async cmd => {
    await CLI.generatePeersCredentials(cmd.config, cmd.hosts);
    await CLI.generateOrdererCredentials(cmd.config, cmd.hosts);
    if (cmd.genesis) {
      await CLI.init(cmd.genesis, cmd.genesisBlock, cmd.configTx, cmd.anchorTx);
    }
  });

program
  .command('start')
  .description('create/start network')
  .option('-f, --config <path>', 'Absolute Path to the blockchain deployment  definition file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('--no-orderer', 'bypass createChannel')
  .option('--singleOrderer', 'generate and start docker-compose of single orderer')
  .action(async cmd => {
    await CLI.deployHlfServices(cmd.config, cmd.hosts, !!cmd.skipDownload, true, cmd.orderer, cmd.singleOrderer);
  });

program
  .command('stop')
  .description('stop the blockchain')
  .option('-f, --config <path>', 'Absolute Path to the blockchain deployment  definition file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-R, --no-rmi', 'Do not remove docker images')
  .action(async (cmd: any) => {
    await CLI.stopHlfServices(cmd.config, cmd.hosts, cmd.rmi);
  });

program
    .command('generate-new-genesis')
    .description('generates genesis for new orderers')
    .option('-f, --config <path>', 'Absolute Path to the blockchain deployment  definition file', CONFIG_DEFAULT_PATH)
    .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
    .action(async (cmd: any) => {
        await CLI.generateNewGenesis(cmd.config, cmd.hosts);
    });

program
  .command('clear')
  .option('-f, --config <path>', 'Absolute path to the blockchain deployment definition file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-R, --no-rmi', 'Do not remove docker images')
  .action(async (cmd: any) => {
    await CLI.cleanNetwork(cmd.config, cmd.hosts, cmd.rmi); // if -R is not passed cmd.rmi is true
  });

program
  .command('run')
  .option('-f, --config <path>', 'Absolute path to the genesis deployment definition file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-g, --genesis <path>', 'Absolute path to the genesis deployment definition file', CONFIG_DEFAULT_PATH)
  .option('--genesisBlock', 'generate genesis block')
  .option('--configTx', 'generate channel configuration file')
  .option('--anchorTx', 'generate anchor peer update file')
  .option('-c, --commit <path>', 'Absolute path to the commit config', CONFIG_DEFAULT_PATH)
  .option('-n, --namech <channel-name>', 'name of the channel', CHANNEL_DEFAULT_NAME)
  .option('-p, --list <items>', 'comma separated list of list peers to install chaincode on', x => { x.split(','); })
  .option('--upgrade', 'option used when approving to upgrade chaincode')
  .action(async (cmd: any) => {
    await CLI.generatePeersCredentials(cmd.config, cmd.hosts);
    await CLI.generateOrdererCredentials(cmd.config, cmd.hosts);
    await CLI.init(cmd.genesis, cmd.genesisBlock, cmd.configTx, cmd.anchorTx);
    await CLI.deployHlfServices(cmd.config, cmd.hosts, !!cmd.skipDownload, true, true);
    await Utils.delay(DOCKER_DELAY);
    await CLI.createChannel(cmd.config, cmd.hosts, cmd.namech);
    await Utils.delay(DOCKER_DELAY);
    await CLI.joinChannel(cmd.config, cmd.hosts, cmd.namech);
    await CLI.updateChannel(cmd.config, cmd.hosts, cmd.namech);
    await CLI.startFabricCli(cmd.config, cmd.hosts, cmd.commit, true);
    await CLI.deployChaincode(cmd.config, cmd.hosts, cmd.commit, cmd.list, cmd.upgrade);
  });


program
    .command('generate-org-definition')
    .description('generates new org definiton to be added to channel')
    .option('-f, --config <path>', 'Absolute Path to the blockchain deployment definition file', CONFIG_DEFAULT_PATH)
    .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
    .action(async cmd => {
        await CLI.generateNewOrgDefinition(cmd.config, cmd.hosts);
    });


const channelCmd = program.command('channel');
channelCmd
  .command('create')
  .description('create channel if it does not exist')
  .option('-f, --config <path>', 'Absolute path to the blockchain deployment definition file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  //.requiredOption('-t, --channel-tx <channel-path>', 'channel configuration file path')
  .requiredOption('-n, --namech <channel-name>', 'name of the channel')
  .action(async cmd => {
    await CLI.createChannel(cmd.config, cmd.hosts, cmd.namech);
  });

channelCmd
  .command('join')
  .description('join peers to channel')
  .option('-f, --config <path>', 'Absolute path to the blockchain deployment definition file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .requiredOption('-n, --namech <channel-name>', 'name of the channel')
  .action(async cmd => {
    await CLI.joinChannel(cmd.config, cmd.hosts, cmd.namech);
  });

channelCmd
  .command('update')
  .description('commit anchor update to peers on channel')
  .option('-f, --config <path>', 'Absolute path to the blockchain deployment definition file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  //.requiredOption('-a, --anchortx <update-path>', 'configurationTemplateFilePath')
  .requiredOption('-n, --namech <channel-name>', 'name of the channel')
  .action(async (cmd) => {
    await CLI.updateChannel(cmd.config, cmd.hosts, cmd.namech);
  });

channelCmd
  .command('deploy')
  .description('deploy channel')
  .option('-f, --config <path>', 'Absolute path to the blockchain deployment definition file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-n, --namech <channel-name>', 'name of the channel', CHANNEL_DEFAULT_NAME)
  .option('--no-create', 'bypass createChannel')
  .action(async (cmd) => {
    if (cmd.create) await CLI.createChannel(cmd.config, cmd.hosts, cmd.namech);
    await Utils.delay(DOCKER_DELAY);
    await CLI.joinChannel(cmd.config, cmd.hosts, cmd.namech);
    await CLI.updateChannel( cmd.config, cmd.hosts, cmd.namech);
  });


channelCmd
    .command('generate-definition')
    .description('generates a sign able channel definition')
    .option('-f, --config <path>', 'Absolute path to the config deployment file', CONFIG_DEFAULT_PATH)
    .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
    .requiredOption('-o, --orgdef <path>', 'Absolute path to the new org definition')
    .requiredOption('-a, --anchordef <update-path>', 'path to the anchor def file')
    .requiredOption('-n, --namech <path>', 'name channel')
    .action(async (cmd) => {
        await CLI.generateCustomChannelDef(cmd.config, cmd.hosts, cmd.orgdef, cmd.anchordef, cmd.namech);
    });

channelCmd
    .command('sign-definition')
    .description('generates a sign able channel definition')
    .option('-f, --config <path>', 'Absolute path to the config deployment file', CONFIG_DEFAULT_PATH)
    .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
    .requiredOption('-c, --channeldef <update-path>', 'path to the definition to be signed')
    .option('-n, --namech <path>', 'name channel')
    .option('--addOrderer', 'signging add orderer request')
    .option('--systemChannel', 'using system channel')
    .action(async (cmd) => {
        await CLI.signCustomChannelDef(cmd.config, cmd.hosts, cmd.channeldef, cmd.namech, cmd.addOrderer, cmd.systemChannel);
    });

channelCmd
    .command('submit-definition')
    .description('submits a sign able channel definition')
    .option('-f, --config <path>', 'Absolute path to the config deployment file', CONFIG_DEFAULT_PATH)
    .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
    .requiredOption('-c, --channeldef <update-path>', 'path to the definition to be signed')
    .requiredOption('-s, --sigs <update-path>', 'path to the signatures folder')
    .requiredOption('-n, --namech <path>', 'name channel')
    .option('--addOrderer', 'signging add orderer request')
    .action(async (cmd) => {
        await CLI.submitCustomChannelDef(cmd.config, cmd.hosts, cmd.channeldef, cmd.sigs, cmd.namech, cmd.addOrderer);
    });

channelCmd
    .command('add-orderer')
    .description('adds an orderer')
    .option('-f, --config <path>', 'Absolute path to the config deployment file', CONFIG_DEFAULT_PATH)
    .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
    .option('-n, --nameOrd <name-ord>', 'name orderer')
    .option('-p, --portOrd <port-ord>', 'name orderer')
    .option('-namech, --namech  <name-channel>', 'name channel')
    .option('--addTLS', 'adds tls info to channel')
    .option('--addEndpoint', 'adds tls info to channel')
    .option('--systemChannel', 'update the system channel')
    .action(async (cmd) => {
        //add flag --systemChannel if present then its a system-channel else provide the name of the channel
        await CLI.addOrderer(cmd.config, cmd.hosts, cmd.nameOrd, cmd.portOrd, cmd.namech, cmd.addTLS, cmd.addEndpoint, cmd.systemChannel);
    });


const chaincodeCmd = program.command('chaincode');
chaincodeCmd
  .command('install')
  .description('install chaincode')
  .option('-f, --config <path>', 'Absolute path to the chaincode', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-c, --commit <path>', 'Absolute path to the commit config', CONFIG_DEFAULT_PATH)
  .option('-p, --list <items>', 'comma separated list', x => { x.split(','); })
  .action(async (cmd) => {
    await CLI.installChaincode(cmd.config, cmd.hosts, cmd.commit, cmd.list);
  });

chaincodeCmd
  .command('approve')
  .description('approve chaincode')
  .option('-f, --config <path>', 'Absolute path to the chaincode', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-c, --commit <path>', 'Absolute path to the commit config', CONFIG_DEFAULT_PATH)
  .option('--upgrade', 'option used when approving to upgrade chaincode')
  .option('--policy', 'option to force approving chaincode for first time')
  .option('--force', 'option to force approving chaincode for first time')
  .action(async (cmd) => {
    await CLI.approveChaincode(cmd.config, cmd.hosts, cmd.commit, cmd.upgrade, cmd.policy, cmd.force);
  });

chaincodeCmd
  .command('commit')
  .description('commit chaincode')
  .option('-f, --config <path>', 'Absolute path to the config deploy file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-c, --commit <path>', 'Absolute path to the commit config', CONFIG_DEFAULT_PATH)
  .option('--upgrade', 'option used when approving to upgrade chaincode')
  .option('--policy', 'option to force approving chaincode for first time')
  .action(async (cmd) => {
    await CLI.commitChaincode(cmd.config, cmd.hosts, cmd.commit, cmd.upgrade, cmd.policy);
  });

chaincodeCmd
  .command('deploy')
  .description('deploy chaincode')
  .option('-f, --config <path>', 'Absolute path to deploy config file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-c, --commit <path>', 'Absolute path to the commit config', CONFIG_DEFAULT_PATH)
  .option('-p, --list <items>', 'comma separated list of list peers to install chaincode on', x => { x.split(','); })
  .option('--upgrade', 'option used when approving to upgrade chaincode')
  .option('--policy', 'option used to update chaincode level policy')
  .option('--force', 'option used to update chaincode level policy')
  .action(async (cmd) => {
    await CLI.deployChaincode(cmd.config, cmd.hosts, cmd.commit, cmd.list, cmd.upgrade, cmd.policy, cmd.force);
  });

chaincodeCmd
  .command('compile')
  .description('compile chaincode')
  .option('-f, --config <path>', 'Absolute path to deploy config file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-c, --commit <path>', 'Absolute path to the commit config', CONFIG_DEFAULT_PATH)
  .action(async (cmd) => {
    await CLI.startFabricCli(cmd.config, cmd.hosts, cmd.commit, true);
  });

chaincodeCmd
  .command('cli')
  .description('start fabric cli')
  .option('-f, --config <path>', 'Absolute path to deploy config file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-c, --commit <path>', 'Absolute path to the commit config', CONFIG_DEFAULT_PATH)
  .action(async (cmd) => {
    await CLI.startFabricCli(cmd.config, cmd.hosts, cmd.commit);
  });

program.version(pkg.version);
program.parse(process.argv);
