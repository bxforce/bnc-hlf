import { Channel } from './channel';
import { User } from './user';
import { Peer } from './peer';
import { Orderer } from './orderer';
import { Engine } from './engine';
import { Ca } from './ca';

export class OrganizationOptions {
  peers: Peer[];
  orderers: Orderer[];
  ca?: Ca;
  engines?: Engine[];
  channels?: Channel[];
  users?: User[];
  templateFolder?: string;
  fabricVersion?: string;
  tls?: boolean;
  domainName?: string;
  engineOrgName?: string;
}

export class Organization {
  channels: Channel[];
  ca: Ca;
  peers: Peer[];
  orderers: Orderer[];
  users: User[];
  engines: Engine[];
  engineOrgName: string;
  templateFolder: string;
  fabricVersion: string;
  isSecure = false;
  domainName: string;

  constructor(public name: string, options?: OrganizationOptions) {
    if (options) {
      this.channels = options.channels;
      this.ca = options.ca;
      this.peers = options.peers;
      this.orderers = options.orderers;
      this.users = options.users;
      this.engines = options.engines;
      this.engineOrgName = options.engineOrgName;
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

  get mspName(): string {
    return `${this.name}MSP`;
  }

  get caName(): string {
    return `${this.ca.name}.${this.name}`;
  }

  /**
   * return the peer full name
   * @param pIndex
   */
  peerFullName(pIndex): string {
    if (!!this.peers && this.peers.length === 0) {
      throw new Error(`No peers available for organisation ${this.name}`);
    }

    const peer = this.peers.find(p => p.options.number === pIndex);
    return `${peer.name}.${this.fullName}`;
  }

  /**
   * return the address of the gossip peer (needed to generate the peer docker compose file)
   * @param pIndex
   */
  gossipPeer(pIndex): string {
    if (!!this.peers && this.peers.length === 0) {
      throw new Error(`No peers available for organisation ${this.name}`);
    }

    if(this.peers.length === 1) {
      return `${this.peers[0].name}.${this.fullName}:${this.peers[0].options.ports[0]}`;
    }

    const index = pIndex === 0 ? 1 : 0;
    const peer = this.peers.find(p => p.options.number === index);
    return `${peer.name}.${this.fullName}:${peer.options.ports[0]}`;
  }

  ordererName(orderer: Orderer ): string {
    return `${orderer.name}.${this.domainName}`;
  }

  ordererFullName(orderer: Orderer ): string {
    return `${orderer.name}.${this.fullName}`;
  }

  engineHost(engineName: string): string {
    const engine = this.engines.find(eng => eng.name === engineName);
    return engine ? engine.options.url : 'undefined';
  }
}
