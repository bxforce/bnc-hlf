
export BNC_CONFIG_PATH=$PWD/../test/

mkdir ../test/
cp tests/demo/config.yaml ../test/config.yaml
vi test.yaml
  root_path_chaincode: "/tmp/hyperledger-fabric-network"
  path_chaincode: ""
  lang_chaincode: "external"
  env_chaincode: "chaincode/chaincode.env"
  chaincode: "fabcar"

---

mkdir -p /tmp/hyperledger-fabric-network/chaincode; echo -e "CHAINCODE_SERVER_ADDRESS=fabcar.org1.bnc.com:9999\nCHAINCODE_ID=..." > /tmp/hyperledger-fabric-network/chaincode/chaincode.env

./bin/bnc generate -g /bnc/config/config.yaml; ./bin/bnc start; ./bin/bnc channel deploy

./bin/bnc chaincode install
./bin/bnc chaincode approve
./bin/bnc chaincode commit

---

docker build -t fabcar ./chaincode

docker run -d --name fabcar.org1.bnc.com --env-file /tmp/hyperledger-fabric-network/chaincode/chaincode.env --network=bnc_network fabcar

docker exec -it cli.org1.bnc.com /bin/bash

peer chaincode invoke -o orderer0.bnc.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/org1.bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem -C mychannel -n fabcar --peerAddresses peer0.org1.bnc.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls/ca.crt -c '{"Args":["InitLedger"]}' --waitForEvent

peer chaincode invoke -o orderer0.bnc.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/org1.bnc.com/orderers/orderer0.bnc.com/msp/tlscacerts/tlsca.bnc.com-cert.pem -C mychannel -n fabcar --peerAddresses peer0.org1.bnc.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.bnc.com/peers/peer0.org1.bnc.com/tls/ca.crt -c '{"Args":["queryAllCars"]}' --waitForEvent

