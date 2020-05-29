import { Wallet, Wallets, Identity, X509Identity } from 'fabric-network';

export class WalletStore {
    wallet: Wallet;

    constructor(public walletPath: string) { }

    async init() {
        this.wallet = await Wallets.newFileSystemWallet(this.walletPath);
    }

    /**
     * Add the identity into the Wallet
     * @param id
     * @param mspId
     * @param key
     * @param certificate
     */
    async addIdentity(id, mspId, key, certificate): Promise<void> {
        const x509Identity: X509Identity = {
            credentials: {
                certificate,
                privateKey: key.toBytes()
            },
            mspId,
            type: 'X.509'
        };

        await this.wallet.put(id, x509Identity);
    }

    /**
     * return a boolean if the username/id exists on the wallet
     * @param id
     */
    async exists (id): Promise<boolean> {
        const identity =  await this.wallet.get(id);
        return !!identity;
    }

    /**
     * return the identity from the wallet
     * @param id
     */
    async getIdentity (id: string): Promise<Identity> {
        return await this.wallet.get(id);
    }

    /**
     * Remove the identity from the wallet
     * @param id
     */
    async deleteIdentity (id: string): Promise<void> {
        return await this.wallet.remove(id);
    }

    /**
     * Return the wallet object
     * @return Promise<Wallet>
     */
    getWallet (): Wallet {
        return this.wallet;
    }
}
