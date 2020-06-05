import { Ca } from './ca';
import { Orderer } from './orderer';

export class OrdererOrganizationOptions {
  ca?: Ca;
  orderers?: Orderer[];
  domainName?: string;
  isSecure?: boolean;
}

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export class OrdererOrganization {
  ca: Ca;
  orderers: Orderer[] = [];
  domainName: string;
  isSecure = false;

  constructor(public name: string, options?: OrdererOrganizationOptions) {
    if(options) {
      this.ca = options.ca ?? undefined;
      this.orderers = options.orderers ?? [];
      this.domainName = options.domainName ?? 'unknown';
      this.isSecure = options.isSecure ?? false;
    }
  }

  ordererFullName(orderer: Orderer): string {
    return `${orderer.name}.${this.domainName}`;
  }

  get caName(): string {
    return `${this.ca.name}.${this.name}`;
  }

  get mspName(): string {
    return `${this.name}MSP`;
  }

  get fullName(): string {
    return `${this.name}.${this.domainName}`;
  }
}
