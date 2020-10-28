
## DEMO commands for single machine

Here a first and simple command set to deploy a hyperledger fabric network.

1- Prepare BNC configuration input file ./tests/single_machine/config.yaml and chaincode folder

2- Generate cryptographic and certificates credentials for both peers and orderers and the Genesis block in the Org1

````shell script
./bnc generate
````

3- Start Blockchain docker peers & orderers containers

````shell script
./bnc start
````

4- Deploy channel

````shell script
./bnc channel deploy
````

5- Compile chaincode

````shell script
./bnc chaincode compile
````

6- Deploy chaincode

````shell script
./bnc chaincode deploy
```

