import { BaseGenerator } from '../base';
import { DockerComposeYamlOptions } from '../../utils/data-type';

export class CreateCertsShGenerator extends BaseGenerator {
  contents = `
  # Setting environment Variables #
export ORG_DIR=$PWD/crypto-config/peerOrganizations/${this.options.org.fullName}
export PEER_DIR=$ORG_DIR/peers/${this.options.org.firstPeerFullName}
export REGISTRAR_DIR=$ORG_DIR/users/admin
export ADMIN_DIR=$ORG_DIR/users/Admin@${this.options.org.fullName}


echo "[Step 1] Enroling client and registering peer and user identitities"

export FABRIC_CA_CLIENT_HOME=$REGISTRAR_DIR

# Enroll client to interact
fabric-ca-client enroll --csr.names C=ES,ST=Madrid,L=Madrid,O=${this.options.org.fullName} -m admin -u http://admin:adminpw@0.0.0.0:8054 

sleep 10

# Register admin identity and peer
fabric-ca-client register --id.name Admin@${this.options.org.fullName} --id.secret mysecret --id.type client --id.affiliation ${this.options.org.name} -u http://0.0.0.0:8054 
fabric-ca-client register --id.name ${this.options.org.firstPeerFullName} --id.secret mysecret --id.type peer --id.affiliation ${this.options.org.name} -u http://0.0.0.0:8054 

sleep 3

export FABRIC_CA_CLIENT_HOME=$ADMIN_DIR
# Get certificates from ICA

fabric-ca-client enroll --csr.names C=ES,ST=Madrid,L=Madrid,O=${this.options.org.fullName} -m Admin@${this.options.org.fullName} -u http://Admin@${this.options.org.fullName}:mysecret@0.0.0.0:8054 
mkdir -p $ADMIN_DIR/msp/admincerts && cp $ADMIN_DIR/msp/signcerts/*.pem $ADMIN_DIR/msp/admincerts/

echo "[Step 2] Completed"
echo "[Step 3] Creating peer certs"

export FABRIC_CA_CLIENT_HOME=$PEER_DIR
fabric-ca-client enroll --csr.names C=ES,ST=Madrid,L=Madrid,O=${this.options.org.fullName} -m ${this.options.org.firstPeerFullName} -u http://Admin@${this.options.org.fullName}:mysecret@0.0.0.0:8054 
mkdir -p $PEER_DIR/msp/admincerts && cp $ADMIN_DIR/msp/signcerts/*.pem $PEER_DIR/msp/admincerts/
sleep 2
echo "[Step 3] Completed"
echo "[Step 4] Creating MSP for Organization 1"
# Generating scaffolding

mkdir -p $ORG_DIR/msp/admincerts $ORG_DIR/msp/intermediatecerts $ORG_DIR/msp/cacerts
cp $ADMIN_DIR/msp/signcerts/*.pem $ORG_DIR/msp/admincerts/
cp $PEER_DIR/msp/cacerts/*.pem $ORG_DIR/msp/cacerts/
cp $PEER_DIR/msp/intermediatecerts/*.pem $ORG_DIR/msp/intermediatecerts/
sleep 3
echo "[Step 4] Completed"
echo "[Step 5] Creating Scaffolfding"

cp -r $PWD/certsICA/* $ORG_DIR/ca
echo "[Step 5] Completed"
`;

  constructor(filename: string, path: string, private options: DockerComposeYamlOptions) {
    super(filename, path);
  }
}
