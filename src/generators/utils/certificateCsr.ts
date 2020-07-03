import { Network } from '../../models/network';
import { Utils } from '../../utils/utils';
import getHlfBinariesPath = Utils.getHlfBinariesPath;
import { SysWrapper } from '../../utils/sysWrapper';
import { e } from '../../utils/logs';
import { Peer } from '../../models/peer';
import execContent = SysWrapper.execContent;
import { ClientHelper } from '../../core/hlf/helpers';
import { Orderer } from '../../models/orderer';
import { CSR } from '../../utils/data-type';

/**
 * Helper class to generate CSR files (to be used with the enrolling procedure)
 *
 * @author wassim.znaidi@gmail.com
 */
export class CertificateCsr {

  /**
   * Constructor
   * @param network
   */
  constructor(private network?: Network) { }

  /**
   * Generate the CSR file in order to use while enrolling
   * It's better to migrate the use of CLI to the use of the crypto-suite instance:
   * https://stackoverflow.com/questions/55687562/setting-pem-attributes-for-user-identities-in-hyperledger-fabric
   *
   * @param entity
   */
  async generateCsrHost(entity: object): Promise<CSR> {
    const san: string = entity instanceof Peer ?
      `${(entity as Peer).name}.${this.network.organizations[0].fullName}` :
      this.network.ordererOrganization.ordererFullName((entity as Orderer));

    const csrFolder = entity instanceof Peer ? this._getOrgCsrFolder() : this._getOrdCsrFolder();

    const scriptContent = `
export PATH=${getHlfBinariesPath(this.network.options.networkConfigPath, this.network.options.hyperledgerVersion)}:${this.network.options.networkConfigPath}:$PATH
export FABRIC_CFG_PATH=${this.network.options.networkConfigPath}  

set -x

fabric-ca-client gencsr \
  --csr.cn ${san} \
  --csr.hosts ${san},localhost \
  -M ${csrFolder} \
  -H ${csrFolder}

set +x
  `;

    try {
      await execContent(scriptContent);
      const csr = await ClientHelper.readSingleFileInDir(`${csrFolder}/signcerts`);
      const key = await ClientHelper.readSingleFileInDir(`${csrFolder}/keystore`);

      if(csr && key) {
        await SysWrapper.removePath(csrFolder);
      }

      return { csr, key };
    } catch (err) {
      e(err);
      throw err;
    }
  }

  /**
   * Return the default csr folder
   * @private
   */
  private _getOrgCsrFolder(): string {
    return `${this.network.options.networkConfigPath}/csr/${this.network.organizations[0].fullName}`;
  }

  /**
   * Return the default csr folder
   * @private
   */
  private _getOrdCsrFolder(): string {
    return `${this.network.options.networkConfigPath}/csr/${this.network.ordererOrganization.fullName}`;
  }
}
