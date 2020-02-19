
import { Channel } from './channel';
import { User } from './user';
import { Peer } from './peer';
import {Orderer} from './Orderer';

export class OrganizationOptions {
  channels: Channel[];
  peers: Peer[];
  orderers: Orderer[];
  users: User[];
}

export class Organization {
  channels: Channel[];
  peers: Peer[];
  orderers: Orderer[];
  users: User[];

  constructor(public name: string, options: OrganizationOptions) {
    this.channels = options.channels;
    this.peers = options.peers;
    this.orderers = options.orderers;
    this.users = options.users;
  }
}
