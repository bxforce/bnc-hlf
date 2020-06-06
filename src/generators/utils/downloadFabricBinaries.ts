import { BaseGenerator } from '../base';
import { Network } from '../../models/network';

// TODO inline the script with the one here: https://github.com/hyperledger/fabric/blob/master/scripts/bootstrap.sh
/**
 * Class responsible to download Hyperledger Fabric binaries
 *
 * @author wassim.znaidi@gmail.com
 */
export class DownloadFabricBinariesGenerator extends BaseGenerator {
  contents = `
    #!/bin/bash
  set -e
# Download the necessary bin files

export VERSION=${this.network.options.hyperledgerVersion}
export CA_VERSION=${this.network.options.hyperledgerCAVersion}
export THIRDPARTY_IMAGE_VERSION=${this.network.options.externalHyperledgerVersion}
export ARCH=$(echo "$(uname -s|tr '[:upper:]' '[:lower:]'|sed 's/mingw64_nt.*/windows/')-$(uname -m | sed 's/x86_64/amd64/g')")
export MARCH=$(uname -m)

download() {
  local BINARY_FILE=$1
  local URL=$2
  echo "===> Downloading: " "$URL"
  curl -L -o "$BINARY_FILE" "$URL" || rc=$?
  tar xvzf "$BINARY_FILE" || rc=$?
  rm "$BINARY_FILE"
  if [ -n "$rc" ]; then
      echo "==> There was an error downloading the binary file."
      return 22
  else
      echo "==> Done."
  fi
}

binariesInstall() {
  echo "===> Downloading version $FABRIC_TAG platform specific fabric binaries"
  download "$BINARY_FILE" "https://github.com/hyperledger/fabric/releases/download/v$VERSION/$BINARY_FILE"
  if [ $? -eq 22 ]; then
      echo
      echo "------> $FABRIC_TAG platform specific fabric binary is not available to download <----"
      echo
      exit
  fi

  echo "===> Downloading version $CA_TAG platform specific fabric-ca-client binary"
  download "$CA_BINARY_FILE" "https://github.com/hyperledger/fabric-ca/releases/download/v$CA_VERSION/$CA_BINARY_FILE"
  if [ $? -eq 22 ]; then
      echo
      echo "------> $CA_TAG fabric-ca-client binary is not available to download  (Available from 1.1.0-rc1) <----"
      echo
      exit
  fi
}


BINARY_FILE=hyperledger-fabric-$ARCH-$VERSION.tar.gz
CA_BINARY_FILE=hyperledger-fabric-ca-$ARCH-$CA_VERSION.tar.gz

echo "Installing Hyperledger Fabric binaries"

DIRECTORY=${this.network.options.networkConfigPath}/fabric-binaries/${this.network.options.hyperledgerVersion}

if [ ! -d "$DIRECTORY" ]; then
    mkdir -p $DIRECTORY
    cd $DIRECTORY
    binariesInstall
fi

if [ -d "$DIRECTORY" ]; then
  echo "Binaries exist already"
fi

echo "Checking IMAGES"

  dockerFabricPull() {
    local FABRIC_TAG=$1
    for IMAGES in peer orderer tools; do
        echo "==> FABRIC IMAGE: $IMAGES"
        echo
        docker pull hyperledger/fabric-$IMAGES:$FABRIC_TAG
        docker tag hyperledger/fabric-$IMAGES:$FABRIC_TAG hyperledger/fabric-$IMAGES
    done
  }
  
  dockerThirdPartyImagesPull() {
    local THIRDPARTY_TAG=$1
    for IMAGES in couchdb; do
        echo "==> THIRDPARTY DOCKER IMAGE: $IMAGES"
        echo
        docker pull hyperledger/fabric-$IMAGES:$THIRDPARTY_TAG
        docker tag hyperledger/fabric-$IMAGES:$THIRDPARTY_TAG hyperledger/fabric-$IMAGES
    done
  }
  
  dockerCaPull() {
        local CA_TAG=$1
        echo "==> FABRIC CA IMAGE"
        echo
        docker pull hyperledger/fabric-ca:$CA_TAG
        docker tag hyperledger/fabric-ca:$CA_TAG hyperledger/fabric-ca
  }

  dockerInstall() {
    which docker >& /dev/null
    
    echo "===> Pulling fabric Images"
    dockerFabricPull $FABRIC_TAG
    echo "===> Pulling fabric ca Image"
    dockerCaPull $CA_TAG
    echo "===> Pulling thirdparty docker images"
    dockerThirdPartyImagesPull $THIRDPARTY_TAG
    echo
    echo "===> List out hyperledger docker images"
    docker images | grep 'hyperledger*'

  }

export CA_TAG="$CA_VERSION"
export FABRIC_TAG="$VERSION"
export THIRDPARTY_TAG="$THIRDPARTY_IMAGE_VERSION"

dockerInstall
`;

  /**
   * Constructor
   * @param filename
   * @param path
   * @param network
   */
  constructor(filename: string, path: string, private network?: Network) {
    super(filename, path);
  }
}
