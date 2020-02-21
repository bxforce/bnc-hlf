import * as chalk from 'chalk';

export function d(msg: string) {
  console.log(chalk.green(msg));
}

export function l(msg: string | Error) {
  if (typeof msg === 'string') {
    console.log(chalk.blue(`[BNC] - ${msg}`));
  } else {
    if ((msg as any).responses && (msg as any).responses.length > 0) {
      for (let response of (msg as any).responses) {
        console.log(chalk.red(response.Error));
        console.log(chalk(response));
      }
    } else {
      console.log(chalk.red(msg));
    }
  }
}
