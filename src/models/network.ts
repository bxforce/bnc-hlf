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
}

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export class Network {
  organizations: Organization[] = [];
  channels: Channel[];

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
