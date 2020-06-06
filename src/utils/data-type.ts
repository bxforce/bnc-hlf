import { Organization } from '../models/organization';
import { Network } from '../models/network';

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export class DockerComposeYamlOptions {
  networkRootPath: string;
  composeNetwork: string;
  org: Organization;
  envVars?: {
    FABRIC_VERSION?: string;
    FABRIC_CA_VERSION?: string;
    THIRDPARTY_VERSION?: string;
  };
}
