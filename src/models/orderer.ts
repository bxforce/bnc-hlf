export class OrdererOptions {
  engineName: string;
  consensus: string;
  number?: number;
  ports?: string[];
  host?: string;
}

export class Orderer {
  constructor(public name: string, public options: OrdererOptions) {}
}
