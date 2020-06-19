# Description

The BNC tools provides a pre-defined set of command to be executed in order to deal with a blockchain infrastructure.


## Node configuration files

* __Generate all shared configuration files__
  ````
  bnc init --config/-f [bncGenesisConfigurationFilePath]
  ````
Or
 
* __generate genesis block__
    ````
    bnc init --genesis -f [bncGenesisConfigurationFilePath]
    ````
* __generate configTx__
    ````
    bnc init --configtx -f [bncGenesisConfigurationFilePath]
    ````
* __~~generate anchorTx~~__: **_not yet implemented_**
    ````
    bnc init --anchortx -f [bncGenesisConfigurationFilePath]
    ````

## Crypto & Certificate credentials files

* __generate nodes peers credentials__
    ````
    bnc enroll-peers -f [bncDeploymentConfigFilePath]
    ````
* __generate nodes orderers credentials__
    ````
    bnc enroll-orderers -f [bncGenesisConfigFilePath]
    ````

##  Container start/stop

* __start network__: start hyperledger entities containers (peers & orderers)
    ````
    bnc start -f [bncDeploymentConfigFilePath]
    ````

* __stop network__: stop 
    ````
    bnc stop -f [bncDeploymentConfigFilePath]
    ````
