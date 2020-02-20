import { FileSystemWallet, X509WalletMixin } from 'fabric-network';

export class Wallet {
    wallet: any;
    constructor(public walletPath: string) {
        this.wallet = new FileSystemWallet(walletPath)
    }

    async createWallet(id, mspid , enrollment ) {
        const x509Identity = X509WalletMixin.createIdentity(mspid, enrollment.certificate, enrollment.key.toBytes());
        await this.wallet.import(id, x509Identity);
        return this.wallet;
    }

    async fetchWallet (id) {  //rename this to exists
        return await this.wallet.exists(id);
    }

    async getIdentity (id) {
        return await this.wallet.export(id);   // or export ?
    }

    async deleteIdentity (id) {
        return await this.wallet.delete(id);
    }
}