
## DEMO commands for single machine

Here a simple command set to deploy an hyperledger fabric network.
````shell script
./bin/bnc run
````
This command must end with the comment: 
````
===============================================================================
===================== Chaincode deployed successfully !!! =====================
===============================================================================
````
Here an other command to remove an hyperledger fabric network.
````shell script
./bin/bnc clear
````

To enable bnc-hlf docker image rebuild at every call:
````shell script
export BNC_BUILD_PATH=$PWD
````

Now, here a set of commands to deploy an hyperledger fabric network:

1- Prepare BNC configuration input file /bnc/config/single_machine/config.yaml

2- Generate cryptographic and certificates credentials for both peers and orderers and the Genesis block in the Org1

````shell script
./bin/bnc generate -g /bnc/config/config.yaml
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

6- Test

````shell script
docker exec -it cli.org1.bnc.com /bin/bash -c "peer chaincode invoke -o orderer1.bnc.com:7050 -C mychannel -n mycc --peerAddresses peer1.org1.bnc.com:7051 -c '{\"Args\":[\"Init\",\"a\",\"100\",\"b\",\"100\"]}' --waitForEvent --tls --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer1.org1.bnc.com/tls/ca.crt --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer1.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem"
````
This command must end with the comment: 
````
INFO 002 Chaincode invoke successful. result: status:200
````

## DEMO commands for single machine (using multi machine config)

1. to choose config path and generate network:
````shell script
export BNC_CONFIG_PATH=$PWD/tests/multi_machine
./bin/bnc generate -f /bnc/config/config-deploy-org2.yaml
./bin/bnc generate -f /bnc/config/config-deploy-org1.yaml -g /bnc/config/config-genesis-org1-org2.yaml 
````

3- Start Blockchain docker peers & orderers containers

````shell script
./bin/bnc start -f /bnc/config/config-deploy-org1.yaml
./bin/bnc start -f /bnc/config/config-deploy-org2.yaml
````

4- Deploy channel

````shell script
./bin/bnc channel deploy -f /bnc/config/config-deploy-org1.yaml
./bin/bnc channel deploy -f /bnc/config/config-deploy-org2.yaml --no-create
````

5- Compile chaincode

````shell script
./bin/bnc chaincode compile -f /bnc/config/config-deploy-org1.yaml -c /bnc/config/config-chaincode.yaml
````

6- Deploy chaincode (first command end with error, but it ok)

````shell script
./bin/bnc chaincode deploy -f /bnc/config/config-deploy-org1.yaml -c /bnc/config/config-chaincode.yaml
./bin/bnc chaincode deploy -f /bnc/config/config-deploy-org2.yaml -c /bnc/config/config-chaincode.yaml
````

7. Test
````
docker exec -it cli.org1.bnc.com /bin/bash -c "peer chaincode invoke -o orderer0.bnc.com:7050 -C mychannel -n mycc --peerAddresses peer0.org1.bnc.com:7051 --peerAddresses peer0.org2.bnc.com:10051 -c '{\"Args\":[\"Init\",\"a\",\"100\",\"b\",\"100\"]}' --waitForEvent --tls --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls/ca.crt --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls/ca.crt"
````

````shell script
./bin/bnc clear -f /bnc/config/config-deploy-org1.yaml
./bin/bnc clear -f /bnc/config/config-deploy-org2.yaml 
````

## DEMO commands for multi machine

For the sequel, you have to set the VM2 variable to facilitate ssh commands:
````shell script
export SSH_VM2=$USER_VM2@$IP_VM2
````

0. setup hosts section in config-hosts.yaml file, see example:
````shell script
# This section force the binding of containers port to the host machine. It is then used in /etc/hosts of each container
hosts:
  host1:
    ip: {{ IP_VM1 }}
    targets:
      - "peer0.org1.bnc.com"
      - "peer1.org1.bnc.com"
      - "peer2.org1.bnc.com"
      - "orderer0.bnc.com"
      - "orderer1.bnc.com"
      - "orderer2.bnc.com"
  host2:
    ip: {{ IP_VM2 }}
    targets:
      - "peer0.org2.bnc.com"
      - "peer1.org2.bnc.com"
      - "orderer3.bnc.com"
      - "orderer4.bnc.com"
````
on VM2, you need to prepare the bnc script:
````shell script
ssh $SSH_VM2 'mkdir -p bin; echo "docker run -it --rm --name bnc-hlf --network bnc_network -v \$PWD:/bnc/config -v /tmp/hyperledger-fabric-network:/tmp/hyperledger-fabric-network -v volume_chaincode:/bnc/chaincode -v volume_scripts:/bnc/scripts -v /var/run/docker.sock:/var/run/docker.sock --entrypoint bnc bxforce/bnc-hlf:nightly \$@" > bin/bnc'
scp tests/multi_machine/config-* $SSH_VM2:/home/ubuntu/
ssh $SSH_VM2 'docker network create --driver=bridge bnc_network'
````

1. Generate network Org2
* VM1
````shell script
export BNC_CONFIG_PATH=$PWD/tests/multi_machine
````
* VM2
````shell script
ssh $SSH_VM2 -t './bin/bnc generate -f /bnc/config/config-deploy-org2.yaml -h /bnc/config/config-hosts.yaml'
````

2. Generate network Org1 & Start Blockchain docker peers & orderers containers (the 'chown' step will be removed in the future)
* VM1
````shell script
scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/organizations /tmp/hyperledger-fabric-network
./bin/bnc generate -f /bnc/config/config-deploy-org1.yaml -h /bnc/config/config-hosts.yaml -g /bnc/config/config-genesis-org1-org2.yaml 
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
scp -r /tmp/hyperledger-fabric-network/organizations/ordererOrganizations $SSH_VM2:/tmp/hyperledger-fabric-network/organizations
scp -r /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/peerOrganizations
scp -r /tmp/hyperledger-fabric-network/artifacts $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts
````
note: be sure that you have the rights on /tmp/hyperledger-fabric-network `sudo chown -R ubuntu:ubuntu /tmp` (because bnc-hlf container uses root..)
* VM2
````shell script
ssh $SSH_VM2 -t './bin/bnc start -f /bnc/config/config-deploy-org2.yaml -h /bnc/config/config-hosts.yaml'
````
* VM1
````shell script
./bin/bnc start -f /bnc/config/config-deploy-org1.yaml -h /bnc/config/config-hosts.yaml
````

3- Deploy channel
* VM1
````shell script
./bin/bnc channel deploy -f /bnc/config/config-deploy-org1.yaml -h /bnc/config/config-hosts.yaml
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
scp -r /tmp/hyperledger-fabric-network/artifacts/* $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts
````
* VM2
````shell script
ssh $SSH_VM2 -t './bin/bnc channel deploy -f /bnc/config/config-deploy-org2.yaml -h /bnc/config/config-hosts.yaml --no-create'
````

4- Deploy chaincode
* VM1
````shell script
./bin/bnc chaincode compile -f /bnc/config/config-deploy-org1.yaml -h /bnc/config/config-hosts.yaml -c /bnc/config/config-chaincode.yaml
./bin/bnc chaincode deploy -f /bnc/config/config-deploy-org1.yaml -h /bnc/config/config-hosts.yaml -c /bnc/config/config-chaincode.yaml
````
* VM2
````shell script
ssh $SSH_VM2 -t './bin/bnc chaincode compile -f /bnc/config/config-deploy-org2.yaml -h /bnc/config/config-hosts.yaml -c /bnc/config/config-chaincode.yaml'
ssh $SSH_VM2 -t './bin/bnc chaincode deploy -f /bnc/config/config-deploy-org2.yaml -h /bnc/config/config-hosts.yaml -c /bnc/config/config-chaincode.yaml'
````

4. Test
````
docker exec -it cli.org1.bnc.com /bin/bash -c "peer chaincode invoke -o orderer0.bnc.com:7050 -C mychannel -n mycc --peerAddresses peer0.org1.bnc.com:7051 --peerAddresses peer0.org2.bnc.com:10051 -c '{\"Args\":[\"Init\",\"a\",\"100\",\"b\",\"100\"]}' --waitForEvent --tls --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls/ca.crt --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls/ca.crt"
````

