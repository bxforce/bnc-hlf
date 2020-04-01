// @ts-ignore
import * as FabricCAServices from 'fabric-ca-client';
import * as path from 'path';
import { Wallets } from '../../models/wallet';
import { FileSystemWallet, X509WalletMixin } from 'fabric-network';
import { CLI } from '../../cli';
import * as fs from 'fs';
import {l, d, e } from '../../utils/logs';
import {Type_User} from '../../utils/constants';
import { Gateways } from '../../models/gateway';


export  class Caclient {
  ccpPath:string;
  walletPath: string;
  ccpJSON: string;
  ccp: any;
  caInfo: any;
  wallet: Wallets;

  constructor(  caInfo: string,
                walletDirectoryName: string,
                ccpPath: string ) {
    this.ccpPath = path.resolve(__dirname, ccpPath);
    this.ccpJSON = fs.readFileSync(this.ccpPath, 'utf8');
    this.ccp = JSON.parse(this.ccpJSON);
    this.caInfo = this.ccp.certificateAuthorities[caInfo];
    this.walletPath = path.join(process.cwd(), walletDirectoryName);
    this.wallet = new Wallets(this.walletPath);
  }

  public async enroll (id, secret, mspID) {
    try {
      const caTLSCACerts = this.caInfo.tlsCACerts.pem;
      const ca = new FabricCAServices(this.caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, this.caInfo.caName);
      const identity = await this.wallet.exists(id);
      if (identity) {
        l(`An identity for the admin user ${id} already exists in the wallet`);
        return;
      }
      // Enroll the admin user, and import the new identity into the wallet.
      let enrollment = await this.doEnroll(id, secret, this.wallet, ca, mspID);
      l(`Successfully enrolled admin user ${id} and imported it into the wallet`);
      l(`Enrollment Obj:`);
      l(enrollment)
      return enrollment;

    } catch (error) {
      e(`Failed to enroll admin user "admin": ${error}`);
      return error;
    }
  }

  public async registerUser (id, secret, affiliation, mspID) {
    try {
      // Check to see if we've already enrolled the user.
      const userIdentity = await this.wallet.exists(id);
      if (userIdentity) {
        l(`An identity for the user ${id} already exists in the wallet`);
        return;
      }
      // Check to see if we've already enrolled the admin user.
      const adminIdentity = await this.wallet.exists(Type_User.admin);
      if (!adminIdentity) {
        l('An identity for the admin user "admin" does not exist in the wallet');
        l('Run the enrollAdmin.ts application before retrying');
        return;
      }

      // Create a new gateway for connecting to our peer node.
      const gateway = new Gateways();
      let wallet = this.wallet.getWallet();
      await gateway.connect(this.ccpPath, Type_User.admin, wallet);
      // Get the CA client object from the gateway for interacting with the CA.
      const client = gateway.getGatewayClient();
      const ca = client.getCertificateAuthority();
      const adminUser = await client.getUserContext(Type_User.admin, false);
      // Register the user, enroll the user, and import the new identity into the wallet.
      const secretRegister = await ca.register({ affiliation: affiliation, enrollmentID: id, role: 'client' }, adminUser);
      let enrollment = await this.doEnroll(id, secretRegister, this.wallet, ca, mspID);
      l('Successfully registered and enrolled admin user "user1" and imported it into the wallet');
      l(`Enrollment Obj:`);
      l(enrollment)
      return enrollment;
    } catch (error) {
      e(`Failed to register user "user1": ${error}`);
      return error;
    }

  }

  public async fetchIdentity(id) {
    const identity = await this.wallet.getIdentity(id);
    l(`Your identity  ${id} ': ${JSON.stringify(identity)}`);
    return identity;
  }

  public async deleteIdentity(id) {
    console.log('into delete')
    try{
      const identity = await this.wallet.deleteIdentity(id);
      l(`Your identity  ${id} ':'  ${JSON.stringify(identity)}`);
      return identity;
    }catch(e){
      return e;
    }

  }

  private async doEnroll(id, secret, wallet, ca, mspID) {  //mspID : 'Org1MSP'
    const enrollment = await ca.enroll({ enrollmentID: id , enrollmentSecret: secret }); //ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
    await wallet.createWallet(id, mspID, enrollment );
    l(`Successfully enrolled admin user ${id} and imported it into the wallet`);
    return enrollment;
  };

}

