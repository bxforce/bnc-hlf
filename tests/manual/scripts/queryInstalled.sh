#!/bin/bash
set -e

queryInstalled() {

  set -x
  peer lifecycle chaincode queryinstalled >&log.txt
  res=$?
  set +x
  cat log.txt
  export PACKAGE_ID=$(sed -n "/mycc${VERSION}/{s/^Package ID: //; s/, Label:.*$//; p;}" log.txt)
  verifyResult $res "Query installed on ${CORE_PEER_ADDRESS} has failed"
  echo $PACKAGE_ID
}

verifyResult() {
  if [ $1 -ne 0 ]; then
    echo "!!!!!!!!!!!!!!! "$2" !!!!!!!!!!!!!!!!"
    echo
    exit 1
  fi
}

queryInstalled