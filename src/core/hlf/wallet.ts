import { Wallet, Wallets, Identity, X509Identity } from 'fabric-network';
import { e } from '../../utils/logs';
import { HLF_WALLET_TYPE } from '../../utils/constants';

/**
 * Class to handle HLF Wallet
 *
 * @author sahar.fehri@irt-systemx.fr
 * @author wassim.znaidi@gmail.com
 */
export class WalletStore {
    wallet: Wallet;

    /**
     * constructor
     * @param walletPath folder path where to store filesystem
     */
    constructor(public walletPath: string) {}

    /**
     * Initialize the wallet using filesystem
     */
    async init(walletType: HLF_WALLET_TYPE = HLF_WALLET_TYPE.FileSystem) {
        switch (walletType) {
            case HLF_WALLET_TYPE.FileSystem:
                this.wallet = await Wallets.newFileSystemWallet(this.walletPath);
                break;
            case HLF_WALLET_TYPE.CouchDB:
            case HLF_WALLET_TYPE.Memory:
                throw new Error('Wallet type not yet supported');
            default:
                break;
        }
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
    async deleteIdentity (id: string): Promise<boolean> {
        try {
            await this.wallet.remove(id);
            return true;
        } catch(err) {
            e(err);
            return false;
        }
    }

    /**
     * Return the wallet object
     * @return Promise<Wallet>
     */
    getWallet (): Wallet {
        return this.wallet;
    }
}
