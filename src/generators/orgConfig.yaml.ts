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

import { BaseGenerator } from './base';
import { Network } from '../models/network';
import { Utils } from '../utils/utils';
import { e } from '../utils/logs';
import { SysWrapper } from '../utils/sysWrapper';
import { CHANNEL_RAFT_ID, ConsensusType, GENESIS_FILE_NAME } from '../utils/constants';
import getOrdererOrganizationRootPath = Utils.getOrdererOrganizationRootPath;
import getOrdererTlsPath = Utils.getOrdererTlsPath;
import getHlfBinariesPath = Utils.getHlfBinariesPath;
import getArtifactsPath = Utils.getArtifactsPath;
import getPeerOrganizations = Utils.getPeerOrganizations;
import execContent = SysWrapper.execContent;
import getOrganizationMspPath = Utils.getOrganizationMspPath;
import existsPath = SysWrapper.existsPath;
import existsFolder = SysWrapper.existsFolder;
import createFile = SysWrapper.createFile;
import {Organization} from '../models/organization';

/**
 * Class Responsible to generate ConfigTx.yaml and generate the Genesis block
 * This use the configtxgen binary provided by HLF
 *
 * @author wassim.znaidi@gmail.com
 */
export class orgConfigYaml extends BaseGenerator {
    /* configtx.yaml contents */
    contents = `
Organizations:  
  - &${this.org.name}
    Name: ${this.org.mspName}
    ID: ${this.org.mspName}
    MSPDir: ${getOrganizationMspPath(this.network.options.networkConfigPath, this.org)}
    Policies: &${this.org.name}POLICIES
        Readers:
            Type: Signature
            Rule: "OR('${this.org.mspName}.admin', '${this.org.mspName}.peer', '${this.org.mspName}.client')"
        Writers:
            Type: Signature
            Rule: "OR('${this.org.mspName}.admin', '${this.org.mspName}.client')"
        Admins:
            Type: Signature
            Rule: "OR('${this.org.mspName}.admin')"
        Endorsement:
            Type: Signature
            Rule: "OR('${this.org.mspName}.peer')"
    AnchorPeers:
        - Host: ${this.org.peers[0].name}.${this.org.fullName}
          port: ${this.org.peers[0].options.ports[0]}                   
  `;

    /**
     * Constructor
     * @param filename
     * @param path
     * @param network
     */
    constructor(filename: string, path: string, private network: Network, private org: Organization) {
        super(filename, getPeerOrganizations(path, org.fullName));
    }
    
    async generateDefinition(): Promise<boolean> {
        try{
            const jsonFile = `${this.org.name}.json`;
            console.log(this.path)
            console.log(this.network.options.networkConfigPath)
            const artifactsPath = getArtifactsPath(this.network.options.networkConfigPath)

            const scriptContent = `
export PATH=${getHlfBinariesPath(this.network.options.networkConfigPath, this.network.options.hyperledgerVersion)}:${this.network.options.networkConfigPath}:$PATH
export FABRIC_CFG_PATH=${this.network.options.networkConfigPath}  

which configtxgen
if [ "$?" -ne 0 ]; then
  echo "configtxgen tool not found. exiting"
  exit 1
fi    
  

configtxgen --configPath ${this.path} -printOrg ${this.org.mspName}  > ${artifactsPath}/${jsonFile}
res=$?

if [ $res -ne 0 ]; then
  echo "Failed to generate json definition for ${this.org.mspName}..."
  exit 1
fi
    `;

            // check if configtx.yaml exists
            const jsonPath = `${this.path}/${jsonFile}`;
            const jsonExist = existsPath(jsonPath);
            if (!jsonExist) {
                e(`Anchor peer update ${jsonPath} does not exists, exit now !!! `);
                return false;
            }

            // execute the scripts
            await execContent(scriptContent);

            return true;

        }catch(err){
            e(err);
            return false;
        }
    }
    
    async generateAnchorDefinition(){
        const artifactsPath = getArtifactsPath(this.network.options.networkConfigPath)
        let anchorDef = {
            "mod_policy": "Admins",
            "value":{"anchor_peers": [{"host": `${this.org.peers[0].name}.${this.org.fullName}`,"port": `${this.org.peers[0].options.ports[0]} `}]},
            "version": "0"
        }
        let contentAsStr = JSON.stringify(anchorDef)
        let filePath = `${artifactsPath}/${this.org.name}Anchor.json`
        //save this to artifacts folder to be used later for channel DEF creation
        createFile(filePath, contentAsStr);

    }
}
