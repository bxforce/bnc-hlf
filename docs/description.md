
# Description

The BNC tool will use the default configured folder (provided in the deployment input configuration file) as the main the folder for the tool.
Under this default root folder, the BNC tool will create different sub-folder as follow:

```
$ROOT_FOLDER
│───artifacts:
│───settings:
│───docker-compose: 
│───fabric-binaries:
│   │   fabric-ca:
│───organizations:
│   │   fabric-ca:
│   │   ordererOrganizations:
│   │   peerOrganizations:
│───wallet
│   │   organizations: 
```

# Deployment configuration file

The above section describe the structure of the deployment input configuration
file to be provided as parameters to many BNC commands. The file is structured as follow:

# Genesis configuration file

TODO

# BNC command description:

```
Usage: bnc [options] [command]

Options:
  -V, --version                      output the version number
  -h, --help                         display help for command

Commands:
  init [options]                     creates genesis.block and configtx files for channel and anchor update
  enroll-orderers [options]          creates crypto material for the orderers
  enroll-peers [options]             creates crypto material for the peers
  generate [options]                 creates crypto material, genesis.block and configtx files
  start [options]                    create/start network
  stop [options]                     stop the blockchain
  rm [options]                       Removes all BNC containers and related volumes and the dev peer images
  run [options]                      Starts the default network with single organization
  generate-org-definition [options]  generates new org definiton to be added to channel
  generate-new-genesis [options]     generates new genesis to bootstrap new orderer
  channel                            manages create/join/update channel
  chaincode                          manages deployment of chaincode
  help [command]                     display help for command
```
