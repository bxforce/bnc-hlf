/* tslint:disable:no-inferrable-types */
import { Organization } from './organization';
import { Channel } from './channel';
import { User } from './user';
import { ConsensusType } from '../utils/constants';

const HL_VERSION = '2.0';
const HL_EXT_VERSION = '0.4.18';

export class NetworkOptions {
  hyperledgerVersion?: string;
  externalHyperledgerVersion?: string;
  inside?: boolean = false;
  networkConfigPath?: string;
  consensus?: ConsensusType;
}

export class Network {
  organizations: Organization[] = [];
  channels: Channel[];

  constructor(public path: string, public options: NetworkOptions) {
    this.options.hyperledgerVersion = HL_VERSION;
    this.options.externalHyperledgerVersion = HL_EXT_VERSION;
  }

  async init() {
    return;
  }

  buildNetwork() {
    return;
  }

  buildFromSave(organizations: Organization[] = [], channels: Channel[] = [], users: User[]) {
    this.organizations = organizations;
    this.channels = channels;
  }

  async buildNetworkFromFile(networkConfigPath: string) {
    return;
  }

  initChannels(config: any) {
    return;
  }

  initOrgs(config: any) {
    return;
  }
}

// const buildNetworkConfig = (configFilePath: string) => {};
