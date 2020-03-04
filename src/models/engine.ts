export class EngineOptions {
  port: number;
  url?: string;
  secure?: boolean;
  type?: string;
  settings?: {};
}

export class Engine {
  constructor(public name: string, public options: EngineOptions, public orgName?: string) {}
}
