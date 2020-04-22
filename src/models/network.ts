/* tslint:disable:no-inferrable-types */
import { Organization } from './organization';
import { Channel } from './channel';
import { User } from './user';
import { ConsensusType } from '../utils/constants';

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

  constructor(public path: string, public options: NetworkOptions) {}

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
