import { exec } from 'shelljs';
import { BaseGenerator } from '../base';
import { DockerComposeYamlOptions } from '../../utils/data-type';
import { d, e, l } from '../../utils/logs';
import { Utils } from '../../utils/utils';
import delay = Utils.delay;
import { DOCKER_CA_DELAY, DOCKER_DEFAULT } from '../../utils/constants';
import { DockerEngine } from '../../agents/docker-agent';
import { SysWrapper } from '../../utils/sysWrapper';
import execContent = SysWrapper.execContent;

export class CreateOrdererCertsGenerator extends BaseGenerator {
  /* Orderer compose file instance  */
  contents = `
version: '2'

networks:
  ${this.options.composeNetwork}:
    external: true

services:
  rca.orderers.${this.options.org.name}:
   container_name: rca.orderers.${this.options.org.name}
   image: hyperledger/fabric-ca
   command: /bin/bash -c 'fabric-ca-server start -d -b rca-${this.options.org.name}-admin:rca-${this.options.org.name}-adminpw --port 7053'
   environment:
      - FABRIC_CA_SERVER_HOME=/tmp/hyperledger/fabric-ca/crypto
      - FABRIC_CA_SERVER_CA_NAME=rca.orderers.${this.options.org.name}
      - FABRIC_CA_SERVER_TLS_ENABLED=true
      - FABRIC_CA_SERVER_CSR_CN=rca.orderers.tls
      - FABRIC_CA_SERVER_CSR_HOSTS=0.0.0.0
      - FABRIC_CA_SERVER_DEBUG=true
   ports:
      - 7053:7053
   volumes:
      - ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/orderers:/tmp/hyperledger/fabric-ca
   networks:
      - ${this.options.composeNetwork}  
  `;

  constructor(filename: string, path: string, private options?: DockerComposeYamlOptions, private readonly dockerEngine?: DockerEngine) {
    super(filename, path);
    if(!this.dockerEngine) {
      this.dockerEngine = new DockerEngine({ host: DOCKER_DEFAULT.IP as string, port: DOCKER_DEFAULT.PORT });
    }
  }

  /**
   * Start the Orderer CA docker container
   * Once started, change ownership from the default root user into the current users
   * @param execute flag to run the docker compose file
   */
  async startOrdererCa(execute = true): Promise<Boolean> {
    try {
      l('Starting Orderer CA container...');
      // store the docker compose file
      await this.save();

      // check if the container is already running
      const caIsRunning = await this.dockerEngine.doesContainerExist(`rca.orderers.${this.options.org.name}`);
      if (caIsRunning) {
        l('Orderer CA container is already running');
        return true;
      }

      // if not, start the container
      await this.dockerEngine.composeOne(`rca.orderers.${this.options.org.name}`, { cwd: this.path, config: this.filename });
      await delay(DOCKER_CA_DELAY);

      await this.changeOwnerShipWithPassword(`${this.options.networkRootPath}`);
      d('Orderer crypto folder - Change OwnerShip successfully');

      l('Orderer CA up and running');

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  /**
   * Generate and store the orderers certificates and crypto credentials
   */
  async buildOrdererCertificates(): Promise<Boolean> {
    const scriptContents = `
export PATH=${this.options.networkRootPath}/fabric-binaries/${this.options.envVars.FABRIC_VERSION}/bin:${this.options.networkRootPath}:$PATH
export FABRIC_CFG_PATH=${this.options.networkRootPath}  
    
export FABRIC_CA_CLIENT_HOME=${this.options.networkRootPath}/organizations/ordererOrganizations/${this.options.org.fullName}/
fabric-ca-client enroll -d \
  -u https://rca-${this.options.org.name}-admin:rca-${this.options.org.name}-adminpw@0.0.0.0:7053 \
  --caname rca.orderers.${this.options.org.name} \
  --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/orderers/crypto/tls-cert.pem
  
fabric-ca-client register -d \
  -u https://0.0.0.0:7053 \
  --caname rca.orderers.${this.options.org.name} \
  --id.name ${this.getOrdererAdminName()} \
  --id.secret ${this.getOrdererAdminName()}pw \
  --id.type admin \\
  --id.attrs "hf.Registrar.Roles=client,hf.Registrar.Attributes=*,hf.Revoker=true,hf.GenCRL=true,admin=true:ecert,abac.init=true:ecert" \\
  --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/orderers/crypto/tls-cert.pem

fabric-ca-client register -d \
  -u https://0.0.0.0:7053 \
  --caname rca.orderers.${this.options.org.name} \
  --id.name ${this.getOrdererName()} \
  --id.secret ${this.getOrdererName()}pw \
  --id.type orderer \
  --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/orderers/crypto/tls-cert.pem

fabric-ca-client enroll -d \
  -u https://${this.getOrdererName()}:${this.getOrdererName()}pw@0.0.0.0:7053 \
  --caname rca.orderers.${this.options.org.name} \
  -M ${this.options.networkRootPath}/organizations/ordererOrganizations/${this.options.org.fullName}/orderers/${this.getOrgOrdererNameDomain()}/msp \
  --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/orderers/crypto/tls-cert.pem


  
  

  
    `;

    try {
      await execContent(scriptContents);

      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

//   async buildOrdererCertificates(): Promise<Boolean> {
//     const scriptContents = `
// export PATH=${this.options.networkRootPath}/fabric-binaries/${this.options.envVars.FABRIC_VERSION}/bin:${this.options.networkRootPath}:$PATH
// export FABRIC_CFG_PATH=${this.options.networkRootPath}
//
// export FABRIC_CA_CLIENT_HOME=${this.options.networkRootPath}/organizations/ordererOrganizations/${this.options.org.fullName}/
// fabric-ca-client enroll -d \
//   -u https://rca-${this.options.org.name}-admin:rca-${this.options.org.name}-adminpw@0.0.0.0:7053 \
//   --caname rca.orderers.${this.options.org.name} \
//   --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/orderers/crypto/tls-cert.pem
//
// # fabric-ca-client register -d \
//   -u https://0.0.0.0:7053 \
//   --caname rca.orderers.${this.options.org.name} \
//   --id.name ${this.getOrdererName()} \
//   --id.secret ${this.getOrdererName()}pw \
//   --id.type orderer \
//   --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/orderers/crypto/tls-cert.pem
//
// # fabric-ca-client register -d \
//   -u https://0.0.0.0:7053 \
//   --caname rca.orderers.${this.options.org.name} \\
//   --id.name ${this.getOrdererAdminName()} \
//   --id.secret ${this.getOrdererAdminName()}pw \
//   --id.type admin \
//   --id.attrs "hf.Registrar.Roles=client,hf.Registrar.Attributes=*,hf.Revoker=true,hf.GenCRL=true,admin=true:ecert,abac.init=true:ecert" \
//   --tls.certfiles ${this.options.networkRootPath}/organizations/fabric-ca/${this.options.org.name}/orderers/crypto/tls-cert.pem
//
//     `;
//
//     try {
//       await execContent(scriptContents);
//
//       return true;
//     } catch (err) {
//       e(err);
//       return false;
//     }
//   }

  private changeOwnerShipWithPassword(folder: string, password = 'wassim'): Promise<Boolean> {
    const command = `echo '${password}' | sudo -kS chown -R $USER:$USER ${folder}`;

    return new Promise((resolved, rejected) => {
      exec(command, {silent: true}, function(code, stdout, stderr) {
        return code === 0 ? resolved() : rejected();
      });
    });
  }

  private getOrgOrdererNameDomain(): string {
    const orderer = this.options.org.orderers[0];
    return this.options.org.ordererName(orderer);
  }

  private getOrdererSimpleName(): string {
    return this.options.org.orderers[0].name;
  }

  private getOrdererName(): string {
    const orderer = this.options.org.orderers[0];
    return `${orderer.name}-${this.options.org.name}`;
  }

  private getOrdererAdminName(): string {
    const orderer = this.options.org.orderers[0];
    return `admin-${orderer.name}-${this.options.org.name}`;
  }
}
