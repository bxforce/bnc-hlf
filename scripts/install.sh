#!/bin/bash

set -e

packageChaincode() {
  if [ $CC_LANG = "external" ]
  then
    if [ ! -f "$CC_NAME.tar.gz" ]
    then
      set -x
      env $(cat "$CC_ROOT_PATH/$CC_ENV_PATH" | grep -v "#" | xargs) jq -n '{"address":env.CHAINCODE_SERVER_ADDRESS,"dial_timeout":"10s","tls_required":false}' > connection.json
      tar cfz code.tar.gz connection.json
      echo '{"path":"","type":"external","label":"'${CC_NAME}'"}' > metadata.json
      tar cfz "$CC_NAME.tar.gz" metadata.json code.tar.gz
      set +x
      cat metadata.json
      cat connection.json
    fi
    echo "===================== Chaincode is packaged  ===================== "
    echo
  else
    set -x
    peer lifecycle chaincode package "$CC_NAME.tar.gz" --path "$CC_ROOT_PATH/$CC_PATH" --lang "$CC_LANG" --label "$CC_NAME"_"$VERSION" >&log.txt
    res=$?
    set +x
    cat log.txt
    verifyResult $res "Chaincode packaging on ${PEER_NAME} has failed"
    echo "===================== Chaincode is packaged  ===================== "
    echo
  fi  
}

installChaincode() {
  set -x
  peer lifecycle chaincode install $CC_NAME.tar.gz >&log.txt
  res=$?
  set +x
  cat log.txt
  verifyResult $res "Chaincode installation on peer0.org${PEER_NAME} has failed"
  echo "===================== Chaincode is installed on ${CORE_PEER_ADDRESS} ===================== "
  echo
}

queryInstalled() {
  set -x
  peer lifecycle chaincode queryinstalled >&log.txt
  res=$?
  set +x
  cat log.txt
  verifyResult $res "Query installed on ${CORE_PEER_ADDRESS} has failed"
  if [ $CC_LANG = "external" ]
  then
    CHAINCODE_ID=`cat log.txt | tail -n 1 | cut -d',' -f1 | cut -d' ' -f3`
    sed -i 's/^\(CHAINCODE_ID=\s*\).*$/\1'$CHAINCODE_ID'/' "$CC_ROOT_PATH/$CC_ENV_PATH"
    echo "$CHAINCODE_ID" >&"package_${CC_NAME}_${VERSION}.txt"
  else
    PACKAGE_ID=$(sed -n "/${CC_NAME}_${VERSION}/{s/^Package ID: //; s/, Label:.*$//; p;}" log.txt)
    echo "$PACKAGE_ID"
    echo "$PACKAGE_ID" >&"package_${CC_NAME}_${VERSION}.txt"
  fi
  cat "package_${CC_NAME}_${VERSION}.txt"
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





