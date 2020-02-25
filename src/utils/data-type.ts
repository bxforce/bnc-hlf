import { Organization } from '../models/organization';

export class DockerComposeYamlOptions {
  networkRootPath: string;
  composeNetwork: string;
  org: Organization;
  envVars?: {
    FABRIC_VERSION: string;
    THIRDPARTY_VERSION: string;
  };
}
