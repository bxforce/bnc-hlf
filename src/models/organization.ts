import { Channel } from './channel';
import { User } from './user';
import { Peer } from './peer';
import { Orderer } from './orderer';
import { Engine } from './engine';
import { join } from 'path';

export class OrganizationOptions {
  peers: Peer[];
  orderers: Orderer[];
  engines?: Engine[];
  channels?: Channel[];
  users?: User[];
  templateFolder?: string;
  fabricVersion?: string;
  tls?: boolean;
  domainName?: string;
}

export class Organization {
  channels: Channel[];
  peers: Peer[];
  orderers: Orderer[];
  users: User[];
  engines: Engine[];
  templateFolder: string;
  fabricVersion: string;
  isSecure = false;
  domainName: string;

  constructor(public name: string, options?: OrganizationOptions) {
    if (options) {
      this.channels = options.channels;
      this.peers = options.peers;
      this.orderers = options.orderers;
      this.users = options.users;
      this.engines = options.engines;
      this.templateFolder = options.templateFolder;
      this.fabricVersion = options.fabricVersion;
      this.isSecure = options.tls;
      this.domainName = options.domainName;
    }
  }

  get fullName(): string {
    return `${this.name}.${this.domainName}`;
  }

  get firstPeerFullName(): string {
    if (this.peers.length === 0) {
      return 'dummy';
    }

    const peer0 = this.peers.filter(peer => peer.options.number === 0)[0];
    return `${peer0.name}.${this.fullName}`;
  }
}
