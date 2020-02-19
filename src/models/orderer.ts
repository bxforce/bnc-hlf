
export class PeerOptions {
  number: number;
  ports: string[];
  host: string;
}

export class Peer {
  constructor(public name: string, public options: PeerOptions){}
}