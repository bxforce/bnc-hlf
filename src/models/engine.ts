export class EngineOptions {
  port: number;
  url?: string;
  secure?: boolean;
  type?: string;
  settings?: {};
}

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export class Engine {
  constructor(public name: string, public options: EngineOptions, public orgName?: string) {}
}
