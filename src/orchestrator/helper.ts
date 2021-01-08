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
import {join} from 'path';
import {DeploymentParser} from '../parser/deploymentParser';
import {HostsParser} from '../parser/hostsParser';
import {GenesisParser} from '../parser/genesisParser';
import {Organization} from '../parser/model/organization';
import {Peer} from '../parser/model/peer';
import {Network} from '../parser/model/network';
import {ConfigurationValidator} from '../parser/validator/configurationValidator';
import {DownloadFabricBinariesGenerator} from '../generators/utils/downloadFabricBinaries';
import {d, e, l} from '../utils/logs';
import {Utils} from '../utils/helper';
import {CommitParser} from '../parser/commitParser';
import {CommitConfiguration} from '../parser/model/commitConfiguration';
import {
    NETWORK_ROOT_PATH
} from '../utils/constants';

/**
 * Main tools orchestrator
 *
 * @author sahar fehri
 */
export class Helper {

    /**
     * Parse & validate deployment configuration file
     * @param deploymentConfigPath
     * @param hostsConfigPath
     */
     static async _parse(deploymentConfigPath: string, hostsConfigPath: string): Promise<Network> {
        l('[Start] Start parsing the blockchain configuration file');
        l('Validate input configuration file');
        const validator = new ConfigurationValidator();
        const isValid = validator.isValidDeployment(deploymentConfigPath);

        if (!isValid) {
            e('Configuration file is invalid');
            return;
        }
        l('Configuration file valid');

        let configParser = new DeploymentParser(deploymentConfigPath);
        const network = await configParser.parse();

        //set hosts
        if (hostsConfigPath) {
            let hostsParser = new HostsParser(hostsConfigPath);
            network.hosts = await hostsParser.parse();
        }
        l('[End] Blockchain configuration files parsed');

        return network;
    }

    /**
     * Parse & validate genesis configuration file
     * @param genesisConfigPath
     */
    static async _parseGenesis(genesisConfigPath: string): Promise<Network | undefined> {
        try {
            l('Parsing genesis input file');
            const validator = new ConfigurationValidator();
            const isValid = validator.isValidGenesis(genesisConfigPath);
            if (!isValid) {
                e('Genesis configuration input file is invalid');
                return;
            }
            l('Input genesis file validated');

            l('Start parsing genesis input file');
            const parser = new GenesisParser(genesisConfigPath);
            const network: Network = await parser.parse();
            l('Genesis input file parsed');

            return network;
        } catch (err) {
            e(err);
            return null;

        }
    }

    static async _parseCommitConfig(commitConfigPath: string): Promise<CommitConfiguration> {
        l('[Start] Start parsing the blockchain configuration file');

        let configParse = new CommitParser(commitConfigPath);
        const conf = await configParse.parse();
        l('[End] Blockchain configuration files parsed');
        return conf;
    }

    /**
     * Return the default path where to store all files and materials
     * @private
     */
    static _getDefaultPath(): string {
        const homedir = require('os').homedir();
        return join(homedir, NETWORK_ROOT_PATH);
    }

    /**
     * download hyperledger fabric binaries
     * @param folderPath folder where to store files
     * @param network
     */
    static async _downloadBinaries(folderPath: string, network: Network): Promise<boolean> {
        try {
            l('[Start] Download fabric binaries...');
            const downloadFabricBinariesGenerator = new DownloadFabricBinariesGenerator('downloadFabric.sh', folderPath, network);
            await downloadFabricBinariesGenerator.save();
            await downloadFabricBinariesGenerator.run();
            l('[End] Ran Download fabric binaries');

            return true;
        } catch (err) {
            e(err);
            return false;
        }
    }

    
}
