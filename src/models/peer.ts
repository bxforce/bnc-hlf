export class PeerOptions {
  engineName: string;
  number: number;
  ports: string[];
  couchDB?: boolean;
  couchDbPort: string;
}

export class Peer {
  constructor(public name: string, public options?: PeerOptions) {}
}
