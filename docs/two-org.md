## Getting started with two organizations

For this tutorial, we will be using these files : [files](https://github.com/bxforce/bnc-hlf/tree/master/tests/multi_machine)

Since we will be running on two different hosts, notice how config-hosts.yaml no longuer points to localhost

It specifies:
* host name
* ip
* targets

We will be using the following files to run two org:
* [config-deploy-org1.yaml](https://github.com/bxforce/bnc-hlf/tree/master/tests/multi_machine/config-deploy-org1.yaml)
* [config-deploy-org2.yaml](https://github.com/bxforce/bnc-hlf/tree/master/tests/multi_machine/config-deploy-org2.yaml)
* [config-genesis-org1-org2.yaml](https://github.com/bxforce/bnc-hlf/tree/master/tests/multi_machine/config-genesis-org1-org2.yaml)
* [config-chaincode.yaml](https://github.com/bxforce/bnc-hlf/tree/master/tests/multi_machine/config-chaincode.yaml)
* [config-hosts.yaml](https://github.com/bxforce/bnc-hlf/tree/master/tests/multi_machine/config-hosts.yaml)         


### Install BNC on both hosts:
First modify the config-hosts and put the ip of both your hosts

**In machine1:**

#### Step1: Install BNC

````aidl
sudo curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/bin/bnc -o /usr/local/bin/bnc && sudo chmod +x /usr/local/bin/bnc
````

#### Step2: Create config files

````aidl
mkdir config
````

````aidl
curl https://raw.githubusercontent.com/bxforce/bnc-hlf/master/tests/multi_machine/config-deploy-org1.yaml > $PWD/config/config-deploy-org1.yaml
````

````aidl
curl https://raw.githubusercontent.com/bxforce/bnc-hlf/master/tests/multi_machine/config-genesis-org1-org2.yaml > $PWD/config/config-genesis-org1-org2.yaml
````

````aidl
curl https://raw.githubusercontent.com/bxforce/bnc-hlf/master/tests/multi_machine/config-hosts.yaml > $PWD/config/config-hosts.yaml
````


**In machine2:**

#### Step1: Install BNC

````aidl
sudo curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/bin/bnc -o /usr/local/bin/bnc && sudo chmod +x /usr/local/bin/bnc
````

#### Step2: Create config files

````aidl
mkdir config
````

````aidl
curl https://raw.githubusercontent.com/bxforce/bnc-hlf/master/tests/multi_machine/config-deploy-org2.yaml > $PWD/config/config-deploy-org2.yaml
````

````aidl
curl https://raw.githubusercontent.com/bxforce/bnc-hlf/master/tests/multi_machine/config-hosts.yaml > $PWD/config/config-hosts.yaml
````
### Enroll peers and orderers on org2:


Now we will start by generating crypto material for org2:

`bnc generate -f /bnc/config/config-deploy-org2.yaml -h /bnc/config/config-hosts.yaml`

In machine 1:

`sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'`

Necessary for creating the configtx.yaml

`mkdir -p /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org2.bnc.com/orderers/orderer3.bnc.com/tls`

`scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org2.bnc.com/orderers/orderer3.bnc.com/tls/server.crt /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org2.bnc.com/orderers/orderer3.bnc.com/tls/server.crt`

`mkdir -p /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org2.bnc.com/orderers/orderer4.bnc.com/tls`
  
`scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org2.bnc.com/orderers/orderer4.bnc.com/tls/server.crt /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org2.bnc.com/orderers/orderer4.bnc.com/tls/server.crt`

Necessary for genesis

`scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org2.bnc.com/msp /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org2.bnc.com/msp`

`mkdir -p /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com`
  
`scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/msp /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/msp`

This one is necessary for the invoke with CLI
  
`mkdir -p -p /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls`

`scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls/ca.crt /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls/ca.crt`

`./bin/bnc generate -f /bnc/config/config-deploy-org1.yaml -h /bnc/config/config-hosts.yaml -g /bnc/config/config-genesis-org1-org2.yaml`

Now we will copy the peer tls peer cert that we will need for testing the invoke with CLI

`ssh $SSH_VM2 -t 'mkdir -p /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com'`

`scp -r /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls`

`ssh $SSH_VM2 -t 'mkdir /tmp/hyperledger-fabric-network/artifacts'`

`scp -r /tmp/hyperledger-fabric-network/artifacts/* $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts`

Start peers and orderers on machine2:

`ssh $SSH_VM2 -t './bin/bnc start -f /bnc/config/config-deploy-org2.yaml -h /bnc/config/config-hosts.yaml'`

Start peers and orderers on machine1:

`./bin/bnc start -f /bnc/config/config-deploy-org1.yaml -h /bnc/config/config-hosts.yaml`

Now org1 will create channel, join the channel and update anchor peer:

`./bin/bnc channel deploy -f /bnc/config/config-deploy-org1.yaml -h /bnc/config/config-hosts.yaml`

Now org2 will join channel and update anchor peer (By default anchor peer is the first peer in the peer list in config-deploy.yaml)

`ssh $SSH_VM2 -t './bin/bnc channel deploy -f /bnc/config/config-deploy-org2.yaml -h /bnc/config/config-hosts.yaml --no-create'`

Deploy chaincode on org2:

The following command will install + approve + commit chaincode

`ssh $SSH_VM2 -t './bin/bnc chaincode deploy -f /bnc/config/config-deploy-org2.yaml -h /bnc/config/config-hosts.yaml -c /bnc/config/config-chaincode.yaml'`

Deploy chaincode on org1:

`./bin/bnc chaincode deploy -f /bnc/config/config-deploy-org1.yaml -h /bnc/config/config-hosts.yaml -c /bnc/config/config-chaincode.yaml`