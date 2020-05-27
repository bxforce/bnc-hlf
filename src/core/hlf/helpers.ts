import * as fs from 'fs';
import { safeLoad } from 'js-yaml';
import * as Client from 'fabric-client';
import { resolve, join } from 'path';
import { ensureDir, ensureFile, readdir, readFile } from 'fs-extra';
import { e } from '../../utils/logs';
import { WalletStore } from '../../models/wallet';

export interface ClientConfig {
  networkProfile: string|object;
  admin?: {
    name: string,
    secret: string,
  };
  keyStore?: string;
  userMsp?: string;
}

export class ClientHelper {

  public wallet: WalletStore;

  public client: Client;

  constructor(public clientConfig: ClientConfig) {}

  /**
   * Initialize the client
   * @param initKeyStore
   */
  public async init(initKeyStore = false) {

    this.client = new Client();

    // if(initKeyStore) {
    //   const stateStore = await Client.newDefaultKeyValueStore({
    //     path: this.renderVariables(this.clientConfig.keyStore)
    //   });
    //   this.client.setStateStore(stateStore);
    //
    //   const cryptoSuite = Client.newCryptoSuite();
    //   const cryptoStore = Client.newCryptoKeyStore({
    //     path: this.renderVariables(this.clientConfig.keyStore)
    //   });
    //   cryptoSuite.setCryptoKeyStore(cryptoStore);
    //   this.client.setCryptoSuite(cryptoSuite);
    //
    //   // check msp dir
    //   const mspPath = resolve(this.renderVariables(this.clientConfig.userMsp));
    //
    //   try {
    //     await ensureDir(mspPath);
    //   } catch (e) {
    //     throw new Error(`The userMspPath ${mspPath} is not reachable or not a directory`);
    //   }
    //
    //   await this.client.createUser({
    //     skipPersistence: false,
    //     mspid: this.clientConfig.userMsp,
    //     username: this.clientConfig.user,
    //     cryptoContent: {
    //       privateKeyPEM: await this.readSingleFileInDir(join(mspPath, 'keystore')),
    //       signedCertPEM: await this.readSingleFileInDir(join(mspPath, 'signcerts'))
    //     }
    //   });
    // }

    // Parse network configuration file
    if(typeof this.clientConfig.networkProfile === 'string') {
      this.clientConfig.networkProfile = await this.parseConfigFile(this.clientConfig.networkProfile);
    }

    // load the connection profile
    this.client.loadFromConfig(this.clientConfig.networkProfile);

    // create the state store and the crypto store
    await this.client.initCredentialStores();

    // init the wallet
    const walletPath = this.clientConfig.keyStore ?? this.client.getClientConfig().credentialStore.path;
    this.wallet = new WalletStore(walletPath);
    await this.wallet.init();
  }

  /**
   * Parse the provided config file asynchronously.
   * Both yaml and json extension are supported
   * @param configFullPath
   */
  async parseConfigFile(configFullPath = this.clientConfig.networkProfile): Promise<any> {
    const networkProfilePath = this.renderVariables(configFullPath as string);
    try {
      const profileStr = await readFile(networkProfilePath, 'utf-8');
      if (/\.json$/.test(networkProfilePath)) {
        return JSON.parse(profileStr);
      } else {
        return safeLoad(profileStr);
      }
    } catch (err) {
      e(err);
    }
  }

  /**
   * Parse the provided config file synchronously.
   * Both yaml and json extension are supported
   * @param configFullPath
   */
  parseConfigFileSync(configFullPath = this.clientConfig.networkProfile): any {
    const networkProfilePath = this.renderVariables(configFullPath as string);
    try {
      const profileStr = fs.readFileSync(networkProfilePath, 'utf-8');
      if (/\.json$/.test(networkProfilePath)) {
        return JSON.parse(profileStr);
      } else {
        return safeLoad(profileStr);
      }
    } catch (err) {
      e(err);
      return '';
    }
  }

  /**
   * Get the name of the lonely file with the folder
   * @param folderPath
   */
  async getLonelyFile(folderPath: string): Promise<string> {
    folderPath = resolve(folderPath);

    const isFile = await ensureFile(folderPath)
      .then(() => Promise.resolve(true))
      .catch(() => Promise.resolve(false));

    const isDir = await ensureDir(folderPath)
      .then(() => Promise.resolve(true))
      .catch(() => Promise.resolve(false));

    if (isFile) {
      return folderPath;
    }

    if (!isDir) {
      throw new Error(`Path '${folderPath}' neither a file or a directory`);
    }

    const content = await readdir(folderPath);

    if (content.length !== 1) {
      throw new Error(`Directory '${folderPath}' must contain only one file, but contains ${content.length}`);
    }

    return join(folderPath, content[0]);
  }

  /**
   * Read the single file within the folder
   * @param dirPath
   */
  async readSingleFileInDir(dirPath: string) {
    try {
      await ensureDir(dirPath);
    } catch (e) {
      throw new Error(`The directory ${dirPath} is not reachable or not a directory`);
    }

    const content = await readdir(dirPath);

    if (content.length !== 1) {
      throw new Error(
        `The directory ${dirPath} is supposed to only have one file, but found ${content.length}`
      );
    }

    return await readFile(join(dirPath, content[0]), 'utf8');
  }

  private renderVariables(data = '') {
    return data.replace(/(\$[a-z_0-9]+)/ig, variable => process.env[variable.slice(1)] || variable);
  }
}
