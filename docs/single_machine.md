
## DEMO commands for single machine

Here a first and simple command set to deploy a hyperledger fabric network.

1- Prepare BNC configuration input file ./tests/single_machine/config.yaml and chaincode folder

2- Generate cryptographic and certificates credentials for both peers and orderers and the Genesis block in the Org1

````shell script
./bin/bnc generate -g ./tests/config.yaml
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

7. Test
````
docker exec -it cli.org1.bnc.com /bin/bash -c "peer chaincode invoke -o orderer0.bnc.com:7050 -C mychannel -n mycc --peerAddresses peer0.org1.bnc.com:7051 --peerAddresses peer0.org2.bnc.com:7051 -c '{\"Args\":[\"Init\",\"a\",\"100\",\"b\",\"100\"]}' --waitForEvent --tls --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls/ca.crt --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls/ca.crt"
````

````shell script
./bin/bnc clear -f ./tests/config-deploy-org1.yaml
````

## DEMO commands for multi machine

0. setup ips section in config file:
````shell script
export VM2=TODO_IP
````

1. Generate network
* VM1
````shell script
export BNC_CONFIG_PATH=$PWD/tests/multi_machine
scp tests/multi_machine/config-* ubuntu@$VM2:/home/ubuntu/
````
* VM2
````shell script
mkdir bin; 
echo "docker run -it --rm --name bnc-hlf --network bnc_network -v $PWD:/root/tests -v /tmp/hyperledger-fabric-network:/tmp/hyperledger-fabric-network -v volume_chaincode:/root/chaincode -v volume_scripts:/root/scripts -v /var/run/docker.sock:/var/run/docker.sock --entrypoint bnc bxforce/bnc-hlf:nightly $@" > bin/bnc
./bin/bnc generate -f ./tests/config-deploy-org2.yaml
````

2. Start Blockchain docker peers & orderers containers
* VM1
````shell script
scp -r ubuntu@$VM2:/tmp/hyperledger-fabric-network/organizations /tmp/hyperledger-fabric-network
./bin/bnc generate -f ./tests/config-deploy-org1.yaml -g ./tests/config-genesis-org1-org2.yaml 
scp -r /tmp/hyperledger-fabric-network/organizations/ordererOrganizations ubuntu@$VM2:/tmp/hyperledger-fabric-network/organizations
scp -r /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com ubuntu@$VM2:/tmp/hyperledger-fabric-network/organizations/peerOrganizations
scp -r /tmp/hyperledger-fabric-network/artifacts ubuntu@$VM2:/tmp/hyperledger-fabric-network/artifacts
````
note: be sure that you have the rights on /tmp/hyperledger-fabric-network `sudo chown -R ubuntu:ubuntu /tmp` (because bnc-hlf container uses root..)
* VM2
````shell script
./bin/bnc start -f ./tests/config-deploy-org2.yaml
````
* VM1
````shell script
./bin/bnc start -f ./tests/config-deploy-org1.yaml
````

3- Deploy channel
* VM1
````shell script
./bin/bnc start -f ./tests/config-deploy-org1.yaml
./bin/bnc channel deploy -f ./tests/config-deploy-org1.yaml
scp -r /tmp/hyperledger-fabric-network/artifacts/* ubuntu@$VM2:/tmp/hyperledger-fabric-network/artifacts
````
* VM2
````shell script
./bin/bnc channel deploy -f ./tests/config-deploy-org2.yaml --no-create
````

4- Deploy chaincode
* VM1
````shell script
./bin/bnc chaincode compile -f ./tests/config-deploy-org1.yaml -c ./tests/config-chaincode.yaml
./bin/bnc chaincode deploy -f ./tests/config-deploy-org1.yaml -c ./tests/config-chaincode.yaml
````
* VM2
````shell script
./bin/bnc chaincode compile -f ./tests/config-deploy-org2.yaml -c ./tests/config-chaincode.yaml
./bin/bnc chaincode deploy -f ./tests/config-deploy-org2.yaml -c ./tests/config-chaincode.yaml
````