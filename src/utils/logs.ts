import * as chalk from 'chalk';

export function l(msg: string | object | Error) {
    if (typeof msg === 'string') {
        console.log(chalk.blue(`[BNC] - ${msg}`));
    } if (typeof msg === 'object') {
        console.log(chalk.blue('[BNC] - ', msg));
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
            console.log(chalk.red('[BNC] - ', msg));
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