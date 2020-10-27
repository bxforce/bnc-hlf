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
import { OrdererOrganization } from './ordererOrganization';
import { ConsensusType, HLF_DEFAULT_VERSION } from '../../utils/constants';
import { e } from '../../utils/logs';

export class NetworkOptions {
  hyperledgerVersion: HLF_DEFAULT_VERSION.FABRIC;
  hyperledgerCAVersion: HLF_DEFAULT_VERSION.CA;
  hyperledgerThirdpartyVersion : HLF_DEFAULT_VERSION.THIRDPARTY;
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
  channel: Channel;
  ips: []; //added this for extra host ips
  ordererOrganization?: OrdererOrganization; /* This ca will be used to generate only orderer msp */
  
  constructor(public path: string, public options: NetworkOptions) {}

  /**
   * Check a defined set of rules for a valid configuration
   * For example, currently we support only raft consensus protocol & fabric release 2.0 and above
   */
  validate(): boolean {
    if(this.options.hyperledgerVersion !== HLF_DEFAULT_VERSION.FABRIC) {
      e(`This implementation supports currently only HLF ${HLF_DEFAULT_VERSION.FABRIC}`);
      return false;
    }
    if(this.options.consensus !== ConsensusType.RAFT) {
      e(`This implementation supports currently on consensus protocol: ${ConsensusType.RAFT}`);
      return false;
    }
    return true;
  }
}
