#!/bin/bash

#source install.sh
set -e

echo "HELLOOOOOOOOOOOOOOOOOOOOOOOOOOO"
echo "${CORE_PEER_ADDRESS}"
#VERSION=1
#CC_NAME=mycc
echo $CC_NAME

packageChaincode() {
  set -x
  peer lifecycle chaincode package "$CC_NAME.tar.gz" --path "$CC_ROOT_PATH/$CC_PATH" --lang golang --label "$CC_NAME"_1 >&log.txt
  res=$?
  set +x
  cat log.txt
  verifyResult $res "Chaincode packaging on ${CORE_PEER_ADDRESS} has failed"
  echo "===================== Chaincode is packaged  ===================== "
  echo
}

# installChaincode PEER ORG
installChaincode() {
  set -x
  peer lifecycle chaincode install $CC_NAME.tar.gz >&log.txt
  res=$?
  set +x
  cat log.txt
  verifyResult $res "Chaincode installation on peer0.org${CORE_PEER_LOCALMSPID} has failed"
  echo "===================== Chaincode is installed on ${CORE_PEER_ADDRESS} ===================== "
  echo
}

# queryInstalled PEER ORG
queryInstalled() {

  set -x
  peer lifecycle chaincode queryinstalled >&log.txt
  res=$?
  set +x
  cat log.txt
  PACKAGE_ID=$(sed -n "/${CC_NAME}_${VERSION}/{s/^Package ID: //; s/, Label:.*$//; p;}" log.txt)
  verifyResult $res "Query installed on ${CORE_PEER_ADDRESS} has failed"
  echo "$PACKAGE_ID"
  echo "$PACKAGE_ID" >&"package_$CC_NAME.txt"
  cat "package_$CC_NAME.txt"
  echo "===================== Query installed successful  on channel ===================== "
  echo
}

verifyResult() {
  if [ $1 -ne 0 ]; then
    echo "!!!!!!!!!!!!!!! "$2" !!!!!!!!!!!!!!!!"
    echo
    exit 1
  fi
}

packageChaincode
installChaincode
queryInstalled





