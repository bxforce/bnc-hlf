#!/bin/bash

set -e

export CORE_PEER_TLS_ENABLED=true

setGlobals(){
  echo "setting globals"
  export CORE_PEER_TLS_ROOTCERT_FILE=$1
  echo ${CORE_PEER_TLS_ROOTCERT_FILE}
  export CORE_PEER_ADDRESS=$2
  echo ${CORE_PEER_ADDRESS}
}
setGlobals $1 $2
