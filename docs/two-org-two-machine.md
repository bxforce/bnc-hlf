## Process overview (two orgs example) :bulb:

In the process below, we illustrate the process of starting a consortium blockchain with two organizations: org1 and org2.

In this scenario, org1 is the organization in charge of creating the genesis block and the channel. 

In order to generate the genesis block and the channel definition, org2 shares its orderers/peers certificates with org1.

These generated artifacts by org1 are shared with org2.


![BNC](/docs/bnc.PNG)

## Deploying two organizations on a two machine

For this tutorial, we will be using these files :

* [config-deploy-org1.yaml](https://github.com/bxforce/bnc-hlf/blob/improve-docs/tests/multi_machine/two-orgs/config-deploy-org1.yaml)
* [config-deploy-org2.yaml](https://github.com/bxforce/bnc-hlf/blob/improve-docs/tests/multi_machine/two-orgs/config-deploy-org2.yaml)
* [config-genesis-org1-org2.yaml](https://github.com/bxforce/bnc-hlf/blob/improve-docs/tests/multi_machine/two-orgs/config-genesis-org1-org2.yaml)
* [config-chaincode.yaml](https://github.com/bxforce/bnc-hlf/blob/improve-docs/tests/multi_machine/two-orgs/config-chaincode.yaml)
* [config-hosts.yaml](https://github.com/bxforce/bnc-hlf/blob/improve-docs/tests/multi_machine/two-orgs/config-hosts.yaml)

Notice that we have a new file that we will be using compared to the last tutorial : **config-hosts.yaml**

This file specifies the ip of both hosts along with the different peers/orderers/ca in every org.

_NOTE: we will be using ssh to access the second machine and execute our commands_


## Getting Started :rocket:

First modify the config-hosts and put the ip of both your hosts

#### Step1: Install BNC

````aidl
export SSH_VM2=IP
````

````aidl
sudo curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/bin/bnc -o /usr/local/bin/bnc && sudo chmod +x /usr/local/bin/bnc
````

````aidl
ssh $SSH_VM2 'sudo curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/bin/bnc -o /usr/local/bin/bnc && sudo chmod +x /usr/local/bin/bnc'
````

#### Step2: Create config files

````aidl
mkdir config
````

````aidl
curl https://github.com/bxforce/bnc-hlf/blob/improve-docs/tests/multi_machine/two-orgs/config-deploy-org1.yaml > $PWD/config/config-deploy-org1.yaml
````

````aidl
curl https://github.com/bxforce/bnc-hlf/blob/improve-docs/tests/multi_machine/two-orgs/config-genesis-org1-org2.yaml > $PWD/config/config-genesis-org1-org2.yaml
````

````aidl
curl https://github.com/bxforce/bnc-hlf/blob/improve-docs/tests/multi_machine/two-orgs/config-hosts.yaml > $PWD/config/config-hosts.yaml
````

````aidl
curl https://github.com/bxforce/bnc-hlf/blob/improve-docs/tests/multi_machine/two-orgs/config-chaincode.yaml > $PWD/config/config-chaincode.yaml
````

````aidl
ssh $SSH_VM2 'mkdir config'
````

````aidl
ssh $SSH_VM2 'curl https://github.com/bxforce/bnc-hlf/blob/improve-docs/tests/multi_machine/two-orgs/config-deploy-org2.yaml > $PWD/config/config-deploy-org2.yaml'
````

````aidl
ssh $SSH_VM2 'curl https://github.com/bxforce/bnc-hlf/blob/improve-docs/tests/multi_machine/two-orgs/config-hosts.yaml > $PWD/config/config-hosts.yaml'
````

````aidl
curl https://github.com/bxforce/bnc-hlf/blob/improve-docs/tests/multi_machine/two-orgs/config-chaincode.yaml > $PWD/config/config-chaincode.yaml
````

### Step3: Enroll peers and orderers on org2:


Now we will start by generating crypto material for org2:

`ssh $SSH_VM2 'bnc generate --config-folder $PWD/config -f config-deploy-org2.yaml -h config-hosts.yaml'`

### Step4: Copy necessary certificates from machine2 of org2 to machine1 of org1:

`sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network'`

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

### Step5: Enroll peers and orderers on org1:

`bnc generate --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -g config-genesis-org1-org2.yaml`

### Step6: Copy necessary artifacts to machine2:

Now we will copy the peer tls peer cert that we will need for testing the invoke with CLI

`ssh $SSH_VM2 -t 'mkdir -p /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com'`

`scp -r /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls`

`ssh $SSH_VM2 -t 'mkdir /tmp/hyperledger-fabric-network/artifacts'`

`scp -r /tmp/hyperledger-fabric-network/artifacts/* $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts`

### Step7: Start peers and orderers on machine2:

`ssh $SSH_VM2 -t 'bnc start --config-folder $PWD/config -f config-deploy-org2.yaml -h config-hosts.yaml'`

### Step8: Start peers and orderers on machine1:

`bnc start --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml`

### Step9: Deploy channel by org1:

`bnc channel deploy --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml`

### Step10: Join/update anchor peer channel by org2:

`ssh $SSH_VM2 -t 'bnc channel deploy --config-folder $PWD/config -f config-deploy-org2.yaml -h config-hosts.yaml --no-create'`

### Step11: Deploy chaincode on org2:

`ssh $SSH_VM2 -t 'bnc chaincode deploy --config-folder $PWD/config -f config-deploy-org2.yaml -h /config-hosts.yaml -c config-chaincode.yaml'`

### Step12: Deploy chaincode on org1:

`bnc chaincode deploy --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -c config-chaincode.yaml`
