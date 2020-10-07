#!/bin/bash

DELAY=3
# another container before giving up
MAX_RETRY=3

CHANNEL_NAME="mychannel"
VERSION=1
SEQUENCE=1

peerTargets=""



echo "INSIDE SCRIPT ###################################"


queryCommitted() {
  EXPECTED_RESULT="Version: ${VERSION}, Sequence: ${SEQUENCE}, Endorsement Plugin: escc, Validation Plugin: vscc"
  echo "===================== Querying chaincode definition on $CORE_PEER_ADDRESS on channel '$CHANNEL_NAME'... ===================== "
	local rc=1
	local COUNTER=1
	while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
    sleep $DELAY
    echo "Attempting to Query committed status on $CORE_PEER_ADDRESS, Retry after $DELAY seconds."
    set -x
    peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name mycc >&log.txt
    #tail -n +2 log.txt > log.tmp && mv log.tmp log.txt #### added this to remove first line
    res=$?
    set +x
		test $res -eq 0 && VALUE=$(cat log.txt | grep -o '^Version: [0-9], Sequence: [0-9], Endorsement Plugin: escc, Validation Plugin: vscc')
    test "$VALUE" = "$EXPECTED_RESULT" && let rc=0
		COUNTER=$(expr $COUNTER + 1)
	done
  echo
  if test $rc -eq 0; then
    cat log.txt
    echo "===================== Query chaincode definition successful on $CORE_PEER_ADDRESS on channel '$CHANNEL_NAME' ===================== "
		echo "===================== ALREADY COMMITTED ===================== "
		echo
		exit 1
  else
    echo "!!!!!!!!!!!!!!! After $MAX_RETRY attempts, Query chaincode definition result on $CORE_PEER_ADDRESS is INVALID !!!!!!!!!!!!!!!!"
    echo
  fi
}

## REMOVE THE BOOLEANS IS COMMITTED u dnt need them !!!
checkCommitReadiness() {
    echo
    echo
    echo "===================== Checking the commit readiness of the chaincode definition on $CORE_PEER_ADDRESS on channel '$CHANNEL_NAME'... ===================== "
    echo $1
    echo $2
    peerTargets="$2"
    local rc=1
    local COUNTER=1
    # continue to poll
    # we either get a successful response, or reach MAX RETRY
    while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
      sleep $DELAY
      echo "Attempting to check the commit readiness of the chaincode definition on $CORE_PEER_ADDRESS, Retry after $DELAY seconds."
      set -x
      peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name mycc --version $VERSION --sequence $SEQUENCE --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem --output json >&log.txt
      res=$?
      set +x
      let rc=0
      echo " seee what it isss"

      IFS=';' read -ra allvars <<< $(echo $1)
      for var in "${allvars[@]}"
      do
        echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
        echo $var
        grep "$var" log.txt &>/dev/null || let rc=1
      done
      COUNTER=$(expr $COUNTER + 1)
    done
    cat log.txt
    if test $rc -eq 0; then
      echo "===================== Checking the commit readiness of the chaincode definition successful on $CORE_PEER_ADDRESS on channel '$CHANNEL_NAME' ===================== "
    else
      echo "!!!!!!!!!!!!!!! After $MAX_RETRY attempts, Check commit readiness result on $CORE_PEER_ADDRESS is INVALID !!!!!!!!!!!!!!!!"
      echo
      exit 1
    fi


}



commit() {
  echo "!!!!!!!!!!!!!!!!!!!Into commit!!!!!!!!!!!!!!!!!!!!!!!!!"
  set -x
  peer lifecycle chaincode commit -o orderer0.bnc.com:7050 --tls --cafile ${CORE_ORDERER_TLS_ROOTCERT} --channelID mychannel --name mycc --version $VERSION --sequence $SEQUENCE  ${peerTargets} >&log.txt
  res=$?
  set +x
  cat log.txt
  verifyResult $res "Chaincode definition commit failed on channel mychannel failed"
  echo "===================== Chaincode definition committed on channel mychannel ===================== "
  echo

}




queryCommitted
checkCommitReadiness "$1" "$2"
commit
