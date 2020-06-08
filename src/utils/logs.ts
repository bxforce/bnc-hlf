/*
Copyright 2020 IRT SystemX

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 *
 * @author wassim.znaidi@gmail.com
 */
import * as chalk from 'chalk';

export function l(msg: string | object | Error) {
  if (typeof msg === 'string') {
    console.log(chalk.blue(`[BNC] - ${msg}`));
    return;
  }
  if (typeof msg === 'object') {
    console.log('[BNC] - ', msg);
    return;
  } else {
    if ((msg as any).responses && (msg as any).responses.length > 0) {
      for (let response of (msg as any).responses) {
        console.log(chalk.red(response.Error));
        console.log(chalk.red(response));
      }
    } else {
      console.log(chalk.red(msg));
    }
  }
}

export function e(msg: string | object) {
  switch (typeof msg) {
    case 'string': {
      console.log(chalk.red(`[BNC] - ${msg}`));
      break;
    }
    case 'object': {
      // @ts-ignore
      const errMsg = msg?.err ?? msg;
      console.log(chalk.red('[BNC] - ', errMsg));
      break;
    }
    default:
      break;
  }
}

export function d(msg: string | object) {
  switch (typeof msg) {
    case 'string': {
      console.log(chalk.green(`[BNC] - ${msg}`));
      break;
    }
    case 'object': {
      console.log(chalk.green('[BNC] - ', msg));
      break;
    }
    default:
      break;
  }
}
