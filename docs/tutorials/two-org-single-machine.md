## Deploying two organizations on a single machine

For this tutorial, we will be using these files :

* [config-deploy-org1.yaml](https://github.com/bxforce/bnc-hlf/blob/master/tests/single_machine/two-orgs/config-deploy-org1.yaml)
* [config-deploy-org2.yaml](https://github.com/bxforce/bnc-hlf/blob/master/tests/single_machine/two-orgs/config-deploy-org2.yaml)
* [config-genesis-org1-org2.yaml](https://github.com/bxforce/bnc-hlf/blob/master/tests/single_machine/two-orgs/config-genesis-org1-org2.yaml)
* [config-chaincode.yaml](https://github.com/bxforce/bnc-hlf/blob/master/tests/single_machine/two-orgs/config-chaincode.yaml)

Check the files to see the configuration of each organization.

For the chaincode we will be deploying [abstore chaincode](https://github.com/hyperledger/fabric-samples/tree/main/chaincode/abstore) of fabric-samples.

## Install

````aidl
sudo curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/master/bin/bnc -o /usr/local/bin/bnc && sudo chmod +x /usr/local/bin/bnc
````

## Getting Started :rocket:

### Step1: Create config files

````aidl
mkdir config
````

````aidl
curl https://github.com/bxforce/bnc-hlf/blob/master/tests/single_machine/config-deploy-org1.yaml > $PWD/config/config-deploy-org1.yaml
````

````aidl
curl https://github.com/bxforce/bnc-hlf/blob/master/tests/single_machine/config-deploy-org2.yaml > $PWD/config/config-deploy-org1.yaml
````

````aidl
curl https://github.com/bxforce/bnc-hlf/blob/master/tests/single_machine/config-genesis-org1-org2.yaml > $PWD/config/config-genesis-org1-org2.yaml
````

````aidl
curl https://github.com/bxforce/bnc-hlf/blob/master/tests/single_machine/config-chaincode.yaml > $PWD/config/config-chaincode.yaml
````

### Step2: Enroll peers and orderers of org2


Now we will start by generating crypto material for org2:

````aidl
bnc generate --config-folder $PWD/config -f config-deploy-org2.yaml 
````

### Step3: Enroll peers and orderers of org1

Now we will start by generating crypto material for org1:

````aidl
bnc generate --config-folder $PWD/config -f config-deploy-org1.yaml -g config-genesis-org1-org2.yaml
````

### Step4: Start peers/orderers of org2

````aidl
bnc start --config-folder $PWD/config -f config-deploy-org2.yaml
````

### Step5: Start peers/orderers of org1

````aidl
bnc start --config-folder $PWD/config -f config-deploy-org1.yaml
````

### Step6: Create channel, join the channel and update anchor peer on org1:

````aidl
bnc channel deploy --config-folder $PWD/config -f config-deploy-org1.yaml 
````

### Step7: Join the channel and update anchor peer on org1:

````aidl
bnc channel deploy --config-folder $PWD/config -f config-deploy-org2.yaml --no-create
````

### Step8: Deploy chaincode on org2:

The following command will install + approve + commit chaincode

````aidl
bnc chaincode deploy --config-folder $PWD/config -f config-deploy-org2.yaml -c config-chaincode.yaml
````

### Step9: Deploy chaincode on org1:

````aidl
bnc chaincode deploy --config-folder $PWD/config -f config-deploy-org1.yaml -c config-chaincode.yaml
````

### Step10: TEST IT :fire:

Org1 will do the first invoke

 ````shell script
bnc chaincode invoke --config-folder $PWD/config -f config-deploy-org1.yaml -c config-chaincode.yaml -i "Init,a,100,b,100"
````

query chaincode 

 ````shell script
bnc chaincode query --config-folder $PWD/config -f config-deploy-org1.yaml -c config-chaincode.yaml -i "query,a"
````

call the invoke fct to move 10 from a to b

 ````shell script
bnc chaincode invoke --config-folder $PWD/config -f config-deploy-org1.yaml -c config-chaincode.yaml -i "invoke,a,b,10"
````
Invoke as org2

 ````shell script
bnc chaincode invoke --config-folder $PWD/config -f config-deploy-org2.yaml -c config-chaincode.yaml -i "invoke,a,b,10"
````

### Step11: Shutdown network

 ````shell script
bnc rm --config-folder $PWD/config -f config-deploy-org1.yaml
````

 ````shell script
bnc rm --config-folder $PWD/config -f config-deploy-org2.yaml
````