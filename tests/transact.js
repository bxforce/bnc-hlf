'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
//const AwaitLock = require('await-lock');
//const { setIntervalAsync, clearIntervalAsync } = require('set-interval-async/dynamic')

const PATH_WALLET =  '/tmp/wallet';
const PATH_NETWORK = '/tmp/hyperledger-fabric-network/settings/connection-org1.json';
const CA_NAME = 'ca1.org1'
const MSP = 'org1MSP';
const ADMIN_ID = 'admin';
const ADMIN_PWD = 'adminpw';
const USER_ID = 'appUser';
const USER_DPT = 'org1.department1';

const CHANNEL = 'mychannel';
const CHAINCODE = 'mycc';
const MAX_CPT = 1;
const BATCH_SIZE = 50;
const WAIT_TIME = 0;

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
		var query = { enrollmentID: userId, role: 'client' }
		if (affiliation) query[affiliation] = affiliation;
		const secret = await caClient.register(query, adminUser);
		const enrollment = await caClient.enroll({ enrollmentID: userId, enrollmentSecret: secret });
		const x509Identity = { credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes(), }, mspId: orgMspId, type: 'X.509', };
		await wallet.put(userId, x509Identity);
		console.log(`Successfully registered and enrolled user ${userId} and imported it into the wallet`);
	} catch (error) {
		console.error(`Failed to register user : ${error}`);
	}
};

function getNetwork(path_network) {
	// build an in memory object with the network configuration (also known as a connection profile)
	const fileExists = fs.existsSync(path_network);
	if (!fileExists) { throw new Error(`no such file or directory: ${path_network}`); }
	const contents = fs.readFileSync(path_network, 'utf8');
	let network = JSON.parse(contents);
	console.log(`Loaded the network configuration located at ${path_network}`);
	return network;
}

async function init(reset, network, path_wallet, ca_name, msp, admin_id, admin_pwd, user_id, user_dpt) {
	// build an instance of the fabric ca services client based on the information in the network configuration
	const caInfo = network.certificateAuthorities[ca_name];
	const caTLSCACerts = caInfo.tlsCACerts.path;
	const caClient = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
	console.log(`Built a CA Client named ${caInfo.caName}`);

	// setup the wallet to hold the credentials of the application user
	const walletExists = fs.existsSync(path_wallet);
	if (walletExists && reset) { fs.rmdirSync(path_wallet, { recursive: true }); console.log(`Removed old wallet at ${path_wallet}`); }
	
	const wallet = await Wallets.newFileSystemWallet(path_wallet); // wallet = await Wallets.newInMemoryWallet();
	console.log(`Built a file system wallet at ${path_wallet}`);

	// in a real application this would be done on an administrative flow, and only once
	await enrollAdmin(caClient, wallet, msp, admin_id, admin_pwd);

	// in a real application this would be done only when a new user was required to be added and would be part of an administrative flow
	await registerAndEnrollUser(caClient, wallet, msp, admin_id, user_id, user_dpt);
	
	return wallet;
};

async function invokeTx(reset, batch_size, wait_time) {
	try {
		var network = getNetwork(PATH_NETWORK)
		var wallet = await init(reset, network, PATH_WALLET, CA_NAME, MSP, ADMIN_ID, ADMIN_PWD, USER_ID, USER_DPT);

		// Create a new gateway instance for interacting with the fabric network.
		const gateway = new Gateway();

		// transaction step
		function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
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
				var size = Math.floor(Math.random() * (batch_size - 1)) + 1;
				for(var i = 0; i < size; i++){
				    date = Date.now();
				    var promises = step(contract, "a_" + date + "_" + i, "b_" + date + "_" + i);
				    interactions.push(promises);
				}
			    await Promise.all(interactions);
			    console.log("batch done");
			    await delay(wait_time * 1000);
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
case 'register':
    init(false, getNetwork(args[1] ? args[1] : PATH_NETWORK), args[2] ? args[2] : PATH_WALLET, args[3] ? args[3] : CA_NAME, args[4] ? args[4] : MSP, args[5] ? args[5] : ADMIN_ID, args[6] ? args[6] : ADMIN_PWD, args[6] ? args[6] : USER_ID, args[7]);
    break;
case 'invoke':
    invokeTx(false, args[1] ? args[1] : BATCH_SIZE, args[2] ? args[2] : WAIT_TIME);
    break;
default:
    console.log('CLI parser error');
}

