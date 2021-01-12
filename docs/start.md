# DEMO commands for multi machine
## WITH THE IMAGE

For the sequel, you have to set the VM2 variable to facilitate ssh commands:
````shell script
export SSH_VM2=$USER_VM2@$IP_VM2
````

0. setup hosts section in config-hosts.yaml file, and make sure you have it under tests/multi_machine, see example:
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
ssh $SSH_VM2 'mkdir -p bin; echo "docker run -it --rm --name bnc-hlf --network bnc_network -v \$PWD:/bnc/config -v /tmp/hyperledger-fabric-network:/tmp/hyperledger-fabric-network -v volume_chaincode:/bnc/chaincode -v volume_scripts:/bnc/scripts -v /var/run/docker.sock:/var/run/docker.sock \$@" > bin/bnc'
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
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
mkdir -p /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com
scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/msp /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/msp
# this one is necessary for the invoke with CLI
mkdir -p -p /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls  
scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls/ca.crt /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls/ca.crt
#
./bin/bnc generate -f /bnc/config/config-deploy-org1.yaml -h /bnc/config/config-hosts.yaml -g /bnc/config/config-genesis-org1-org2.yaml 
# Copy this crypto material to the second VM before doing the bnc start command
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
#NECESSARY for the commit script that needs TLS root cert file from the following
ssh $SSH_VM2 -t 'mkdir -p /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com'
#NECESSARY for the invoke test with cli later
scp -r /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls
#
ssh $SSH_VM2 -t 'mkdir -p /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/bnc.com'
scp -r /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/bnc.com/tlsca $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/ordererOrganizations/bnc.com/tlsca
ssh $SSH_VM2 -t 'mkdir -p /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/bnc.com/orderers'
scp -r /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/bnc.com/orderers/orderer3.bnc.com $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/ordererOrganizations/bnc.com/orderers/orderer3.bnc.com
scp -r /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/bnc.com/orderers/orderer4.bnc.com $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/ordererOrganizations/bnc.com/orderers/orderer4.bnc.com
ssh $SSH_VM2 -t 'mkdir /tmp/hyperledger-fabric-network/artifacts'
scp -r /tmp/hyperledger-fabric-network/artifacts/* $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts

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
````
* VM2
````shell script
ssh $SSH_VM2 -t './bin/bnc channel deploy -f /bnc/config/config-deploy-org2.yaml -h /bnc/config/config-hosts.yaml --no-create'
````

4- Deploy chaincode
* VM1
````shell script
./bin/bnc chaincode deploy -f /bnc/config/config-deploy-org1.yaml -h /bnc/config/config-hosts.yaml -c /bnc/config/config-chaincode.yaml
````
* VM2
````shell script
ssh $SSH_VM2 -t './bin/bnc chaincode deploy -f /bnc/config/config-deploy-org2.yaml -h /bnc/config/config-hosts.yaml -c /bnc/config/config-chaincode.yaml'
````

4. Test
````
docker exec -it cli.org1.bnc.com /bin/bash -c "peer chaincode invoke -o orderer0.bnc.com:7050 -C mychannel -n mycc --peerAddresses peer0.org1.bnc.com:7051 --peerAddresses peer0.org2.bnc.com:10051 -c '{\"Args\":[\"Init\",\"a\",\"100\",\"b\",\"100\"]}' --waitForEvent --tls --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls/ca.crt --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls/ca.crt"
````

## WITHOUT THE IMAGE

Clone the project obviously

Make sure you do the steps : 0, 1, 2 in both VMS

0. setup hosts section in config-hosts.yaml file, and make sure you have it under tests/multi_machine, see example:
````shell script
# This section force the binding of containers port to the host machine. It is then used in /etc/hosts of each container
hosts:
  host1:
    ip: {{ IP_VM1 }}
    targets:
      - "ca1.org1"
      - "peer0.org1.bnc.com"
      - "peer1.org1.bnc.com"
      - "peer2.org1.bnc.com"
      - "orderer0.bnc.com"
      - "orderer1.bnc.com"
      - "orderer2.bnc.com"
  host2:
    ip: {{ IP_VM2 }}
    targets:
      - "ca2.org2"
      - "ca.orderer"
      - "peer0.org2.bnc.com"
      - "peer1.org2.bnc.com"
      - "orderer3.bnc.com"
      - "orderer4.bnc.com"
````
If you are using a VM then make sure you manually edit the /etc/hosts file as the following:
````shell script
sudo vi /etc/hosts
````
add these two lines: 
````shell script
IP_VM2 ca2.org2 orderer3.bnc.com orderer4.bnc.com peer0.org2.bnc.com peer1.org2.bnc.com
IP_VM1 ca.orderer ca1.org1 orderer0.bnc.com orderer1.bnc.com orderer2.bnc.com peer0.org1.bnc.com peer2.org1.bnc.com peer1.org1.bnc.com
````

You wont have to manually edit the /etc/hosts file if you are using google cloud or OVH cloud, in that case you will have to configure your DNS so it resolves the host names for you.

1. Open tests/multi_machine/config-chaincode.yaml and change the content of root_path_chaincode and root_path_scripts to this: 
````shell script
root_path_chaincode: "/home/ubuntu/bnc-hlf/tests/chaincode"
root_path_scripts: "/home/ubuntu/bnc-hlf/scripts"
````

2. 
````shell script
npm i
npm run build
sudo npm link
````

3. We will start by the second VM and generate peer certs for org2
````shell script
sudo bnc generate -f ./tests/multi_machine/config-deploy-org2.yaml -h ./tests/multi_machine/config-hosts.yaml
````

4. Copy the following from VM2 to VM1
you can go to VM1 and do the scp commands :
````shell script
scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/msp /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/msp
# this one is necessary for the invoke with CLI
mkdir -p -p /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls
scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls/ca.crt /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls/ca.crt
````

5. IN VM1 do :
````shell script
sudo bnc generate -f ./tests/multi_machine/config-deploy-org1.yaml -h ./tests/multi_machine/config-hosts.yaml -g ./tests/multi_machine/config-genesis-org1-org2.yaml
````

6. Now Copy these materials from VM1 to VM2
````shell script
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'

#NECESSARY for the commit need TLS root cert file from the following
ssh $SSH_VM2 -t 'mkdir -p /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com'
#NECESSARY for the invoke test with cli later
scp -r /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls

ssh $SSH_VM2 -t 'mkdir -p /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/bnc.com'
scp -r /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/bnc.com/tlsca $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/ordererOrganizations/bnc.com/tlsca
ssh $SSH_VM2 -t 'mkdir -p /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/bnc.com/orderers'
scp -r /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/bnc.com/orderers/orderer3.bnc.com $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/ordererOrganizations/bnc.com/orderers/orderer3.bnc.com
scp -r /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/bnc.com/orderers/orderer4.bnc.com $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/ordererOrganizations/bnc.com/orderers/orderer4.bnc.com

ssh $SSH_VM2 -t 'mkdir /tmp/hyperledger-fabric-network/artifacts'
scp -r /tmp/hyperledger-fabric-network/artifacts/* $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts
````

7. IN VM2 :
````shell script
sudo bnc start -f ./tests/multi_machine/config-deploy-org2.yaml -h ./tests/multi_machine/config-hosts.yaml
````

8. IN VM1 :
````shell script
sudo bnc start -f ./tests/multi_machine/config-deploy-org1.yaml -h ./tests/multi_machine/config-hosts.yaml
sudo bnc channel deploy -f ./tests/multi_machine/config-deploy-org1.yaml -h ./tests/multi_machine/config-hosts.yaml
````

7. IN VM2:
````shell script
 sudo bnc channel deploy -f ./tests/multi_machine/config-deploy-org2.yaml -h ./tests/multi_machine/config-hosts.yaml --no-create
````

8. IN VM1:
````shell script
sudo bnc chaincode deploy -f ./tests/multi_machine/config-deploy-org1.yaml -h ./tests/multi_machine/config-hosts.yaml -c ./tests/multi_machine/config-chaincode.yaml
````

9. IN VM2:
````shell script
sudo bnc chaincode deploy -f ./tests/multi_machine/config-deploy-org2.yaml -h ./tests/multi_machine/config-hosts.yaml -c ./tests/multi_machine/config-chaincode.yaml
````
