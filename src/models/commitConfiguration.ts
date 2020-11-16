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
import { ConsensusType } from '../utils/constants';
import { OrdererOrganization } from './ordererOrganization';
import { e } from '../utils/logs';

export class commitOptions {
    channelName: string;
    chaincodeName: string;
    chaincodeRootPath: string;
    scriptsRootPath: string;
    chaincodePath: string;
    version: string;
    endorsementPolicy?: string;
}



export class CommitConfiguration {

    organizations: Organization[] = [];
    /* This ca will be used to generate only orderer msp */
    ordererOrganization?: OrdererOrganization;

    constructor(public path: string,
                public channelName: string,
                public chaincodeName: string,
                public chaincodeRootPath: string,
                public scriptsRootPath: string,
                public chaincodePath: string,
                public version: string,
                public endorsementPolicy?: string) {
        this.channelName= channelName;
        this.chaincodeName= chaincodeName;
        this.chaincodeRootPath= chaincodeRootPath;
        this.chaincodePath= chaincodePath;
        this.scriptsRootPath= scriptsRootPath;
        this.version= version;
        if(endorsementPolicy){
            this.endorsementPolicy = endorsementPolicy;
        }

    }


}
