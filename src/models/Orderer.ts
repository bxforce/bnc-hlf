export class OrdererOption {
  consensus: string;
  port?: [];
}

export class Orderer {
  constructor(public name: string, public Options: OrdererOption) {}
}