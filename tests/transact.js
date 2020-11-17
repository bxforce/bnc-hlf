'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const AwaitLock = require('await-lock');
const { setIntervalAsync, clearIntervalAsync } = require('set-interval-async/dynamic')

const PATH_WALLET =  '/tmp/wallet';
const PATH_NETWORK = "/tmp/hyperledger-fabric-network/settings/connection-org1.json"
const CHANNEL = 'mychannel';
const CHAINCODE = 'mycc';
const MSP = 'org1MSP';
const CA = 'ca1.org1'
const ADMIN_ID = 'admin';
const ADMIN_PWD = 'adminpw';
const USER_ID = 'appUser';
const USER_DPT = 'org1.department1';
const MAX_CPT = 1;
const BATCH_SIZE = 50;

var enrollAdmin = async (caClient, wallet, orgMspId, adminUserId, adminUserPasswd) => {
	try {
		// Check to see if we've already enrolled the admin user.
		const identity = await wallet.get(adminUserId);
		if (identity) { console.log('An identity for the admin user already exists in the wallet'); return; }
		// Enroll the admin user, and import the new identity into the wallet.
		const enrollment = await caClient.enroll({ enrollmentID: adminUserId, enrollmentSecret: adminUserPasswd });
		const x509Identity = { credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes(), }, mspId: orgMspId, type: 'X.509', };
		await wallet.put(adminUserId, x509Identity);
		console.log('Successfully enrolled admin user and imported it into the wallet');
	} catch (error) {
		console.error(`Failed to enroll admin user : ${error}`);
	}
};

var registerAndEnrollUser = async (caClient, wallet, orgMspId, adminUserId, userId, affiliation) => {
	try {
		// Check to see if we've already enrolled the user
		const userIdentity = await wallet.get(userId);
		if (userIdentity) { console.log(`An identity for the user ${userId} already exists in the wallet`); return; }
		// Must use an admin to register a new user
		const adminIdentity = await wallet.get(adminUserId);
		if (!adminIdentity) { console.log('An identity for the admin user does not exist in the wallet'); console.log('Enroll the admin user before retrying'); return; }
		// build a user object for authenticating with the CA
		const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
		const adminUser = await provider.getUserContext(adminIdentity, adminUserId);
		// Register the user, enroll the user, and import the new identity into the wallet.
		// if affiliation is specified by client, the affiliation value must be configured in CA
		const secret = await caClient.register({ affiliation: affiliation, enrollmentID: userId, role: 'client' }, adminUser);
		const enrollment = await caClient.enroll({ enrollmentID: userId, enrollmentSecret: secret });
		const x509Identity = { credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes(), }, mspId: orgMspId, type: 'X.509', };
		await wallet.put(userId, x509Identity);
		console.log(`Successfully registered and enrolled user ${userId} and imported it into the wallet`);
	} catch (error) {
		console.error(`Failed to register user : ${error}`);
	}
};

async function invokeTx(reset) {
	try {
		// build an in memory object with the network configuration (also known as a connection profile)
		const fileExists = fs.existsSync(PATH_NETWORK);
		if (!fileExists) { throw new Error(`no such file or directory: ${PATH_NETWORK}`); }
		const contents = fs.readFileSync(PATH_NETWORK, 'utf8');
		let network = JSON.parse(contents);
		console.log(`Loaded the network configuration located at ${PATH_NETWORK}`);

		// build an instance of the fabric ca services client based on the information in the network configuration
		const caInfo = network.certificateAuthorities[CA];
		const caTLSCACerts = caInfo.tlsCACerts.path;
		const caClient = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
		console.log(`Built a CA Client named ${caInfo.caName}`);

		// setup the wallet to hold the credentials of the application user
		const walletExists = fs.existsSync(PATH_WALLET);
		if (walletExists && reset) { fs.rmdirSync(PATH_WALLET, { recursive: true }); console.log(`Removed old wallet at ${PATH_WALLET}`); }
		
		const wallet = await Wallets.newFileSystemWallet(PATH_WALLET); // wallet = await Wallets.newInMemoryWallet();
		console.log(`Built a file system wallet at ${PATH_WALLET}`);

		// in a real application this would be done on an administrative flow, and only once
		await enrollAdmin(caClient, wallet, MSP, ADMIN_ID, ADMIN_PWD);

		// in a real application this would be done only when a new user was required to be added and would be part of an administrative flow
		await registerAndEnrollUser(caClient, wallet, MSP, ADMIN_ID, USER_ID, USER_DPT);

		// Create a new gateway instance for interacting with the fabric network.
		const gateway = new Gateway();

		// transaction step
		const step = async function(contract, a, b) {
		    // we use different variables names in order to avoid concurrency access error on world state
		    console.log("initing " + a + " and " + b);
			await contract.submitTransaction("init", a, "50", b, "2");
			
			// we randomize tx strategy
			var random_boolean = Math.random() <= 0.5;
			if (random_boolean) {
				console.log('moving some data from ' + a + " to " + b);
		        await contract.submitTransaction("invoke", a, b, "10");
			}
		};
		
		try {
		    // Create a new gateway instance for interacting with the fabric network.
			await gateway.connect(network, { wallet, identity: USER_ID, discovery: { enabled: true, asLocalhost: false } });
			// Get the contract from the network.
			const contract = (await gateway.getNetwork(CHANNEL)).getContract(CHAINCODE);

			var date;
			var interactions = [];
			while(true) {
				// we randomize batch size
				var size = Math.floor(Math.random() * (BATCH_SIZE - 1)) + 1;
				for(var i = 0; i < size; i++){
				    date = Date.now();
				    var promises = step(contract, "a_" + date + "_" + i, "b_" + date + "_" + i);
				    interactions.push(promises);
				}
			    await Promise.all(interactions);
			    console.log("batch done");
			    interactions = [];
			}
		} finally {
			gateway.disconnect();
		}
		
		/*
		try {
			// setup the gateway instance
			await gateway.connect(network, { wallet, identity: USER_ID, discovery: { enabled: true, asLocalhost: false } });

			// Get the contract from the network.
			const contract = (await gateway.getNetwork(CHANNEL)).getContract(CHAINCODE);
			
			//let lock = new AwaitLock();
			let cpt = 0;
			const timer = setIntervalAsync(async () => {
				//if (cpt >= MAX_CPT) { await clearIntervalAsync(timer); console.log("Stop animate"); lock.release(); return; }
				if (cpt == 0) console.log("Start animate");
				
				// Initialize a set of asset data on the channel using the chaincode 'InitLedger' function.
				console.log('\n--> Submit Transaction: Init');
				await contract.submitTransaction("init","a","100","b","200");
				console.log('*** Result: committed');
	            
	            let result = await contract.evaluateTransaction('query', 'a');
				if (result) console.log(`*** Result: ${JSON.stringify(JSON.parse(result.toString()), null, 2)}`);

				cpt++;
			}, 1000);
			//await lock.acquireAsync();

		} finally {
			gateway.disconnect();
		}
		*/
		
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
	}
	//console.log("End animate");
};

var args = process.argv.slice(2);
switch (args[0]) {
//case 'register':
//    registerUser()
//    break;
case 'invoke':
    invokeTx(false);
    break;
default:
    console.log('CLI parser error');
}

