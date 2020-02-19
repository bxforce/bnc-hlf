
export class EngineOptions {
  ip: string;
  port: number;
  url?: string;
  secure?: boolean;
  settings?: {};
}

export class Engine {
  constructor(public name: string, public options: EngineOptions) {}
}