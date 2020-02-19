export class OrdererOptions {
  number: number;
  ports: string[];
  host: string;
}

export class Orderer {
  constructor(public name: string, public options: OrdererOptions) {}
}
