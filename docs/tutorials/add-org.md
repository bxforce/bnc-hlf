
## Add organization to network

During this tutorial we will be adding a new organization to our network.

We suppose that you have already two organizations running on two different machines.

Our new organization _org3_ will have 1 peer and 1 orderer.

## Getting Started :rocket:

First modify the config-hosts and put the ip of both your hosts

### Step1: Install

````aidl
export SSH_VM3=IP
````

````aidl
sudo curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/master/bin/bnc -o /usr/local/bin/bnc && sudo chmod +x /usr/local/bin/bnc
````

````aidl
ssh $SSH_VM3 'sudo curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/master/bin/bnc -o /usr/local/bin/bnc && sudo chmod +x /usr/local/bin/bnc'
````

### Step2: Create conffig files


````aidl
ssh $SSH_VM3 'mkdir config'
````

````aidl
ssh $SSH_VM3 'curl https://github.com/bxforce/bnc-hlf/blob/master/tests/multi_machine/add-org/config-deploy-org3.yaml > $PWD/config/config-deploy-org3.yaml'
````

````aidl
ssh $SSH_VM3 'curl https://github.com/bxforce/bnc-hlf/blob/master/tests/multi_machine/add-org/config-hosts.yaml > $PWD/config/config-hosts.yaml'
````

````aidl
ssh $SSH_VM3 'curl https://github.com/bxforce/bnc-hlf/blob/master/tests/multi_machine/add-org/config-chaincode.yaml > $PWD/config/config-chaincode.yaml'
````

### Step3: Generate certificates for new organization

````aidl
bnc enroll-peers --config-folder $PWD/config -f config-deploy-org3.yaml -h config-hosts.yaml
````

````aidl
bnc enroll-orderers --config-folder $PWD/config -f config-deploy-org3.yaml -h config-hosts.yaml
````

### Step4: Start the peer of org3

This will start just the peer of org3, the orderer will be started later.

````aidl
bnc start --config-folder $PWD/config -f config-deploy-org3.yaml -h config-hosts.yaml --no-orderer
````

### Step5: Start the peer of org3

Now we have to generate the new org3 definition along with the new orderer definition that will be used to update

the channels.

````aidl
bnc generate-org-definition --config-folder $PWD/config -f config-deploy-org3.yaml -h config-hosts.yaml --addOrderer
````

### Step6: Copy the org3 generated artifacts to org1

````aidl
scp -r $SSH_VM3:/tmp/hyperledger-fabric-network/artifacts/org3.json /tmp/hyperledger-fabric-network/artifacts
````

````aidl
scp -r $SSH_VM3:/tmp/hyperledger-fabric-network/artifacts/org3Anchor.json /tmp/hyperledger-fabric-network/artifacts
````

````aidl
scp -r $SSH_VM3:/tmp/hyperledger-fabric-network/artifacts/ordererOrganizationorg3.json /tmp/hyperledger-fabric-network/artifacts
````

````aidl
scp -r $SSH_VM3:/tmp/hyperledger-fabric-network/artifacts/orderer.json /tmp/hyperledger-fabric-network/artifacts
````

### Step7: Add org3 definition to system channel

Now we will be adding the org3.json definition to the system channel by org1.

_Note: In all the following steps org1 will be generating the channel update definition and submitting them_

````aidl
bnc channel generate-definition --config-folder $PWD/config -o /tmp/hyperledger-fabric-network/artifacts/org3.json -a /tmp/hyperledger-fabric-network/artifacts/org3Anchor.json -f config-deploy-org1.yaml  -h config-hosts.yaml
````

### Step8: Copy the channel definition to org2 to be signed

````aidl
scp -r /tmp/hyperledger-fabric-network/artifacts/system-channel $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts
````
On machine2 of org2 do:

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org2.yaml  -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb --systemChannel
````

Copy the signature of org2 to org1 to be submitted to the network.

````aidl
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
````
````aidl
scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/signatures /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer
````

### Step9: Sign definition as org1

On machine1 of org1 do:

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org1.yaml  -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb --systemChannel
````

### Step10: Submit channel update

On machine1 of org1 do:

````aidl
bnc channel submit-definition --config-folder $PWD/config -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb -s /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/signatures -f config-deploy-org1.yaml -h config-hosts.yaml --systemChannel
````

### Step11: Add the new orderer organization definition to system channel

Here, org1 will be generation a new channel signable definition by adding the new orderer organization to system channel

````aidl
bnc channel add-new-orderer-org --config-folder $PWD/config -f config-deploy-org1.yaml  -h config-hosts.yaml -o /tmp/hyperledger-fabric-network/artifacts/ordererOrganizationorg3.json
````

Copy the definition to org2

````aidl
scp -r /tmp/hyperledger-fabric-network/artifacts/system-channel $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts
````

### Step12: Sign as org2

On machine2 of org2 do:

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org2.yaml  -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb --systemChannel
````

### Step13: Copy signature to org1

On terminal org1

````aidl
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
````
````aidl
scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/signatures /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer
````

### Step14: Sign and submit as org1

On machine1 of org1 do:

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org1.yaml  -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb --systemChannel
````

````aidl
bnc channel submit-definition --config-folder $PWD/config -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb -s /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/signatures -f config-deploy-org1.yaml -h config-hosts.yaml --systemChannel
````

### Step15: Add TLS of new orderer to system channel

On org1 do:

````aidl
bnc channel add-orderer --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -org /tmp/hyperledger-fabric-network/artifacts/orderer.json  --addTLS --systemChannel
````

### Step16: Sign definition By org1

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb  --addOrderer --systemChannel
````

Copy the signable definition to org2

````aidl
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
````

````aidl
scp -r /tmp/hyperledger-fabric-network/artifacts/system-channel $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts
````

### Step17: Sign definition By org2

On machine2 of org2 do:

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org2.yaml  -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb --addOrderer --systemChannel
````

### Step18: Copy org2 signature and submit definition by org1

On org1 terminal do:

````aidl
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
````
  
````aidl  
scp $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/signatures/org2_sign.json /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/signatures
````
````aidl 
bnc channel submit-definition --config-folder $PWD/config -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb -s /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/signatures/ -f config-deploy-org1.yaml -h config-hosts.yaml --addOrderer --systemChannel
````

### Step19: Generate new genesis file for the new orderer

In this step, org1 will retrieve the latest system channel definition that will be used to bootstrap the new orderer of org3

On machine1 of org1 do:

````aidl 
bnc generate-new-genesis --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml
```` 

Copy the generated file to org3:

````aidl 
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network
````

````aidl 
ssh $SSH_VM3 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
````

````aidl 
scp  /tmp/hyperledger-fabric-network/artifacts/config_orderer.block $SSH_VM3:/tmp/hyperledger-fabric-network/artifacts/
````

### Step20: Start new orderer of org3

On org3 do:

````aidl 
bnc start --config-folder $PWD/config -f config-deploy-org3.yaml -h config-hosts.yaml -o config-deploy-orderer.yaml --addOrderer --noCli
````

### Step21: Add new orderer endpoint to system channel

First copy the new orderer tls

On machine1 of org1 do:

````aidl 
mkdir -p /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org1.bnc.com/orderers/orderer5.bnc.com/tls/
````

````aidl 
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network;
````

````aidl 
scp $SSH_VM3:/tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org3.bnc.com/orderers/orderer5.bnc.com/tls/server.crt  /tmp/hyperledger-fabric-network/organizations/ordererOrganizations/org1.bnc.com/orderers/orderer5.bnc.com/tls/
````

Generate new signable definition by org1 by adding new orderer endpoint to system channel

````aidl 
bnc channel  add-orderer --config-folder $PWD/config -f config-deploy-org1.yaml  -h config-hosts.yaml -o orderer5.bnc.com -p 12050 --addEndpoint --systemChannel
````

Sign the definition as org1:

````aidl 
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb  --addOrderer --systemChannel
````

Copy the signable definition to org2:

````aidl 
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
````

````aidl 
scp -r /tmp/hyperledger-fabric-network/artifacts/system-channel $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts
````

### Step22: Sign the definition as org2

On machine2 of org2 do:

````aidl 
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org2.yaml  -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb --addOrderer --systemChannel
````

### Step23: Copy the signature to org1 and submit it

On machine1 of org1 do:

````aidl 
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
````

````aidl 
scp $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/signatures/org2_sign.json /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/signatures
````

Submit the channel definition by org1:

````aidl 
bnc channel submit-definition --config-folder $PWD/config -c /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/config_update_as_envelope_pb.pb -s /tmp/hyperledger-fabric-network/artifacts/system-channel/addOrderer/signatures/ -f config-deploy-org1.yaml -h config-hosts.yaml --addOrderer --systemChannel
````

### Step23: Add org3 definition to application channel

Now org1 will generate a new signable definition by adding the _org3.json_ to application channel

On machine1 of org1 do:

````aidl 
bnc channel generate-definition --config-folder $PWD/config -o /tmp/hyperledger-fabric-network/artifacts/org3.json -a /tmp/hyperledger-fabric-network/artifacts/org3Anchor.json -f config-deploy-org1.yaml  -h config-hosts.yaml -n mychannel
````

Copy the definition to org2 to be signed.

````aidl 
scp -r /tmp/hyperledger-fabric-network/artifacts/mychannel $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts
````

### Step24: Sign definition by org2:

On machine2 of org2 do:

````aidl 
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org2.yaml  -h config-hosts.yaml  -n mychannel -c /tmp/hyperledger-fabric-network/artifacts/mychannel/requestNewOrg/config_update_as_envelope_pb.pb
````

### Step25: Copy signature to org1 and submit it

On machine1 of org1:

````aidl 
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
````

````aidl 
scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts/mychannel/requestNewOrg/signatures /tmp/hyperledger-fabric-network/artifacts/mychannel/requestNewOrg
````

Sign definition as org1

````aidl 
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org1.yaml  -h config-hosts.yaml  -n mychannel -c /tmp/hyperledger-fabric-network/artifacts/mychannel/requestNewOrg/config_update_as_envelope_pb.pb
````

Submit the new channel definition by org1

````aidl 
bnc channel submit-definition --config-folder $PWD/config -c /tmp/hyperledger-fabric-network/artifacts/mychannel/requestNewOrg/config_update_as_envelope_pb.pb -s /tmp/hyperledger-fabric-network/artifacts/mychannel/requestNewOrg/signatures -f config-deploy-org1.yaml -h config-hosts.yaml -n mychannel
````

### Step26: Add new orderer organization definition to application channel

Org1 will create a new signable definition by adding the new orderer organization to application channel

On machine1 of org1 do:

````aidl 
bnc channel add-new-orderer-org  --config-folder $PWD/config  -f config-deploy-org1.yaml  -h config-hosts.yaml -o /tmp/hyperledger-fabric-network/artifacts/ordererOrganizationorg3.json -n mychannel
````

Copy the new definition to org2

````aidl
scp -r /tmp/hyperledger-fabric-network/artifacts/mychannel $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts
````

### Step27: Sign as org2

On machine2 of org2:

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org2.yaml  -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/config_update_as_envelope_pb.pb -n mychannel --addOrderer
````

### Step28: Sign as org1 and submit to network

First let's copy from org2 the signature to org1

On machine1 of org1:

````aidl
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
````

````aidl
scp -r $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/signatures /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer
````

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org1.yaml  -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/config_update_as_envelope_pb.pb -n mychannel --addOrderer
````

````aidl
bnc channel submit-definition --config-folder $PWD/config -c /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/config_update_as_envelope_pb.pb -s /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/signatures -f config-deploy-org1.yaml -h config-hosts.yaml -n mychannel --addOrderer
````

### Step29: Add new orderer TLS to application channel

On machine1 of org1 do:

````aidl
bnc channel add-orderer --config-folder $PWD/config -f config-deploy-org1.yaml  -h config-hosts.yaml -org /tmp/hyperledger-fabric-network/artifacts/orderer.json -n mychannel  --addTLS
````

### Step30: Sign new channel definition by org1

On machine1 of org1:

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/config_update_as_envelope_pb.pb -n mychannel --addOrderer
````
````aidl
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
````
````aidl
scp -r /tmp/hyperledger-fabric-network/artifacts/mychannel $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts
````

### Step31: Sign channel definition as org2

On machine2 of org2 do:

````aidl
bnc channel sign-definition --config-folder $PWD/config  -f config-deploy-org2.yaml  -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/config_update_as_envelope_pb.pb -n mychannel --addOrderer
````

### Step32: Submit new channel definition by org1

On machine1 of org1 do:

````aidl
scp $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/signatures/org2_sign.json /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/signatures
````

````aidl
bnc channel submit-definition --config-folder $PWD/config -c /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/config_update_as_envelope_pb.pb -s /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/signatures/ -f config-deploy-org1.yaml -h config-hosts.yaml  -n mychannel --addOrderer
````

### Step33: Add endpoint of new orderer to application channel

Here org1 will generate a new signable definition by adding the endpoint of the new orderer of org3 to application channel

On machine1 of org1:

````aidl
bnc channel add-orderer --config-folder $PWD/config -f config-deploy-org1.yaml  -h config-hosts.yaml -o orderer5.bnc.com -p 12050 --addEndpoint -n mychannel
````

Sign it as org1

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/config_update_as_envelope_pb.pb -n mychannel --addOrderer
````

Copy the channel definition to org2 to be signed

````aidl
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
````

````aidl
scp -r /tmp/hyperledger-fabric-network/artifacts/mychannel $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts
````

### Step34: Sign channel definition as org2

On machine2 of org2:

````aidl
bnc channel sign-definition --config-folder $PWD/config -f config-deploy-org2.yaml  -h config-hosts.yaml -c /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/config_update_as_envelope_pb.pb -n mychannel --addOrderer
````

### Step35: Submit channel definition to network by org1

first lets copy the signature of org2 to org1

````aidl
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM2 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
````
````aidl
scp $SSH_VM2:/tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/signatures/org2_sign.json /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/signatures
````
````aidl
bnc channel submit-definition --config-folder $PWD/config -c /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/config_update_as_envelope_pb.pb -s /tmp/hyperledger-fabric-network/artifacts/mychannel/addOrderer/signatures/ -f config-deploy-org1.yaml -h config-hosts.yaml  -n mychannel --addOrderer
````

Stop network on org1:

````aidl
bnc stop --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml
````

Stop network on org2:

````aidl
bnc stop --config-folder $PWD/config -f config-deploy-org2.yaml -h config-hosts.yaml
````

Modify _config-hosts.yaml_ on both organizations by adding IP of _host3_

Start nework on org1:

````aidl
bnc start --config-folder $PWD/config -f config-deploy-org1.yaml -h config-hosts.yaml
````
Start network on org2:

````aidl
bnc start --config-folder $PWD/config -f config-deploy-org2.yaml -h config-hosts.yaml
````

### Step36: Join channel as org3

Now org3 will join our application channel _mychannel_

On org3 do:

````aidl
bnc channel join --config-folder $PWD/config -n mychannel  -f config-deploy-org3.yaml -h config-hosts.yaml
````


### Step37: Install chaincode on org3

````aidl
bnc chaincode install --config-folder $PWD/config -f config-deploy-org3.yaml -h config-hosts.yaml -c config-chaincode.yaml
````

### Step38: Approve chaincode on org3

````aidl
bnc chaincode approve --config-folder $PWD/config -f config-deploy-org3.yaml -h config-hosts.yaml -c config-chaincode.yaml --force
````

### TEST IT :fire:

On machine1 of org1:

````aidl
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network; ssh $SSH_VM3 'sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network'
````

````aidl
scp -r /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org1.bnc.com $SSH_VM3:/tmp/hyperledger-fabric-network/organizations/peerOrganizations
````

On machine2 of org2:

````aidl
sudo chown -R ubuntu:ubuntu /tmp/hyperledger-fabric-network;
````

````aidl
scp -r /tmp/hyperledger-fabric-network/organizations/peerOrganizations/org2.bnc.com $SSH_VM3:/tmp/hyperledger-fabric-network/organizations/peerOrganizations
````

Query a value on org3:

````aidl
bnc chaincode invoke --config-folder /home/ubuntu/config -f config-deploy-org3.yaml -h config-hosts.yaml -c config-chaincode.yaml -i "query,a"
````

substract 10 from a:

````aidl 
bnc chaincode invoke --config-folder /home/ubuntu/config -f config-deploy-org3.yaml -h config-hosts.yaml -c config-chaincode.yaml -i "invoke,a,b,10"
````

Query again:

````aidl
bnc chaincode invoke --config-folder /home/ubuntu/config -f config-deploy-org3.yaml -h config-hosts.yaml -c config-chaincode.yaml -i "query,a"
````