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
import { Channel } from './channel';
import { ConsensusType, EXTERNAL_HLF_VERSION, HLF_CA_VERSION, HLF_VERSION } from '../utils/constants';
import { OrdererOrganization } from './ordererOrganization';
import { e } from '../utils/logs';

export class NetworkOptions {
  hyperledgerVersion?: HLF_VERSION;
  hyperledgerCAVersion?: HLF_CA_VERSION;
  externalHyperledgerVersion?: EXTERNAL_HLF_VERSION;
  inside?: boolean = false;
  networkConfigPath?: string;
  consensus?: ConsensusType;
  forDeployment?: boolean;
}

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export class Network {
  organizations: Organization[] = [];
  channels: Channel[];
  //added this for extra host ips
  ips: [];

  /* This ca will be used to generate only orderer msp */
  ordererOrganization?: OrdererOrganization;

  constructor(public path: string, public options: NetworkOptions) {}

  /**
   * Check a defined set of rules for a valid configuration
   * For example, currently we support only raft consensus protocol & fabric release 2.0 and above
   */
  validate(): boolean {
    if(this.options.hyperledgerVersion !== HLF_VERSION.HLF_2) {
      e(`This implementation supports currently only HLF ${HLF_VERSION.HLF_2}`);
      return false;
    }

    if(this.options.consensus !== ConsensusType.RAFT) {
      e(`This implementation supports currently on consensus protocol: ${ConsensusType.RAFT}`);
      return false;
    }

    return true;
  }
}
