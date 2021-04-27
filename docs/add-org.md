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
sudo curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/bin/bnc -o /usr/local/bin/bnc && sudo chmod +x /usr/local/bin/bnc
````

````aidl
ssh $SSH_VM3 'sudo curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/bin/bnc -o /usr/local/bin/bnc && sudo chmod +x /usr/local/bin/bnc'
````

### Step2: Create conffig files


````aidl
ssh $SSH_VM3 'mkdir config'
````

````aidl
ssh $SSH_VM3 'curl https://github.com/bxforce/bnc-hlf/blob/improve-docs/tests/multi_machine/add-org/config-deploy-org2.yaml > $PWD/config/config-deploy-org2.yaml'
````

````aidl
ssh $SSH_VM3 'curl https://github.com/bxforce/bnc-hlf/blob/improve-docs/tests/multi_machine/add-org/config-hosts.yaml > $PWD/config/config-hosts.yaml'
````

````aidl
ssh $SSH_VM3 'curl https://github.com/bxforce/bnc-hlf/blob/improve-docs/tests/multi_machine/add-org/config-chaincode.yaml > $PWD/config/config-chaincode.yaml'
````

### Step3: Generate certificates for new organization

````aidl
ssh $SSH_VM3 -t 'bnc generate --config-folder $PWD/config -f config-deploy-org3.yaml -h config-hosts.yaml'
````

### Step4: Start the peer of org3

````aidl
ssh $SSH_VM3 -t 'bnc start --config-folder $PWD/config -f config-deploy-org3.yaml -h config-hosts.yaml --no-orderer'
````
