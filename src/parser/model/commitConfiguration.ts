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

export class commitOptions {
    channelName: string;
    chaincodeName: string;
    chaincodeRootPath: string;
    scriptsRootPath: string;
    compilationCommand: string;
    chaincodePath: string;
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
                public compilationCommand: string,
                public chaincodePath: string,
                public version: string,
                public endorsementPolicy?: string) {
        this.channelName = channelName;
        this.chaincodeName = chaincodeName;
        this.chaincodeRootPath = chaincodeRootPath;
        this.scriptsRootPath = scriptsRootPath;
        this.compilationCommand = compilationCommand,
        this.chaincodePath = chaincodePath;
        this.version = version;
        this.endorsementPolicy = endorsementPolicy;
    }
}
