import { Gateway } from 'fabric-network';
import * as FabricCAServices from 'fabric-ca-client';
export class Gateways{
  gateway: any;

  constructor() {
    this.gateway = new Gateway();
  }

  connect(ccpPath, typeUser, wallet){
     this.gateway.connect(ccpPath, { wallet , identity: typeUser, discovery: { enabled: true, asLocalhost: true } });
  }

  getGatewayClient(){
    return this.gateway.getClient();
  }

}