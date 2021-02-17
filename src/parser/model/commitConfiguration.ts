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

/* tslint:disable:no-inferrable-types */
import { Organization } from './organization';
import { OrdererOrganization } from './ordererOrganization';
import { CHAINCODE_DEFAULT_CHAINCODE_ROOT_PATH, CHAINCODE_DEFAULT_CHAINCODE_LANG, CHAINCODE_DEFAULT_CHAINCODE_ENV, CHAINCODE_DEFAULT_CHAINCODE_PATH, CHAINCODE_DEFAULT_SCRIPTS_ROOT_PATH, CHAINCODE_DEFAULT_SCRIPTS_PATH } from '../../utils/constants';

export class commitOptions {
    channelName: string;
    chaincodeName: string;
    chaincodeRootPath: string;
    scriptsRootPath: string;
    chaincodeLang: string;
    chaincodeEnv: string;
    chaincodePath: string;
    scriptsPath: string;
    version: string;
    endorsementPolicy?: string;
}

export class CommitConfiguration {
    organizations: Organization[] = [];
    ordererOrganization?: OrdererOrganization; /* This ca will be used to generate only orderer msp */
    constructor(public path: string,
                public channelName: string,
                public chaincodeName: string,
                public chaincodeRootPath: string,
                public scriptsRootPath: string,
                public chaincodeLang: string,
                public chaincodeEnv: string,
                public chaincodePath: string,
                public scriptsPath: string,
                public version: string,
                public endorsementPolicy?: string) {
        this.channelName = channelName;
        this.chaincodeName = chaincodeName;
        this.chaincodeRootPath = chaincodeRootPath && chaincodeRootPath.length > 0 ? chaincodeRootPath : CHAINCODE_DEFAULT_CHAINCODE_ROOT_PATH;
        this.scriptsRootPath = scriptsRootPath && scriptsRootPath.length > 0 ? scriptsRootPath : CHAINCODE_DEFAULT_SCRIPTS_ROOT_PATH;
        this.chaincodeLang = chaincodeLang && chaincodeLang.length > 0 ? chaincodeLang : CHAINCODE_DEFAULT_CHAINCODE_LANG;
        this.chaincodeEnv = chaincodeEnv && chaincodeEnv.length > 0 ? chaincodeEnv : CHAINCODE_DEFAULT_CHAINCODE_ENV;
        this.chaincodePath = chaincodePath && chaincodePath.length > 0 ? chaincodePath : CHAINCODE_DEFAULT_CHAINCODE_PATH;
        this.scriptsPath = scriptsPath && scriptsPath.length > 0 ? scriptsPath : CHAINCODE_DEFAULT_SCRIPTS_PATH;
        this.version = version;
        this.endorsementPolicy = endorsementPolicy;
    }
}
