export class PeerOptions {
  engineName?: string;
  number: number;
  ports: string[];
  couchDB?: boolean;
  couchDbPort?: string;
  host?: string;
}

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export class Peer {
  constructor(public name: string, public options?: PeerOptions) {}
}
