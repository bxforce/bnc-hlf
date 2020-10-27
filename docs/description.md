
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


