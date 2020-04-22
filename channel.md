**Command to create channel:** 

bnc channel create -t '../../artifacts/channel/mychannel.tx' -n mychannel -o Org1

**Command to join channel:**

bnc channel join -n mychannel -o Org1 -p "peer0.org1.example.com,peer1.org1.example.com"

**Before running those commands i started the network of fabric-samples/balance-transfer:**

https://github.com/hyperledger/fabric-samples/tree/v1.4.6/balance-transfer


**To start the network do the following:**

`cd fabric-samples/balance-transfer
docker-compose -f artifacts/docker-compose.yaml up`

PS: the folder bnc-tools/artifacts is the same : balance-transfer/artifacts

If you want to create a new channel with a new name you have to do :

1- create the file newname.tx : 

`cd balance-transfer/artifacts/channel`

`../../../bin/configtxgen -channelID newnamechannel -outputCreateChannelTx newnamechannel.tx -profile TwoOrgsChannel`

this will create the file newnamechannel.tx

copy that file and put it under bnc-tools/artifacts/channel

2- Update section channels in the file network-config.yaml