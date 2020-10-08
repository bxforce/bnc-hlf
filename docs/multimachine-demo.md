
## DEMO commands for bnc multi-machine

Here a first and simple command set to deploy a hyperledger fabric network.

1- Prepare BNC configuration input files:
  * Deployment configuration: you can find a sample in /bnc-hlf/tests/manual/wassim/config-deploy-org1.yaml
  * Genesis configuration: you can find a sample in bnc-hlf/tests/manual/wassim/config-genesis-org1-org2.yaml
  * Config Ips that will serve as extra_host section for the two orgs to recognize each other, find sample /bnc-hlf/tests/manual/templates/config-ip.yaml
  
2- Generate cryptographic and certificates credentials for both peers and orderers
  * for peers in org1:
  ````shell script
    bnc enroll-peers -f ./tests/manual/wassim/config-deploy-org1.yaml
  ````
  * for peers in org2:
  ````shell script
    bnc enroll-peers -f ./tests/manual/wassim/config-deploy-org2.yaml
  ````
    * Make sure you copy the msp folder and tlscacerts under  organizations/peerOrganizations/org2.bnc.com and put it 
    in the VM of org1 under organizations/peerOrganizations
  * for orderers in org1:
  ````shell script
  bnc enroll-orderers -f ./tests/manual/wassim/config-genesis-org1-org2.yaml
  ````
Copy the ordererOrganization folder and put it in the VM of org2 under organizations

3- Generate Genesis block in the Org1
````shell script
bnc init -f ./tests/manual/wassim/config-genesis-org1-org2.yaml
````

* COPY the artifacts folder from org1 that contains the genesis file and put it in second VM

4- Start Blockchain docker peers & orderers containers

* In VM of org1
````shell script
bnc start -f ./tests/manual/wassim/config-deploy-org1.yaml
````
* In VM of org2
````shell script
bnc start -f ./tests/manual/wassim/config-deploy-org2.yaml
````

7- create a channel in ORG1
````shell script
bnc channel create -f ./tests/manual/wassim/config-deploy-org1.yaml -t ../hyperledger-fabric-network/artifacts/mychannel.tx -n mychannel
````

8- join channel 

* TO join all peers defined in your config deploy file in org1
````shell script
bnc channel join -n mychannel -f ./tests/manual/wassim/config-deploy-org1.yaml
````

* TO join all peers defined in your config deploy file in org2
````shell script
bnc channel join -n mychannel -f ./tests/manual/wassim/config-deploy-org2.yaml
````

9- Update channel

* IN org1
````shell script
bnc channel update -n mychannel -f ./tests/manual/wassim/config-deploy-org1.yaml -t ../hyperledger-fabric-network/artifacts/org1MSPanchors.tx 
````
* In Org2
````shell script
bnc channel update -n mychannel -f ./tests/manual/wassim/config-deploy-org2.yaml -t ../hyperledger-fabric-network/artifacts/org2MSPanchors.tx 
````


10- Stop the blockchain
````shell script
bnc stop -f [bncDeploymentConfigFilePath]
````

## DEMO commands for chaincode CLI

1st step :  Create a chaincode package that we will use to install the chaincode on peers 

create the package on both VM of org1 and org2

````shell script
cd /opt/gopath/src/github.com/hyperledger/fabric-samples/chaincode/abstore/go
GO111MODULE=on go mod vendor
cd -
peer lifecycle chaincode package mycc.tar.gz --path github.com/hyperledger/fabric-samples/chaincode/abstore/go/ --lang golang --label mycc_1
````

2nd step :  install the package on peer0 of Org1 and peer0 of Org2
````shell script
peer lifecycle chaincode install mycc.tar.gz
peer lifecycle chaincode queryinstalled  ( to get the ID)
CC_PACKAGE_ID=mycc_1:0dcea8280752b53a2a534f280445e36fa4cb32f648c2d7729589821f300d74be  ( set the package ID)
````

4th step: Approve chaincode on org2 since we already have vars set giving orderer3 TLS cert
````shell script
peer lifecycle chaincode approveformyorg --channelID mychannel --name mycc --version 1.0 --package-id $CC_PACKAGE_ID --sequence 1 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer3.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem
````

5th step: Approve chaincode definition for org1
````shell script
peer lifecycle chaincode approveformyorg --channelID mychannel --name mycc --version 1.0 --package-id $CC_PACKAGE_ID --sequence 1 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem

````

6th step: check the commits to see who approved the chaincode in ORG1
````shell script
peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name mycc --version 1.0 --sequence 1 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem --output json
````

7th step: commit chaincode definition after approval ( we will commit this as org1 and it will target peers in both org1 and org2 for endorsements)
 ````shell script
 peer lifecycle chaincode commit -o orderer0.bnc.com:7050 --channelID mychannel --name mycc --version 1.0 --sequence 1 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem --peerAddresses peer0.org1.bnc.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls/ca.crt --peerAddresses peer0.org2.bnc.com:10051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.bnc.com/peers/peer1.org2.bnc.com/tls/ca.crt
````


8th step : INVOKE chaincode giving as targets peer0 of org1 and org2 as targets
 ````shell script
peer chaincode invoke -o orderer0.bnc.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem -C mychannel -n mycc --peerAddresses peer0.org1.bnc.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls/ca.crt --peerAddresses peer0.org2.bnc.com:10051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls/ca.crt -c '{"Args":["Init","a","100","b","100"]}' --waitForEvent
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

## DEMO FOR CHAINCODE COMMANDS
 ````shell script
sudo bnc chaincode install -n mycc -cPath abstore/go -v 1 -p peer0  -f ./tests/manual/wassim/config-deploy-org1.yaml
````

 ````shell script
sudo bnc chaincode approve --commit false -f ./tests/manual/wassim/config-deploy-org2.yaml -n mycc -s 1 -v 1 -channel mychannel
````

 ````shell script
sudo bnc chaincode commit -f ./tests/manual/wassim/config-deploy-org1.yaml -c ./tests/manual/wassim/config-commit.yaml -chaincode mycc -v 1 -s 1 -channel mychannel
````

