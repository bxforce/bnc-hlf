/*
Copyright 2020 IRT SystemX

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { join } from 'path';
import { SysWrapper } from '../../utils/sysWrapper';
import { e, l } from '../../utils/logs';

/**
 * Class Responsible to generate scripts to manage chaincode
 *
 */
export class ChaincodeScriptsGenerator {
    /* install.sh contents */
    install = `
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
      echo '{"path":"","type":"external","label":"'\${CC_NAME}'"}' > metadata.json
      tar cfz "$CC_NAME.tar.gz" metadata.json code.tar.gz
      set +x
      cat metadata.json
      cat connection.json
    fi
    echo "===================== Chaincode is packaged for \${PEER_NAME} ===================== "
    echo
  else
    set -x
    peer lifecycle chaincode package "$CC_NAME.tar.gz" --path "$CC_ROOT_PATH/$CC_PATH" --lang "$CC_LANG" --label "$CC_NAME"_"$VERSION" >&log.txt
    res=$?
    set +x
    cat log.txt
    verifyResult $res "Chaincode packaging on \${PEER_NAME} has failed"
    echo "===================== Chaincode is packaged for \${PEER_NAME} ===================== "
    echo
  fi  
}

installChaincode() {
  set -x
  peer lifecycle chaincode install $CC_NAME.tar.gz >&log.txt
  res=$?
  set +x
  cat log.txt
  verifyResult $res "Chaincode installation on \${PEER_NAME} has failed"
  echo "===================== Chaincode is installed on \${CORE_PEER_ADDRESS} ===================== "
  echo
}

queryInstalled() {
  set -x
  peer lifecycle chaincode queryinstalled >&log.txt
  res=$?
  set +x
  cat log.txt
  verifyResult $res "Query installed on \${CORE_PEER_ADDRESS} has failed"
  if [ $CC_LANG = "external" ]
  then
    CHAINCODE_ID=\`cat log.txt | tail -n 1 | cut -d',' -f1 | cut -d' ' -f3\`
    sed -i 's/^\\(CHAINCODE_ID=\\s*\\).*$/\\1'$CHAINCODE_ID'/' "$CC_ROOT_PATH/$CC_ENV_PATH"
    echo "$CHAINCODE_ID" >& "package_\${CC_NAME}_\${VERSION}.txt"
  else
    PACKAGE_ID=$(sed -n "/\${CC_NAME}_\${VERSION}/{s/^Package ID: //; s/, Label:.*$//; p;}" log.txt)
    echo "$PACKAGE_ID"
    echo "$PACKAGE_ID" >&"package_\${CC_NAME}_\${VERSION}.txt"
  fi
  cat "package_\${CC_NAME}_\${VERSION}.txt"
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
`;

    /* approve.sh contents */
    approve = `
#!/bin/bash

echo "$CC_NAME"

PACKAGE_ID=$(</opt/gopath/src/github.com/hyperledger/fabric/peer/"package_\${CC_NAME}_\${VERSION}".txt)

echo "$PACKAGE_ID"
echo "$SEQUENCE"

verifyResult() {
  if [ $1 -ne 0 ]; then
    echo "!!!!!!!!!!!!!!! "$2" !!!!!!!!!!!!!!!!"
    echo
    exit 1
  fi
}

approve() {
  if [[ -z "\${ENDORSEMENT}" ]]; then
    peer lifecycle chaincode approveformyorg -o $CORE_ORDERER_ID --channelID $CHANNEL_NAME --name $CC_NAME --version $VERSION --package-id $PACKAGE_ID --sequence $SEQUENCE --tls --cafile $CORE_ORDERER_TLS_ROOTCERT >&log.txt
  else
    echo "______________________Updating endorsement policy___________________"
    peer lifecycle chaincode approveformyorg -o $CORE_ORDERER_ID --channelID $CHANNEL_NAME --name $CC_NAME --version $VERSION --package-id $PACKAGE_ID --sequence $SEQUENCE --tls --cafile $CORE_ORDERER_TLS_ROOTCERT --signature-policy "\${ENDORSEMENT}" >&log.txt
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
      if [[ -z "\${ENDORSEMENT}" ]]; then
          peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name $CC_NAME --version $VERSION --sequence $SEQUENCE --tls --cafile \${CORE_ORDERER_TLS_ROOTCERT} --output json >&log.txt
      else
          peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name $CC_NAME --version $VERSION --sequence $SEQUENCE --tls --cafile \${CORE_ORDERER_TLS_ROOTCERT} --signature-policy "\${ENDORSEMENT}" --output json >&log.txt
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
`;

    /* commit.sh contents */
    commit = `
#!/bin/bash

DELAY=3
PEER_TARGETS=""

# another container before giving up
MAX_RETRY=3

queryCommitted() {
  EXPECTED_RESULT="Version: \${VERSION}, Sequence: \${SEQUENCE}, Endorsement Plugin: escc, Validation Plugin: vscc"
  echo "===================== Querying chaincode definition on $CORE_PEER_ADDRESS on channel '$CHANNEL_NAME'... ===================== "
	local rc=1
	local COUNTER=1
	while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
    sleep $DELAY
    echo "Attempting to Query committed status on $CORE_PEER_ADDRESS, Retry after $DELAY seconds."
    set -x
    peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CC_NAME >&log.txt
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
    echo "===================== Chaincode has not been commited to this channel yet  ====================="
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
    PEER_TARGETS="$2"
    local rc=1
    local COUNTER=1
    # continue to poll
    # we either get a successful response, or reach MAX RETRY
    while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
      sleep $DELAY
      echo "Attempting to check the commit readiness of the chaincode definition on $CORE_PEER_ADDRESS, Retry after $DELAY seconds."
      set -x
      if [[ -z "\${ENDORSEMENT}" ]]; then
        peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name $CC_NAME --version $VERSION --sequence $SEQUENCE --tls --cafile \${CORE_ORDERER_TLS_ROOTCERT} --output json >&log.txt
      else
        peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name $CC_NAME --version $VERSION --sequence $SEQUENCE --tls --cafile \${CORE_ORDERER_TLS_ROOTCERT} --signature-policy "\${ENDORSEMENT}" --output json >&log.txt
      fi
      res=$?
      set +x
      let rc=0
      IFS=';' read -ra allvars <<< $(echo $1)
      for var in "\${allvars[@]}"
      do
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
  set -x
  if [[ -z "\${ENDORSEMENT}" ]]; then
      peer lifecycle chaincode commit -o $CORE_ORDERER_ID --tls --cafile \${CORE_ORDERER_TLS_ROOTCERT} --channelID mychannel --name $CC_NAME --version $VERSION --sequence $SEQUENCE \${PEER_TARGETS} >&log.txt
  else
      peer lifecycle chaincode commit -o $CORE_ORDERER_ID --tls --cafile \${CORE_ORDERER_TLS_ROOTCERT} --channelID mychannel --name $CC_NAME --version $VERSION --sequence $SEQUENCE --signature-policy "\${ENDORSEMENT}" \${PEER_TARGETS} >&log.txt
  fi
  res=$?
  set +x
  cat log.txt
  verifyResult $res "Chaincode definition commit failed on channel mychannel failed"
  echo "===================== Chaincode definition committed on channel mychannel ===================== "
  echo "==============================================================================="
  echo "===================== Chaincode deployed successfully !!! ===================== "
  echo "==============================================================================="
}

verifyResult() {
  if [ $1 -ne 0 ]; then
    echo "!!!!!!!!!!!!!!! "$2" !!!!!!!!!!!!!!!!"
    echo
    exit 1
  fi
}

queryCommitted
checkCommitReadiness "$1" "$2"
commit
`;

    /* queryCommitted.sh contents */
    queryCommitted = `
#!/bin/bash
queryCommitted() {
    peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CC_NAME >&query.txt
    VALUE=$(cat query.txt | grep -o 'Sequence: [0-9]')
    echo "$VALUE"
}
queryCommitted
`;

  /**
   * Constructor
   * @param filename
   * @param options
   */
  constructor(private filepath: string) {}

  /**
   * Save the template file
   * @return true if successful, false otherwise
   */
  async generate(): Promise<Boolean> {
    try {
      SysWrapper.createScript(join(this.filepath, "install.sh"), this.install);
      SysWrapper.createScript(join(this.filepath, "approve.sh"), this.approve);
      SysWrapper.createScript(join(this.filepath, "commit.sh"), this.commit);
      SysWrapper.createScript(join(this.filepath, "queryCommitted.sh"), this.queryCommitted);
      return true;
    } catch(err) {
      e(err);
      return false;
    }
  }
}

