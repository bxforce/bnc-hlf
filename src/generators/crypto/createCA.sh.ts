import { BaseGenerator } from '../base';
import { DockerComposeYamlOptions } from '../../utils/data-type';

export class CreateCAShGenerator extends BaseGenerator {
  contents = `
export REGISTRAR_DIR=$PWD
export FABRIC_CA_CLIENT_HOME=$REGISTRAR_DIR

export ORG_DIR=$PWD/crypto-config/peerOrganizations/${this.options.org.fullName}
export PEER_TLS=$PWD/peertls
export PEER_DIR=$ORG_DIR/peers/${this.options.org.firstPeerFullName}
export REGISTRAR_DIR=$ORG_DIR/users/admin
export ADMIN_DIR=$ORG_DIR/users/Admin@${this.options.org.fullName}
export TLS=$ORG_DIR/tlsca
mkdir -p $ORG_DIR/ca $ORG_DIR/msp $PEER_DIR $REGISTRAR_DIR $ADMIN_DIR $TLS
mkdir certsICA

fabric-ca-client enroll -m admin -u http://adminCA:adminpw@ca.root:7054 


fabric-ca-client register --id.name ca.interm.${this.options.org.fullName} --id.type client \\
 --id.secret adminpw --csr.names C=ES,ST=Madrid,L=Madrid,O=${this.options.org.fullName} \\
 --csr.cn ica.dummyOrg -m ca.interm.${this.options.org.fullName} --id.attrs  '"hf.IntermediateCA=true"' -u http://ca.root:7054 


docker-compose -f docker-compose-ca.yaml up -d ca.interm.${this.options.org.fullName}

cp -r $PWD/certsICA/* $ORG_DIR/ca
`;

  constructor(filename: string, path: string, private options: DockerComposeYamlOptions) {
    super(filename, path);
  }
}
