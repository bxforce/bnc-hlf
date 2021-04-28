## Process overview (two orgs example) :bulb:

In the process below, we illustrate the process of starting a consortium blockchain with two organizations: org1 and org2.

In this scenario, org1 is the organization in charge of creating the genesis block and the channel. 

In order to generate the genesis block and the channel definition, org2 shares its orderers/peers certificates with org1.

These generated artifacts by org1 are shared with org2.


![BNC](/docs/images/bnc.PNG)

## Deploy two organizations on two machines

For this tutorial, each organization will be deployed on one machine and we will be using these files :

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

#### Install 

From VM1 of org1 do the following:

````aidl
export SSH_VM2=IP
````

Install on the first machine of org1

````aidl
sudo curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/bin/bnc -o /usr/local/bin/bnc && sudo chmod +x /usr/local/bin/bnc
````

Install on the second machine of org2

````aidl
ssh $SSH_VM2 'sudo curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/bin/bnc -o /usr/local/bin/bnc && sudo chmod +x /usr/local/bin/bnc'
````

#### Create config files

From VM1 of org1 do the following:

````aidl
mkdir config
````

````aidl
curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/tests/multi_machine/two-orgs/config-deploy-org1.yaml > $PWD/config/config-deploy-org1.yaml
````

````aidl
curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/tests/multi_machine/two-orgs/config-genesis-org1-org2.yaml > $PWD/config/config-genesis-org1-org2.yaml
````

````aidl
curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/tests/multi_machine/two-orgs/config-hosts.yaml > $PWD/config/config-hosts.yaml
````

````aidl
curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/tests/multi_machine/two-orgs/config-chaincode.yaml > $PWD/config/config-chaincode.yaml
````

````aidl
ssh $SSH_VM2 'mkdir config'
````

````aidl
ssh $SSH_VM2 'curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/tests/multi_machine/two-orgs/config-deploy-org2.yaml > $PWD/config/config-deploy-org2.yaml'
````

````aidl
ssh $SSH_VM2 'curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/tests/multi_machine/two-orgs/config-hosts.yaml > $PWD/config/config-hosts.yaml'
````

````aidl
ssh $SSH_VM2 'curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/tests/multi_machine/two-orgs/config-chaincode.yaml > $PWD/config/config-chaincode.yaml'
````

### Step1: Enroll peers and orderers on org2:


Now we will start by generating crypto material for org2:

On VM2 do :

````aidl
bnc generate --config-folder $PWD/config -f config-deploy-org2.yaml -h config-hosts.yaml
````


### Step2: Copy necessary certificates from machine2 of org2 to machine1 of org1:

Because the CA container is creating the _/tmp/hyperledger-fabric-network_ folder with root privilege, we will do the following

command to be able to copy files between both organizations.

From VM1 of org1 do the following:

````aidl
sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network; ssh $SSH_VM2 -t 'sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network'
````
Next we will be copying from _org2_ the necessary certificates to _org1_ in order to generate the artifacts.

Copy orderers TLS certificates, necessary for creating the configtx.yaml

````aidl
mkdir -p /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org2.bnc.com/orderers/orderer3.bnc.com/tls
````

````aidl
scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org2.bnc.com/orderers/orderer3.bnc.com/tls/server.crt /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org2.bnc.com/orderers/orderer3.bnc.com/tls/server.crt
````

````aidl
mkdir -p /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org2.bnc.com/orderers/orderer4.bnc.com/tls
````
  
````aidl
scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org2.bnc.com/orderers/orderer4.bnc.com/tls/server.crt /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org2.bnc.com/orderers/orderer4.bnc.com/tls/server.crt
````

Copy the org2 MSP folder, Necessary for genesis creation

````aidl
scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org2.bnc.com/msp /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org2.bnc.com/msp
````

````aidl
mkdir -p /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com
````
  
````aidl
scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/msp /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/msp
````

Copy peers certificates. This one is necessary for the invoke with CLI
  
````aidl
mkdir -p /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls
````

````aidl
scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls/ca.crt /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com/peers/peer0.org2.bnc.com/tls/ca.crt
````

### Step3: Enroll peers and orderers on org1:

````aidl
bnc generate --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -g config-genesis-org1-org2.yaml
````

### Step4: Copy necessary artifacts to machine2:

Now we will copy the peer tls peer cert that we will need for testing the invoke with CLI

From VM1 of org1 do the following: 

````aidl
ssh $SSH_VM2 -t 'mkdir -p /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com'
````

````aidl
scp -r /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls $SSH_VM2:/tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls
````

````aidl
ssh $SSH_VM2 -t 'mkdir /tmp/hyperledger-fabric-network/artifacts'
````

````aidl
sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network; ssh $SSH_VM2 -t 'sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network'
````

````aidl
scp -r /tmp/hyperledger-fabric-network/artifacts/* $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts
````

### Step5: Start peers and orderers on machine2:

On VM2 do : 
````aidl
bnc start --config-folder $PWD/config -f config-deploy-org2.yaml -h config-hosts.yaml
````

### Step6: Start peers and orderers on machine1:

````aidl
bnc start --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml
````

### Step7: Deploy channel by org1:

````aidl
bnc channel deploy --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml
````

### Step8: Join/update anchor peer channel by org2:

On VM2 do :

````aidl
bnc channel deploy --config-folder $PWD/config -f config-deploy-org2.yaml -h config-hosts.yaml --no-create
````

### Step9: Deploy chaincode on org1:

````aidl
bnc chaincode deploy --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -c config-chaincode.yaml
````

### Step10: Deploy chaincode on org2:

On VM2 do:

````aidl
bnc chaincode deploy --config-folder $PWD/config -f config-deploy-org2.yaml -h /config-hosts.yaml -c config-chaincode.yaml
````

### TEST IT :fire:

Org1 will do the init transaction
````aidl
bnc chaincode invoke --config-folder /home/ubuntu/config -f config-deploy-org1.yaml -h config-hosts.yaml -c config-chaincode.yaml -i "Init,a,100,b,100"
````

Query a value:

````aidl
bnc chaincode invoke --config-folder /home/ubuntu/config -f config-deploy-org1.yaml -h config-hosts.yaml -c config-chaincode.yaml -i "query,a"
````

substract 10 from a:

````aidl 
bnc chaincode invoke --config-folder /home/ubuntu/config -f config-deploy-org1.yaml -h config-hosts.yaml -c config-chaincode.yaml -i "invoke,a,b,10"
````

On machine2 of org2 you can invoke:

````aidl
bnc chaincode invoke --config-folder /home/ubuntu/config -f config-deploy-org2.yaml -h config-hosts.yaml -c config-chaincode.yaml -i "invoke,a,b,10"
````

_Notes:_

If you want to start your network with more than 2 organizations, you just need to modify these files:

* Add a new config-deploy.yaml file for your new organization

* Modify the _config-genesis-org1-org2.yaml_ file to add the description of your new organization

* Modify _config-hosts.yaml_ file to add the IP of the host of your new organization and the respective peers/orderers


## Change Policy of chaincode :star:

**If an endorsement policy is not explicitly specified during the approval step, the default Endorsement policy "MAJORITY Endorsement"**

After running the tutorial above, the policy is by default the majority. Meaning by default, for a transaction to be considered valid you need to

specify one target peer of each organization.

In order to change policy of your chaincode, you need to specify it in your _config-chaincode.yaml_ using : 

_endorsementPolicy: "OR ('org1MSP.peer','org2MSP.peer')"_

Channel members can approve a chaincode definition with a new endorsement policy and commit it to the channel.

````aidl
bnc chaincode deploy --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -c config-chaincode.yaml --policy
````

````aidl
bnc chaincode deploy --config-folder $PWD/config -f config-deploy-org2.yaml -h config-hosts.yaml -c config-chaincode.yaml --policy
````

_Note_:

The _bnc deploy_ command can actually be executed in 3 steps:

````aidl
bnc chaincode install --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -c config-chaincode.yaml
````

````aidl
bnc chaincode approve --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -c config-chaincode.yaml --policy
````

````aidl
bnc chaincode commit --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -c config-chaincode.yaml --policy
````

## Upgrade chaincode :star:

To Upgrade your chaincode you will be using the fabric lifecycle process (install/ approve/ commit)


First, modify in _config-chaincode.yaml_ the path to your new chaincode and the version.


````aidl
bnc chaincode deploy --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -c config-chaincode.yaml --upgrade
````

````aidl
bnc chaincode deploy --config-folder $PWD/config -f config-deploy-org2.yaml -h config-hosts.yaml -c config-chaincode.yaml --upgrade
````



