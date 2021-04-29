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
  .option('-batchTimeout, --batchTimeout <batchTimeout>', 'BatchTimeout')
  .option('-maxMessageCount, --maxMessageCount <maxMessageCount>', 'MaxMessageCount')
  .option('-absoluteMaxBytes, --absoluteMaxBytes <absoluteMaxBytes>', 'AbsoluteMaxBytes')
  .option('-preferredMaxBytes, --preferredMaxBytes <preferredMaxBytes>', 'PreferredMaxBytes')
  .action(async cmd => {
    await CLI.init(cmd.config, cmd.genesisBlock, cmd.configTx, cmd.anchorTx, cmd.batchTimeout, cmd.maxMessageCount, cmd.absoluteMaxBytes, cmd.preferredMaxBytes);
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
    .command('download')
    .description('downloads binaries')
    .option('-f, --config <path>', 'Absolute Path to the blockchain deployment definition file', CONFIG_DEFAULT_PATH)
    .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
    .action(async (cmd: any) => {
        if (cmd) {
            await CLI.download(cmd.config, cmd.hosts);
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
  .option('-batchTimeout, --batchTimeout <batchTimeout>', 'BatchTimeout')
  .option('-maxMessageCount, --maxMessageCount <maxMessageCount>', 'MaxMessageCount')
  .option('-absoluteMaxBytes, --absoluteMaxBytes <absoluteMaxBytes>', 'AbsoluteMaxBytes')
  .option('-preferredMaxBytes, --preferredMaxBytes <preferredMaxBytes>', 'PreferredMaxBytes')
  .action(async cmd => {
    await CLI.generatePeersCredentials(cmd.config, cmd.hosts);
    await CLI.generateOrdererCredentials(cmd.config, cmd.hosts);
    if (cmd.genesis) {
        await CLI.init(cmd.genesis, cmd.genesisBlock, cmd.configTx, cmd.anchorTx, cmd.batchTimeout, cmd.maxMessageCount, cmd.absoluteMaxBytes, cmd.preferredMaxBytes);
    }
  });



program
  .command('start')
  .description('create/start network')
  .option('-f, --config <path>', 'Absolute Path to the blockchain deployment  definition file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-o, --ordererConfig <path>', 'Absolute path for new config file of orderer')
  .option('--no-orderer', 'bypass createChannel')
  .option('--addOrderer', 'signging add orderer request')
  .option('--noCli', 'without starting orderer cli for generating bootstrap')
  .option('--enableCA', 'starts the cas also ')
  .action(async cmd => {
      if(cmd.addOrderer){
          await CLI.startNewOrderer(cmd.config, cmd.hosts, cmd.ordererConfig, cmd.noCli);
      }else{
          await CLI.deployHlfServices(cmd.config, cmd.hosts, !!cmd.skipDownload, true, cmd.orderer, cmd.enableCA);
      }

  });

program
  .command('stop')
  .description('stop the blockchain')
  .option('-f, --config <path>', 'Absolute Path to the blockchain deployment  definition file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  //.option('-R, --no-rmi', 'Do not remove docker images'
      .option('-R, --rmi', 'Do not remove docker images')
  .action(async (cmd: any) => {
    await CLI.stopHlfServices(cmd.config, cmd.hosts, cmd.rmi);
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
  .option('-p, --list <items>', 'comma separated list of list peers to install chaincode on', x => { return x.split(','); })
  .option('--upgrade', 'option used when approving to upgrade chaincode')
    .option('--policy', 'option used to update chaincode level policy')
    .option('--private', 'option to approve chaincode with privateData')
    .option('--force', 'option used to update chaincode level policy')
  .option('--no-chaincode', 'bypass chaincode')
  .option('-batchTimeout, --batchTimeout <batchTimeout>', 'BatchTimeout')
  .option('-maxMessageCount, --maxMessageCount <maxMessageCount>', 'MaxMessageCount')
  .option('-absoluteMaxBytes, --absoluteMaxBytes <absoluteMaxBytes>', 'AbsoluteMaxBytes')
  .option('-preferredMaxBytes, --preferredMaxBytes <preferredMaxBytes>', 'PreferredMaxBytes')
  .option('--enableCA', 'starts the CAs only needed after stopping all containers ')
  .action(async (cmd: any) => {
    await CLI.generatePeersCredentials(cmd.config, cmd.hosts);
    await CLI.generateOrdererCredentials(cmd.config, cmd.hosts);
    await CLI.init(cmd.genesis, cmd.genesisBlock, cmd.configTx, cmd.anchorTx, cmd.batchTimeout, cmd.maxMessageCount, cmd.absoluteMaxBytes, cmd.preferredMaxBytes);
    await CLI.deployHlfServices(cmd.config, cmd.hosts, !!cmd.skipDownload, true, true, cmd.enableCA);
    await Utils.delay(DOCKER_DELAY);
    await CLI.createChannel(cmd.config, cmd.hosts, cmd.namech);
    await Utils.delay(DOCKER_DELAY);
    await CLI.joinChannel(cmd.config, cmd.hosts, cmd.namech);
    await CLI.updateChannel(cmd.config, cmd.hosts, cmd.namech);
    await CLI.startFabricCli(cmd.config, cmd.hosts, cmd.commit);
    if (cmd.chaincode) await CLI.deployChaincode(cmd.config, cmd.hosts, cmd.commit, cmd.list, cmd.upgrade,  cmd.policy, cmd.private, cmd.force);
  });


program
    .command('generate-org-definition')
    .description('generates new org definiton to be added to channel')
    .option('-f, --config <path>', 'Absolute Path to the blockchain deployment definition file', CONFIG_DEFAULT_PATH)
    .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
    .option('--addOrderer', 'will generate new orderer json files')
    .action(async cmd => {
        await CLI.generateNewOrgDefinition(cmd.config, cmd.hosts, cmd.addOrderer);
    });

program
    .command('generate-new-genesis')
    .description('generates new genesis to bootstrap new orderer')
    .option('-f, --config <path>', 'Absolute Path to the blockchain deployment definition file', CONFIG_DEFAULT_PATH)
    .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
    .action(async cmd => {
        await CLI.generateNewGenesis(cmd.config, cmd.hosts);
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
    .option('-n, --namech <path>', 'name channel')
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
    .option('-n, --namech <path>', 'name channel')
    .option('--addOrderer', 'signging add orderer request')
    .option('--systemChannel', 'using system channel')
    .action(async (cmd) => {
        await CLI.submitCustomChannelDef(cmd.config, cmd.hosts, cmd.channeldef, cmd.sigs, cmd.namech, cmd.addOrderer, cmd.systemChannel);
    });

channelCmd
    .command('add-orderer')
    .description('adds an orderer')
    .option('-f, --config <path>', 'Absolute path to the config deployment file', CONFIG_DEFAULT_PATH)
    .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
    .option('-o, --nameOrd <name-ord>', 'name orderer')
    .option('-p, --portOrd <port-ord>', 'port orderer')
    .option('-n, --namech  <name-channel>', 'name channel')
    .option('-org, --ordererOrg <path>', 'Absolute Path to the new orderer org file')
    .option('--addTLS', 'adds tls info to channel')
    .option('--addEndpoint', 'adds tls info to channel')
    .option('--systemChannel', 'update the system channel')
    .action(async (cmd) => {
        await CLI.addOrderer(cmd.config, cmd.hosts, cmd.nameOrd, cmd.portOrd, cmd.namech, cmd.addTLS, cmd.addEndpoint, cmd.systemChannel, cmd.ordererOrg);
    });


channelCmd
    .command('add-new-orderer-org')
    .description('adds an orderer')
    .option('-f, --config <path>', 'Absolute path to the config deployment file', CONFIG_DEFAULT_PATH)
    .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
    .option('-o, --ordererOrgDef <path>', 'path to the orderer org def')
    .option('-n, --namech <name-channel>', 'name of the channel')
    .action(async (cmd) => {
        await CLI.addNewOrdererOrganization(cmd.config, cmd.hosts, cmd.ordererOrgDef, cmd.namech);
    });


const chaincodeCmd = program.command('chaincode');
chaincodeCmd
  .command('install')
  .description('install chaincode')
  .option('-f, --config <path>', 'Absolute path to the chaincode', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-c, --commit <path>', 'Absolute path to the commit config', CONFIG_DEFAULT_PATH)
  .option('-p, --list <items>', 'comma separated list', x => { return x.split(','); })
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
    .option('--private', 'option to approve chaincode with privateData')
  .option('--force', 'option to force approving chaincode for first time')
  .action(async (cmd) => {
    await CLI.approveChaincode(cmd.config, cmd.hosts, cmd.commit, cmd.upgrade, cmd.policy, cmd.private, cmd.force);
  });

chaincodeCmd
  .command('commit')
  .description('commit chaincode')
  .option('-f, --config <path>', 'Absolute path to the config deploy file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-c, --commit <path>', 'Absolute path to the commit config', CONFIG_DEFAULT_PATH)
  .option('--upgrade', 'option used when approving to upgrade chaincode')
  .option('--policy', 'option to force approving chaincode for first time')
    .option('--private', 'option to approve chaincode with privateData')
  .action(async (cmd) => {
    await CLI.commitChaincode(cmd.config, cmd.hosts, cmd.commit, cmd.upgrade, cmd.policy, cmd.private);
  });

chaincodeCmd
  .command('deploy')
  .description('deploy chaincode')
  .option('-f, --config <path>', 'Absolute path to deploy config file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-c, --commit <path>', 'Absolute path to the commit config', CONFIG_DEFAULT_PATH)
  .option('-p, --list <items>', 'comma separated list of list peers to install chaincode on', x => { return x.split(','); })
  .option('--upgrade', 'option used when approving to upgrade chaincode')
  .option('--policy', 'option used to update chaincode level policy')
    .option('--private', 'option to approve chaincode with privateData')
  .option('--force', 'option used to update chaincode level policy')
  .action(async (cmd) => {
    await CLI.deployChaincode(cmd.config, cmd.hosts, cmd.commit, cmd.list, cmd.upgrade, cmd.policy, cmd.private, cmd.force);
  });

chaincodeCmd
  .command('invoke')
  .description('invoke chaincode')
  .option('-f, --config <path>', 'Absolute path to deploy config file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-c, --commit <path>', 'Absolute path to the commit config', CONFIG_DEFAULT_PATH)
  .option('-i, --list <items>', 'comma separated list', x => { return x.split(','); })
  .action(async (cmd) => {
    await CLI.invokeChaincode(cmd.config, cmd.hosts, cmd.commit, cmd.list);
  });

chaincodeCmd
  .command('query')
  .description('query chaincode')
  .option('-f, --config <path>', 'Absolute path to deploy config file', CONFIG_DEFAULT_PATH)
  .option('-h, --hosts <path>', 'Absolute Path to the blockchain hosts definition file')
  .option('-c, --commit <path>', 'Absolute path to the commit config', CONFIG_DEFAULT_PATH)
  .option('-i, --list <items>', 'comma separated list', x => { return x.split(','); })
  .action(async (cmd) => {
    await CLI.queryChaincode(cmd.config, cmd.hosts, cmd.commit, cmd.list);
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
