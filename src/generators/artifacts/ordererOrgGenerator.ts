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

import { BaseGenerator } from '../base';
import { Network } from '../../parser/model/network';
import { Organization } from '../../parser/model/organization';
import { OrdererOrganization } from '../../parser/model/ordererOrganization';
import { Utils } from '../../utils/helper';
import { e } from '../../utils/logs';
import { SysWrapper } from '../../utils/sysWrapper';
import { CHANNEL_RAFT_ID, ConsensusType, GENESIS_FILE_NAME } from '../../utils/constants';
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

/**
 * Class Responsible to generate ConfigTx.yaml and generate the Genesis block
 * This use the configtxgen binary provided by HLF
 *
 * @author wassim.znaidi@gmail.com
 */
export class OrdererOrgGenerator extends BaseGenerator {
    /* configtx.yaml contents */
    contents = `
Organizations:  
  - &${this.ordOrg.name}
    Name: ${this.ordOrg.name}
    ID: ${this.ordOrg.mspName}
    MSPDir: ${getOrdererOrganizationRootPath(this.network.options.networkConfigPath, `${this.ordOrg.orgName}.${this.ordOrg.domainName}`)}/msp
    Policies: &${this.ordOrg.name}POLICIES
        Readers:
            Type: Signature
            Rule: "OR('${this.ordOrg.mspName}.member')"
        Writers:
            Type: Signature
            Rule: "OR('${this.ordOrg.mspName}.member')"
        Admins:
            Type: Signature
            Rule: "OR('${this.ordOrg.mspName}.admin')"   
    OrdererEndpoints:
${this.ordOrg.orderers.map(org => `    
        - ${org.name}.${org.options.domainName}:${org.options.ports[0]}
`).join('')}
              
  `;

    /**
     * Constructor
     * @param filename
     * @param path
     * @param network
     */
    constructor(filename: string, path: string, private network: Network, private ordOrg: OrdererOrganization) {
        super(filename, getOrdererOrganizationRootPath(path, `${ordOrg.orgName}.${ordOrg.domainName}`));
    }

    async generateDefinition(): Promise<boolean> {
        try{
            const jsonFile = `${this.ordOrg.name}.json`;
            const artifactsPath = getArtifactsPath(this.network.options.networkConfigPath)
            const artifactsExists = await SysWrapper.existsPath(artifactsPath);
            if(!artifactsExists) {
                await SysWrapper.createFolder(`${artifactsPath}`);
            }

            const scriptContent = `
export PATH=${getHlfBinariesPath(this.network.options.networkConfigPath, this.network.options.hyperledgerVersion)}:${this.network.options.networkConfigPath}:$PATH
export FABRIC_CFG_PATH=${this.network.options.networkConfigPath}  

which configtxgen
if [ "$?" -ne 0 ]; then
  echo "configtxgen tool not found. exiting"
  exit 1
fi    
  

configtxgen --configPath ${this.path} -printOrg ${this.ordOrg.name}  > ${artifactsPath}/${jsonFile}
res=$?

if [ $res -ne 0 ]; then
  echo "Failed to generate json definition for ${this.ordOrg.mspName}..."
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


}
