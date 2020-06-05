export class OrdererOptions {
  consensus: string;
  engineName?: string;
  number?: number;
  ports?: string[];
  host?: string;
}

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export class Orderer {
  constructor(public name: string, public options: OrdererOptions) {}

  get mspName(): string {
    return `${this.name}MSP`;
  }
}
