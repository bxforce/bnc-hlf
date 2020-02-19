/* tslint:disable:no-unused-variable */
import { l } from './utils/logs';

export class CLI {

    static async cleanNetwork(rmi: boolean) {
        return;
    }
}

export class NetworkCLI {
    networkRootPath = './hyperledger-fabric-network';

    public async clean(rmi: boolean) {
        l('************ Success!');
        l('Environment cleaned!');
    }
}

export class ChaincodeCLI {
    networkRootPath = './hyperledger-fabric-network';

    constructor(private name: string) {
    }
}