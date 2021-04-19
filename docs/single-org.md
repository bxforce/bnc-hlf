## Getting started with single organization

For this tutorial, we will be using these two files : [files](https://github.com/bxforce/bnc-hlf/tree/master/tests/single_machine)

Since we will be running a single org on a single machine the config-hosts will point to localhost.
Now we will explain different sections of the config.yaml file:

Notice we have 4 sections: genesis/chains/chaincode/engines

These sections were explained in the tutorial : input.md
            
### Run single org with one peer and one orderer:
`docker pull bxforce/bnc-hlf:$BNC_HLF_VERSION`

`mkdir single_machine`

opy the files under tests/single_machine in the folder you have just created.

`export BNC_CONFIG_PATH=$PWD/single_machine`

`mkdir -p bin; echo "docker run -it --rm --name bnc-hlf --network bnc_network -v \$BNC_CONFIG_PATH:/bnc/config -v /tmp/hyperledger-fabric-network:/tmp/hyperledger-fabric-network -v volume_chaincode:/bnc/chaincode -v /var/run/docker.sock:/var/run/docker.sock bnc-hlf \$@" > bin/bnc'
`

`./bin/bnc run`
