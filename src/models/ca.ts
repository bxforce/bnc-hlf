export class CaOptions {
  engineName?: string;
  number?: number;
  ports?: '7054';
  host?: string;
  user?: 'admin';
  password?: 'adminpw';
  isSecure?: false;
}

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export class Ca {
  constructor(public name: string, public options: CaOptions) {}
}
