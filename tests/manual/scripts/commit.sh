#!/bin/bash

DELAY=3
# another container before giving up
MAX_RETRY=3

CHANNEL_NAME="mychannel"
VERSION=1
SEQUENCE=1

isCommitted=false
isApproved=false



echo "INSIDE SCRIPT ###################################"


queryCommitted() {
  EXPECTED_RESULT="Version: ${VERSION}, Sequence: ${SEQUENCE}, Endorsement Plugin: escc, Validation Plugin: vscc"
  echo "===================== Querying chaincode definition on $CORE_PEER_ADDRESS on channel '$CHANNEL_NAME'... ===================== "
	local rc=1
	local COUNTER=1
	# continue to poll
  # we either get a successful response, or reach MAX RETRY
	while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
    sleep $DELAY
    echo "Attempting to Query committed status on $CORE_PEER_ADDRESS, Retry after $DELAY seconds."
    set -x
    peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name mycc >&log.txt
    #tail -n +2 log.txt > log.tmp && mv log.tmp log.txt #### added this to remove first line
    res=$?
    echo "reesss $res"
    echo "$(cat log.txt)"
    set +x

		test $res -eq 0 && VALUE=$(cat log.txt | grep -o '^Version: [0-9], Sequence: [0-9], Endorsement Plugin: escc, Validation Plugin: vscc')
    echo "here the value"
    echo $VALUE
    echo $EXPECTED_RESULT

    test "$VALUE" = "$EXPECTED_RESULT" && let rc=0
		COUNTER=$(expr $COUNTER + 1)
	done
  echo
  cat log.txt
  if test $rc -eq 0; then
    echo "===================== Query chaincode definition successful on $CORE_PEER_ADDRESS on channel '$CHANNEL_NAME' ===================== "
		echo
		#isCommitted=true
		exit 1
  else
    echo "!!!!!!!!!!!!!!! After $MAX_RETRY attempts, Query chaincode definition result on $CORE_PEER_ADDRESS is INVALID !!!!!!!!!!!!!!!!"
    echo
    #exit 1
  fi
}

## REMOVE THE BOOLEANS IS COMMITTED u dnt need them !!!
checkCommitReadiness() {
    echo
    echo

    echo "##########################checkCommitReadiness####################"


    echo "===================== Checking the commit readiness of the chaincode definition on $CORE_PEER_ADDRESS on channel '$CHANNEL_NAME'... ===================== "
    echo $1
    echo $2
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


      #echo "$@"
      #for var in "$@"
      #do
      #  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
      #  echo $var
      #  grep "$var" log.txt &>/dev/null || let rc=1
      #done
      COUNTER=$(expr $COUNTER + 1)
    done
    cat log.txt
    if test $rc -eq 0; then
      echo "===================== Checking the commit readiness of the chaincode definition successful on $CORE_PEER_ADDRESS on channel '$CHANNEL_NAME' ===================== "
      #isApproved=true
    else
      echo "!!!!!!!!!!!!!!! After $MAX_RETRY attempts, Check commit readiness result on $CORE_PEER_ADDRESS is INVALID !!!!!!!!!!!!!!!!"
      echo
      exit 1
    fi


}




commit() {
  echo "!!!!!!!!!!!!!!!!!!!Into commit!!!!!!!!!!!!!!!!!!!!!!!!!"

  # peer lifecycle chaincode commit -o orderer0.bnc.com:7050 --channelID mychannel --name mycc --version $VERSION --sequence $SEQUENCE --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem --peerAddresses peer0.org1.bnc.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls/ca.crt --peerAddresses peer0.org2.bnc.com:10051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.bnc.com/peers/peer1.org2.bnc.com/tls/ca.crt
}




queryCommitted
#checkCommitReadiness "$@"
checkCommitReadiness "$1" "$2"
commit

#checkCommitReadiness "\"org1MSP\": true" "\"org2MSP\": true"
#commit
#check commit readiness needs two MSP of both args