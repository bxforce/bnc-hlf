/* tslint:disable:no-unused-variable */
import { l } from './utils/logs';
import * as FabricCAServices from 'fabric-ca-client';
import { FileSystemWallet, X509WalletMixin } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';

import { Wallet } from './models/wallet';

const ccpPath = path.resolve(__dirname, '..','..', 'fabric-samples', 'first-network', 'connection-org1.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

export class CLI {

    static async cleanNetwork(rmi: boolean) {
        return;
    }

    static  async enroll(id, secret) {
        let cli = new enrollCLI();
        console.log('before big call');
        let enrollmentOBJ = await cli.enrollManager(id, secret);
        console.log('Enrollment Object :', enrollmentOBJ)
        return enrollmentOBJ;
    }

    static async fetchIdentity(id) {
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new Wallet(walletPath);
        const identity = await wallet.getIdentity(id);
        console.log('Your identity', id, ':' , identity);
        return identity;
    }

    static async deleteIdentity(id) {
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new Wallet(walletPath);
        const identity = await wallet.deleteIdentity(id);
        console.log('Your identity', id, ':' , identity);
        return identity;
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

export class enrollCLI {
    constructor() {
        // maybe here add construction of User model
    }

    public async enrollManager (id, secret) {
        try {
            // Create a new CA client for interacting with the CA.
            const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];   //!!!!!!!!!!!!!!!!!!!!!! Maybe this should be intered as param ????
            const caTLSCACerts = caInfo.tlsCACerts.pem;
            const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
            // Create a new file system based wallet for managing identities.
            const walletPath = path.join(process.cwd(), 'wallet');
            //  const wallet = new FileSystemWallet(walletPath)
            const wallet = new Wallet(walletPath);
            console.log(`Wallet path: ${walletPath}`);

            // Check to see if we've already enrolled the admin user.
            const identity = await wallet.fetchWallet(id);
            if (identity) {
                console.log('An identity for the admin user',id,' already exists in the wallet');
                return;
            }
            // Enroll the admin user, and import the new identity into the wallet.
            const enrollment = await ca.enroll({ enrollmentID: id , enrollmentSecret: secret }); //ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
            await wallet.createWallet(id,'Org1MSP', enrollment )
            console.log('Successfully enrolled admin user',id,' and imported it into the wallet');
            return enrollment;

        } catch (error) {
            console.error(`Failed to enroll admin user "admin": ${error}`);
            process.exit(1);
        }
    }
}