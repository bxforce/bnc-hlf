
# bnc-hlf

Blockchain Network Composer for Hyperledger Fabric.
BNC is the CLI deployment tools for Enterprise Blockchain projects.
It supports mainly Hyperledger Blockchain umbrella.

Using BNC everyone can easily:
    
* Start a network with a configured number of organizations/peers/orderers.

* Deploy, configure and channels
    
* Deploy, configure and upgrade chaincodes 
    
* Add a new organization or a new orderer to the network

## Prerequisites

[Install docker](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-20-04-fr)

[Install docker-compose](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-compose-on-ubuntu-20-04-fr)

## Install

````aidl
sudo curl -L https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/bin/bnc -o /usr/local/bin/bnc && sudo chmod +x /usr/local/bin/bnc
````


## Getting Started :rocket:


### Run default demo

The following command will start a network of a single orderer _orderer1.bnc.com_ , a single peer _peer1.org1.bnc.com_ and a certificate authority _ca1_.

It will also deploy the default chaincode  which is the [abstore chaincode](https://github.com/hyperledger/fabric-samples/tree/main/chaincode/abstore) of fabric-samples.

To start the network run the following command:


````aidl
bnc run
````

By running the command above without specifying `--config-folder $PWD` it will take the default [config files](https://github.com/bxforce/bnc-hlf/tree/master/tests/demo).

We will see how you can use `--config-folder` to provide your own configuration files.

**Clear BNC:**

The following command will remove all BNC containers and remove the related volumes.


````aidl
bnc rm
````

### Run your own configuration 

#### Step1: Create config files

````aidl
curl https://raw.githubusercontent.com/bxforce/bnc-hlf/master/tests/single_machine/config.yaml > config.yaml
````

#### Step2: Build and run your app with BNC

````aidl
bnc run --config-folder $PWD 
````

The command above will start a single organization with single peer and orderer.

It will deploy the default absotre chaincode embedded in the image.

**Clear BNC:**

````aidl
bnc rm --config-folder $PWD
````

### Run and Configure BNC with your own chaincode

In this section we will explain how to provide your own chaincode.

We will be running a single org on a single machine.

#### Step1: Create config files

````aidl
curl https://raw.githubusercontent.com/bxforce/bnc-hlf/master/tests/single_machine/config.yaml > config.yaml
````

#### Step2: Configure your own chaincode

Open the config.yaml file in the config directory with your favorite editor.

In the chaincode section, notice we have this attribute `root_path_chaincode: "volume_chaincode"`

Instead of `_volume_chaincode_` put the absolute path to the folder e.g. `root_path_chaincode: "/home/ubuntu/bnc-hlf/tests/chaincode/"`

Notice we have : _path_chaincode: "abstore"_ which is the folder containing your .go files.

Notice we have : _lang_chaincode_ if chaincode is in golang leave it to "golang", if it is in nodeJS put: "node"

You can override the default chaincode configuration by passing the flag _-c_ as we will show later


#### Step3: Build and run your app with BNC

The following command will start the network and deploy the chaincode

````aidl
bnc run --config-folder $PWD
````

If you want to start your network first, and deploy your chaincode seperately, you can do it like this:

````aidl
bnc run  --config-folder $PWD --no-chaincode
````

````aidl
bnc chaincode deploy --config-folder $PWD
````

Override the default chaincode configuration:

````aidl
bnc chaincode deploy --config-folder $PWD -c /bnc/config/config-chaincode.yaml
````

#### Step4: Check if its working

````aidl
docker ps
````

You should be able to see running the orderers/peers configured in the _config.yaml_ file and most importantly you

should be able to see the _dev-peer_ containers of your chaincode.

If you want to test your chaincode do the following: (this is testing fabric-samples abstore)

`docker exec -it cli.org1.bnc.com bash`

 ````shell script
peer chaincode invoke -o orderer1.bnc.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/org1.bnc.com/orderers/orderer1.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem -C mychannel -n mycc --peerAddresses peer1.org1.bnc.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer1.org1.bnc.com/tls/ca.crt -c '{"Args":["Init","a","100","b","100"]}' --waitForEvent
````

query chaincode 

 ````shell script
peer chaincode query -C mychannel -n mycc -c '{"Args":["query","a"]}'
````

call the invoke fct to move 10 from a to b

 ````shell script
peer chaincode invoke -o orderer1.bnc.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/org1.bnc.com/orderers/orderer1.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem -C mychannel -n mycc --peerAddresses peer1.org1.bnc.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer1.org1.bnc.com/tls/ca.crt -c '{"Args":["invoke","a","b","10"]}' --waitForEvent
 ````

#### Step5: Clear BNC

The following command will remove all BNC containers and remove the related volumes.

**Clear BNC:**

````aidl
bnc rm --config-folder $PWD
````


## Process overview (two orgs example) :bulb:

In the process below, we illustrate the process of starting a consortium blockchain with two organizations: org1 and org2.

In this scenario, org1 is the organization in charge of creating the genesis block and the channel. 

In order to generate the genesis block and the channel definition, org2 shares its orderers/peers certificates with org1.

These generated artifacts by org1 are shared with org2.


![BNC](/docs/bnc.PNG)


## Tutorials :books:
* [input files](docs/input.md)
* [Run two org on a single machine](docs/two-org.md)
* [Run two org on two machines](docs/two-org.md)
* [Add orderer to your running organization](docs/two-org.md)
* [Add new organization to your network](docs/two-org.md)


## Contributing

1. Fork it! 🍴
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request 😁 🎉


## Credits

- Lead - Wassim Znaidi ([@Wassimz](https://github.com/wassimz))
- Developer - Ahmed Souissi ([@ahmeds](#))
- Developer - Sahar Fehri ([@sharf](#))
- Product owner - Chiraz Chaabane ([@chirazc](#))
- [@worldsibu](https://github.com/worldsibu) for inspiration and some part of the util code.


## Changelog

[Go to changelog](./changelog.md)
