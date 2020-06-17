import * as path from 'path';
import { exec } from 'child_process';
import * as uuid from 'uuid';

const SANDBOX = 'test/sandbox/';

export type ResultProps = {
  code: number;
  stdout: string;
  stderr: string;
  error ?: object;
};

describe('Basic command', () => {
  test('Should return the version of the command line', async () => {
    const pkg = require('../../package.json');
    let result = await cli(['-V'], '.');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(pkg.version);
  }, 150000);
});

function cli(args, cwd): Promise<ResultProps> {
  return new Promise(resolve => {
    exec(`node ${path.resolve('dist/command')} ${args.join(' ')}`,
      { cwd },
      (error, stdout, stderr) => { resolve({
        code: error && error.code ? error.code : 0,
        error,
        stdout,
        stderr });
      });
  });
}

function tmp(ext) {
  ext = ext || '';
  return path.join(SANDBOX, uuid(), ext);
}
