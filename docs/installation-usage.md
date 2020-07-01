To install this tools, please follow these steps:

## Install the tools

Currently, the BNC tool is not yet published as a NPM package. Therefore, we need to install from code sources. 
For that, just follow these steps:

1- clone the code source from the github repository:
````shell script
git clone https://github.com/bxforce/bnc-hlf.git
````
2- install dependencies and link the package
````shell script
npm install
npm link
````
3- run the BNC tool command as described in `docs/commands.md`

## Example of some command to deploy a HLF network

Here a first and simple command set to deploy a hyperledger fabric network.

1- Prepare BNC configuration input files:
  * Deployment configuration: you can find a sample in ...
  * Genesis configuration: you can find a sample in ...
  
2- Generate cryptographic and certificates credentials for both peers and orderers
  * for peers:
  ````shell script
    bnc enroll-peers -f [bncDeploymentConfigFilePath]
  ````
  * for orderers:
  ````shell script
  bnc enroll-orderers -f [bncGenesisConfigFilePath]
  ````

3- Generate Genesis block
````shell script
bnc init --genesis -f [bncGenesisConfigurationFilePath]
````

4- Start Blockchain docker peers & orderers containers
````shell script
bnc start -f [bncDeploymentConfigFilePath]
````

7- create a channel
````shell script
bnc channel create ....
````

10- Stop the blockchain
````shell script
bnc stop -f [bncDeploymentConfigFilePath]
````
