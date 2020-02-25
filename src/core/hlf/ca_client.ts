// @ts-ignore
import * as FabricCAServices from 'fabric-ca-client';
import * as path from 'path';
import { Wallets } from '../../models/wallet';
import { FileSystemWallet, X509WalletMixin, Gateway } from 'fabric-network';
import { CLI } from '../../cli';
import * as fs from 'fs';

export  class Caclient {

  static ccpPath = path.resolve(__dirname, '..','..', 'tests', 'ca', 'connection-org1.json');
  static ccpJSON = fs.readFileSync(Caclient.ccpPath, 'utf8');
  static ccp = JSON.parse(Caclient.ccpJSON);

  public async enrollManager (id, secret, mspID) {
    try {
      // Create a new CA client for interacting with the CA.
      const caInfo = Caclient.ccp.certificateAuthorities['ca.org1.example.com'];   //!!!!!!!!!!!!!!!!!!!!!! Maybe this should be intered as param ????
      const caTLSCACerts = caInfo.tlsCACerts.pem;
      const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
      // Create a new file system based wallet for managing identities.
      const walletPath = path.join(process.cwd(), 'wallet');
      const wallet = new Wallets(walletPath);
      console.log(`Wallet path: ${walletPath}`);
      // Check to see if we've already enrolled the admin user.
      const identity = await wallet.fetchWallet(id);
      if (identity) {
        console.log('An identity for the admin user',id,' already exists in the wallet');
        return;
      }
      // Enroll the admin user, and import the new identity into the wallet.
      let enrollment = await doEnroll(id, secret, wallet, ca, mspID);
      console.log('Successfully enrolled admin user',id,' and imported it into the wallet');
      console.log('Enrollment Obj', enrollment);
      return enrollment;

    } catch (error) {
      console.error(`Failed to enroll admin user "admin": ${error}`);
      process.exit(1);
    }
  }

  public async registrationManager (id, secret, affiliation, mspID) {
    try {

      // Create a new file system based wallet for managing identities.
      const walletPath = path.join(process.cwd(), 'wallet');
      const myWallet = new Wallets(walletPath);
      console.log(`Wallet path: ${walletPath}`);

      // Check to see if we've already enrolled the user.
      const userIdentity = await myWallet.fetchWallet(id);
      if (userIdentity) {
        console.log('An identity for the user "user1" already exists in the wallet');
        return;
      }
      // Check to see if we've already enrolled the admin user.
      const adminIdentity = await myWallet.fetchWallet('admin');
      if (!adminIdentity) {
        console.log('An identity for the admin user "admin" does not exist in the wallet');
        console.log('Run the enrollAdmin.ts application before retrying');
        return;
      }

      // Create a new gateway for connecting to our peer node.
      const gateway = new Gateway();
      let wallet = myWallet.getWallet();
      await gateway.connect(Caclient.ccpPath, { wallet , identity: 'admin', discovery: { enabled: true, asLocalhost: true } });
      // Get the CA client object from the gateway for interacting with the CA.
      const client = gateway.getClient();
      const ca = client.getCertificateAuthority();
      const adminUser = await client.getUserContext('admin', false);
      // Register the user, enroll the user, and import the new identity into the wallet.
      const secretRegister = await ca.register({ affiliation: affiliation, enrollmentID: id, role: 'client' }, adminUser);
      let enrollment = await doEnroll(id, secretRegister, myWallet, ca, mspID);
      console.log('Successfully registered and enrolled admin user "user1" and imported it into the wallet');
      console.log('Enrollment Obj', enrollment);
      return enrollment;
    } catch (error) {
      console.error(`Failed to register user "user1": ${error}`);
      process.exit(1);
    }

  }

  static async fetchIdentity(id) {
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = new Wallets(walletPath);
    const identity = await wallet.getIdentity(id);
    console.log('Your identity', id, ':' , identity);
    return identity;
  }

  static async deleteIdentity(id) {
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = new Wallets(walletPath);
    try{
      console.log('before delete');
      const identity = await wallet.deleteIdentity(id);
      console.log('Your identity', id, ':' , identity);
      return identity;
    }catch(e){
      return e;
    }

  }

}
const doEnroll = async (id, secret, wallet, ca, mspID) => {  //mspID : 'Org1MSP'
  const enrollment = await ca.enroll({ enrollmentID: id , enrollmentSecret: secret }); //ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
  await wallet.createWallet(id, mspID, enrollment );
  console.log('Successfully enrolled admin user',id,' and imported it into the wallet');
  return enrollment;
};