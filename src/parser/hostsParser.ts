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

import { BaseParser } from './base';
import { l } from '../utils/logs';

/**
 * Parser class for the deployment configuration file
 *
 */
export class HostsParser extends BaseParser {

    /**
     * Constructor
     * @param filePath deployment configuration full path
     */
    constructor(public filePath: string) {
        super(filePath);
    }

    /**
     * Parse the provided deployment configuration file
     * @return {@link Network} instance with parsed information
     */
    async parse(): Promise<string[]> {
        const parsedYaml = await this.parseRaw();
        let hosts: string[] = [];
        
        l('Starting Parsing hosts file');
        const mapping = parsedYaml['hosts'];
        if (mapping) {
          Object.keys(mapping).forEach(host => {
            mapping[host].targets.forEach(x => { hosts.push(x+":"+mapping[host].ip); });
          });
          
        }
        l('Finish Parsing hosts file');
        
        return hosts
    }
}

