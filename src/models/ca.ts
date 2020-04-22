export class CaOptions {
  engineName?: string;
  number?: number;
  ports?: string;
  host?: string;
  user?: 'admin';
  password?: 'adminpw';
}

export class Ca {
  constructor(public name: string, public options: CaOptions) {}
}
