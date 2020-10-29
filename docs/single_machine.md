
## DEMO commands for single machine

Here a first and simple command set to deploy a hyperledger fabric network.

1- Prepare BNC configuration input file ./tests/single_machine/config.yaml and chaincode folder

2- Generate cryptographic and certificates credentials for both peers and orderers and the Genesis block in the Org1

````shell script
./bin/bnc generate
````

3- Start Blockchain docker peers & orderers containers

````shell script
./bin/bnc start
````

4- Deploy channel

````shell script
./bin/bnc channel deploy
````

5- Compile chaincode

````shell script
./bin/bnc chaincode compile
````

6- Deploy chaincode

````shell script
./bin/bnc chaincode deploy
````

## DEMO commands for single machine (using multi machine config)

0. to enable bnc-hlf docker image rebuild:
````shell script
export BNC_BUILD_PATH=$PWD
````

1. to choose config path and generate network:
````shell script
export BNC_CONFIG_PATH=$PWD/tests/multi_machine
./bin/bnc generate -f ./tests/config-deploy-org2.yaml
./bin/bnc generate -f ./tests/config-deploy-org1.yaml -g ./tests/config-genesis-org1-org2.yaml 
````

3- Start Blockchain docker peers & orderers containers

````shell script
./bin/bnc start -f ./tests/config-deploy-org1.yaml
./bin/bnc start -f ./tests/config-deploy-org2.yaml
````

4- Deploy channel

````shell script
./bin/bnc channel deploy -f ./tests/config-deploy-org1.yaml
./bin/bnc channel deploy -f ./tests/config-deploy-org2.yaml --no-create
````

5- Compile chaincode

````shell script
./bin/bnc chaincode compile -f ./tests/config-deploy-org1.yaml -c ./tests/config-chaincode.yaml
````

6- Deploy chaincode

````shell script
./bin/bnc chaincode deploy -f ./tests/config-deploy-org1.yaml -c ./tests/config-chaincode.yaml
./bin/bnc chaincode deploy -f ./tests/config-deploy-org2.yaml -c ./tests/config-chaincode.yaml
````

