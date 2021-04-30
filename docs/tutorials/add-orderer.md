## Add orderer to an already existing organization

In the process below we will walk you through the steps of adding a new orderer.

We will assume that you have already followed the tutorial of deploying two orgs on two machines.

We will be adding an orderer **orderer7.bnc.com** running on port **10052**

## Getting Started :rocket:

### Step1: Modify config

In the _config-deploy-org1.yaml_ we will be adding our new orderer to the list of orderers.

Also in the config-hosts.yaml, we will add _orderer7.bnc.com_ in the corresponding host section.

Do the following to update the config files in your config folder on machine1 of org1:

````aidl
curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/master/tests/multi_machine/add-orderer/config-deploy-org1.yaml > $PWD/config/config-deploy-org1.yaml
````

````aidl
curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/master/tests/multi_machine/add-orderer/config-hosts.yaml > $PWD/config/config-hosts.yaml
````

````aidl
curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/master/tests/multi_machine/add-orderer/config-deploy-orderer.yaml > $PWD/config/config-deploy-orderer.yaml
````

### Step2: Generate orderer7 credentials

In machine1 of org1 do:

````aidl
bnc enroll-orderers --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml
````

### Step3: Update system-channel by adding TLS of new orderer

Here we will create a new channel definition that needs to be signed by both organizations and then submitted to the network.

In machine1 of org1 do:

````aidl
bnc channel add-orderer --config-folder $PWD/config -f config-deploy-org1.yaml  -h config-hosts.yaml -o orderer7.bnc.com -p 10052 --addTLS --systemChannel
````

### Step4: Sign the new system-channel update by org1

In machine1 of org1 do:

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb  --addOrderer --systemChannel
````

### step5: Copy the file to be signed to machine2 org2

````aidl
sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network'
scp -r /tmp/hyperledger-fabric-network/artifacts/system-channel $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts
````

### step6: sign the new channel definition by org2

In machine2 of org2 do:

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org2.yaml  -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb --addOrderer --systemChannel
````

### step7: Copy the signature of org2 to org1 

We need to copy the signature of org2 to org1 because org1 will be the one submitting the channel update to the network.

On machine 1 of org1 do :

````aidl
sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network'
scp $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/signatures/org2_sign.json /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/signatures
````

### step8: Submit the channel update to network

Org1 will be using the signatures of both orgs along with the channel update file _config_update_as_envelope_pb.pb_ to send the submit transaction to the channel.

On machine 1 of org1 do:

````aidl
bnc channel submit-definition --config-folder $PWD/config -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb -s /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/signatures/ -f config-deploy-org1.yaml -h config-hosts.yaml --addOrderer --systemChannel
````

### step9: Start new orderer

Now we will be starting the new orderer container, to do so we will be using the new file _config-deploy-orderer.yaml_

Under the hood we will be retrieving the latest system channel definition and bootstrapping our new orderer with it.

On machine1 of org1 do:

````aidl
bnc start --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -o config-deploy-orderer.yaml --addOrderer
````

### step10: Now we will add endpoint of new orderer to the system channel

Now org1 will creating a new channel definition to be signed by both organizations by orgs and then submitted to the network following same logic with TLS.

On machine1 of org1:

````aidl
bnc channel --config-folder $PWD/config add-orderer -f config-deploy-org1.yaml  -h config-hosts.yaml -o orderer7.bnc.com -p 10052 --addEndpoint --systemChannel
````

### step11: Org1 signs the generated channel definition

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb  --addOrderer --systemChannel
````

### step12: Copy the channel definiton to org2

````aidl
sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network'
scp -r /tmp/hyperledger-fabric-network/artifacts/system-channel $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts
````

### step13: Sign the new definiton by org2

On machine2 of org2 do :
````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org2.yaml  -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb --addOrderer --systemChannel
````

### step14: Copy signature of org2 to org1

On machine1 of org1:

````aidl
sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network'
scp $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/signatures/org2_sign.json /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/signatures
````

### step15: Submit the new channel update to the network

On machine1 of org1:

````aidl
bnc channel submit-definition --config-folder $PWD/config -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb -s /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/signatures/ -f config-deploy-org1.yaml -h config-hosts.yaml --addOrderer --systemChannel
````

### step16: Add TLS of new orderer to application channel

On machine1 of org1:

````aidl
bnc channel add-orderer --config-folder $PWD/config -f config-deploy-org1.yaml  -h config-hosts.yaml -o orderer7.bnc.com -p 10052 -n mychannel --addTLS
````

### step17: Sign new channel update by org1

On machine1 of org1:

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/config_update_as_envelope_pb.pb -n mychannel --addOrderer
````

### step18: Copy new channel update definition to org2

On machine1 of org1:

````aidl
sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network'
scp -r /tmp/hyperledger-fabric-network/artifacts/mychannel $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts
````

### step19: Sign new channel definition as org2

On machine2 of org2:

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org2.yaml  -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/config_update_as_envelope_pb.pb -n mychannel --addOrderer
````

### step20: Copy signature to org1

On machine1 of org1:

````aidl
sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network'
scp $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/signatures/org2_sign.json /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/signatures
````

### step21: Submit new channel update to the network

On machine1 of org1 do:

````aidl
bnc channel submit-definition --config-folder $PWD/config -c /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/config_update_as_envelope_pb.pb -s /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/signatures/ -f config-deploy-org1.yaml -h config-hosts.yaml  -n mychannel --addOrderer
````

### step22: Add endpoint of new orderer to application channel

On machine1 of org1 do:

````aidl
bnc channel add-orderer --config-folder $PWD/config -f config-deploy-org1.yaml  -h config-hosts.yaml -o orderer7.bnc.com -p 10052 -n mychannel --addEndpoint
````

### step23: Sign new channel definition by org1

On machine1 of org1 do:

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/config_update_as_envelope_pb.pb -n mychannel --addOrderer
````

### step24: Copy the channel definition to org2 to be signed

On machine1 of org1:

````aidl
sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network'
scp -r /tmp/hyperledger-fabric-network/artifacts/mychannel $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts
````

### step25: Sign channel definition by org2

On machine2 of org2:

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org2.yaml  -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/config_update_as_envelope_pb.pb -n mychannel --addOrderer
````

### step 26: Copy signature of org2 to org1

On machine1 of org1 do:

````aidl
sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R $USER:$USER /tmp/hyperledger-fabric-network'
scp $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/signatures/org2_sign.json /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/signatures
````

### step 27: Submit channel update to network

On machine1 of org1 do:

````aidl
bnc channel submit-definition --config-folder $PWD/config -c /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/config_update_as_envelope_pb.pb -s /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/signatures/ -f config-deploy-org1.yaml -h config-hosts.yaml  -n mychannel --addOrderer
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