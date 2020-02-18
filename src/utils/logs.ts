export function l(msg: string | Error) {
    if (typeof msg === 'string') {
        console.log(`[BNC] - ${msg}`);
    } else {
        if ((msg as any).responses && (msg as any).responses.length > 0) {
            for (let response of (msg as any).responses) {
                console.log(response.Error);
                console.log(response);
            }
        } else {
            console.log(msg);
        }
    }
}