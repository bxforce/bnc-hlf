In this tutorial, we will run the default config and deploy an external chaincode.

**Important**

The default name generated by BNC is _external.org1.bnc.com_ .

If you want to change the default name, you have to create the file chaincode.env and set the variable _CHAINCODE_SERVER_ADDRESS_.

## Getting Started :rocket:

Run the network without deploying the default chaincode.

````aidl
curl https://raw.githubusercontent.com/bxforce/bnc-hlf/master/tests/demo/config.yaml > config.yaml
````

````aidl
bnc run --no-chaincode --config-folder $PWD -f config.yaml -g config.yaml
````

````aidl
curl https://raw.githubusercontent.com/bxforce/bnc-hlf/master/tests/demo/config-chaincode.yaml > config-chaincode.yaml
````

Package the external chaincode configuration and deploy it

````aidl
bnc chaincode deploy --config-folder $PWD -f config.yaml -c config-chaincode.yaml
````
Build the external chaincode image

````aidl
docker build -t external-abstore tests/chaincode/external
````

Run the external chaincode for org1:

````aidl
docker run -d --name external.org1.bnc.com --env-file /tmp/hyperledger-fabric-network/chaincode/chaincode.env --network=bnc_network external-abstore
````

### TEST IT :fire:

````aidl
bnc chaincode invoke --config-folder $PWD -f config.yaml -c config-chaincode.yaml -i "Init,a,100,b,100" 
````
````aidl
bnc chaincode query --config-folder $PWD -f config.yaml -c config-chaincode.yaml -i "query,a" 
````
````aidl
bnc chaincode invoke --config-folder $PWD -f config.yaml -c config-chaincode.yaml -i "invoke,a,b,10"
````