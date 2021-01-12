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

## DEMO commands for bnc

Here a first and simple command set to deploy a hyperledger fabric network.

1- Prepare BNC configuration input files:
  * Deployment configuration: you can find a sample in ...
  * Genesis configuration: you can find a sample in ...
  
2- Generate cryptographic and certificates credentials for both peers and orderers
  * for peers:
  ````shell script
    bnc enroll-peers -f ./tests/manual/wassim/config-deploy-org1.yaml
  ````

  ````shell script
    bnc enroll-peers -f ./tests/manual/wassim/config-deploy-org2.yaml
  ````
  * for orderers:
  ````shell script
  bnc enroll-orderers -f ./tests/manual/wassim/config-genesis-org1-org2.yaml
  ````

3- Generate Genesis block
````shell script
bnc init --genesis -f ./tests/manual/wassim/config-genesis-org1-org2.yaml
````

````shell script
bnc init --configtx -f ./tests/manual/wassim/config-genesis-org1-org2.yaml
````

````shell script
bnc init --anchortx -f ./tests/manual/wassim/config-genesis-org1-org2.yaml
````

4- Start Blockchain docker peers & orderers containers
````shell script
bnc start -f ./tests/manual/wassim/config-deploy-org1.yaml
````

````shell script
bnc start -f ./tests/manual/wassim/config-deploy-org2.yaml
````

7- create a channel
````shell script
bnc channel create -f ./tests/manual/wassim/config-deploy-org1.yaml -t ../hyperledger-fabric-network/artifacts/mychannel.tx -n mychannel
````

8- join
````shell script
bnc channel join -n mychannel -p "peer0.org1.bnc.com" -f ./tests/manual/wassim/config-deploy-org1.yaml
````

````shell script
bnc channel join -n mychannel -p "peer0.org2.bnc.com" -f ./tests/manual/wassim/config-deploy-org2.yaml
````

9- Update channel
````shell script
bnc channel update -n mychannel -f ./tests/manual/wassim/config-deploy-org1.yaml -t ../hyperledger-fabric-network/artifacts/org1MSPanchors.tx
````

````shell script
bnc channel update -n mychannel -f ./tests/manual/wassim/config-deploy-org2.yaml -t ../hyperledger-fabric-network/artifacts/org2MSPanchors.tx
````


10- Stop the blockchain
````shell script
bnc stop -f [bncDeploymentConfigFilePath]
````

## DEMO commands for chaincode CLI

1st step :  Create a chaincode package that we will use to install the chaincode on peers 

````shell script
cd /opt/gopath/src/github.com/hyperledger/fabric-samples/chaincode/abstore/go
GO111MODULE=on go mod vendor
cd -
peer lifecycle chaincode package mycc.tar.gz --path github.com/hyperledger/fabric-samples/chaincode/abstore/go/ --lang golang --label mycc_1
````

2nd step :  install the package on peer0 of Org1. 
````shell script
peer lifecycle chaincode install mycc.tar.gz
peer lifecycle chaincode queryinstalled  ( to get the ID)
CC_PACKAGE_ID=mycc_1:0dcea8280752b53a2a534f280445e36fa4cb32f648c2d7729589821f300d74be  ( set the package ID)
````

3d step: install package on peer0 of org2
````shell script
CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.bnc.com/users/Admin\@org2.bnc.com/msp/
CORE_PEER_ADDRESS=peer0.org2.bnc.com:10051
CORE_PEER_LOCALMSPID=org2MSP
CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls/ca.crt

peer lifecycle chaincode install mycc.tar.gz
````

4th step: Approve chaincode on org2 since we already have vars set giving orderer3 TLS cert
````shell script
peer lifecycle chaincode approveformyorg --channelID mychannel --name mycc --version 1.0 --init-required --package-id $CC_PACKAGE_ID --sequence 1 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer3.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem
````

5th step: Approve chaincode definition for org1
````shell script
CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/users/Admin@org1.bnc.com/msp
CORE_PEER_ADDRESS=peer0.org1.bnc.com:7051
CORE_PEER_LOCALMSPID=org1MSP
CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls/ca.crt

peer lifecycle chaincode approveformyorg --channelID mychannel --name mycc --version 1.0 --init-required --package-id $CC_PACKAGE_ID --sequence 1 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem

````

6th step: check the commits to see who approved the chaincode
````shell script
peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name mycc --version 1.0 --init-required --sequence 1 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem --output json
````

7th step: commit chaincode definition after approval ( we will commit this as org1 and it will target peers in both org1 and org2 for endorsements)
 ````shell script
 peer lifecycle chaincode commit -o orderer0.bnc.com:7050 --channelID mychannel --name mycc --version 1.0 --sequence 1 --init-required --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem --peerAddresses peer0.org1.bnc.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls/ca.crt --peerAddresses peer0.org2.bnc.com:10051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.bnc.com/peers/peer1.org2.bnc.com/tls/ca.crt
````


8th step : INVOKE chaincode giving as targets peer0 of org1 and org2 as targets
 ````shell script
peer chaincode invoke -o orderer0.bnc.com:7050 --isInit --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem -C mychannel -n mycc --peerAddresses peer0.org1.bnc.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls/ca.crt --peerAddresses peer0.org2.bnc.com:10051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls/ca.crt -c '{"Args":["Init","a","100","b","100"]}' --waitForEvent
````

9th step :query chaincode 
 ````shell script
peer chaincode query -C mychannel -n mycc -c '{"Args":["query","a"]}'
````

10th step : call the invoke fct to move 10 from a to b
 ````shell script
peer chaincode invoke -o orderer0.bnc.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem -C mychannel -n mycc --peerAddresses peer0.org1.bnc.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls/ca.crt --peerAddresses peer0.org2.bnc.com:10051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls/ca.crt -c '{"Args":["invoke","a","b","10"]}' --waitForEvent
 ````


11th step :query chaincode 
 ````shell script
peer chaincode query -C mychannel -n mycc -c '{"Args":["query","a"]}'
````