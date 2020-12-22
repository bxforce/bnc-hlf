#!/bin/bash

echo "$CC_NAME"

PACKAGE_ID=$(</opt/gopath/src/github.com/hyperledger/fabric/peer/"package_${CC_NAME}_${VERSION}".txt)

echo "$PACKAGE_ID"
echo "$SEQUENCE"

#CHANNEL_NAME=mychannel

verifyResult() {
  if [ $1 -ne 0 ]; then
    echo "!!!!!!!!!!!!!!! "$2" !!!!!!!!!!!!!!!!"
    echo
    exit 1
  fi
}

approve() {
  if [[ -z "${ENDORSEMENT}" ]]; then
    peer lifecycle chaincode approveformyorg --channelID $CHANNEL_NAME --name $CC_NAME --version $VERSION --package-id $PACKAGE_ID --sequence $SEQUENCE --tls --cafile $CORE_ORDERER_TLS_ROOTCERT >&log.txt
  else
    echo "______________________Updating endorsement policy___________________"
    peer lifecycle chaincode approveformyorg --channelID $CHANNEL_NAME --name $CC_NAME --version $VERSION --package-id $PACKAGE_ID --sequence $SEQUENCE --tls --cafile $CORE_ORDERER_TLS_ROOTCERT --signature-policy "${ENDORSEMENT}" >&log.txt
  fi
  cat log.txt
  res=$?
  verifyResult $res "Chaincode definition approved on $CORE_PEER_ADDRESS on channel '$CHANNEL_NAME' failed"
  echo "===================== Chaincode definition approved on $CORE_PEER_ADDRESS on channel '$CHANNEL_NAME' ===================== "
  echo
}

checkApprovedForMyOrg() {
    echo
    echo

    echo "##########################checkCommitReadiness####################"
    echo "$@"

    echo "===================== Checking the commit readiness of the chaincode definition on $CORE_PEER_ADDRESS on channel '$CHANNEL_NAME'... ===================== "

    local rc=1
    local COUNTER=0
    # continue to poll
    # we either get a successful response, or reach MAX RETRY
    while [ $rc -ne 0 -a $COUNTER -lt 1 ] ; do
      sleep 1
      echo "Attempting to check the commit readiness of the chaincode definition on $CORE_PEER_ADDRESS, Retry after 1 seconds."
      set -x
      if [[ -z "${ENDORSEMENT}" ]]; then
          peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name $CC_NAME --version $VERSION --sequence $SEQUENCE --tls --cafile ${CORE_ORDERER_TLS_ROOTCERT} --output json >&log.txt
      else
          peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name $CC_NAME --version $VERSION --sequence $SEQUENCE --tls --cafile ${CORE_ORDERER_TLS_ROOTCERT} --signature-policy "${ENDORSEMENT}" --output json >&log.txt
      fi
      res=$?
      set +x
      let rc=0
      echo " seee what it isss"
      echo "$@"
      for var in "$@"
      do
        grep "$var" log.txt &>/dev/null || let rc=1
      done
      COUNTER=$(expr $COUNTER + 1)
    done
    cat log.txt
    if test $rc -eq 0; then
      echo "===================== Checking the commit readiness of the chaincode definition successful on $CORE_PEER_ADDRESS on channel '$CHANNEL_NAME' ===================== "
      echo "===================== ALREADY APPROVED ===================="
      exit 1
    else
      echo " PROCEED TO APPROVE"
      echo

    fi


}

#checkApprovedForMyOrg "\"$CORE_PEER_LOCALMSPID\": true"
approve