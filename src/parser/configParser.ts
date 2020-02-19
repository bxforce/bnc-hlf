import * as yaml from 'js-yaml';
import * as fs from 'fs-extra';
import { SysWrapper } from '../utils/sysWrapper';
import { l } from '../utils/logs';

export class ConfigParser {
  constructor(public fullFilePath: string) {}

  async parse() {
    l('Starting Parsing configuration file');

    // const file = fs.readFileSync(this.fullFilePath, 'utf8');
    // const content = yaml.safeLoad(file);

    const configContent = await SysWrapper.getFile(this.fullFilePath);
    const parsedYaml = yaml.safeLoad(configContent);

    const engines = parsedYaml['engines'];
    const chains = parsedYaml['chains'];
    const [folder, fabricV, orgs] = chains;

    const { template_folder } = folder;
    const { fabric: fabricVersion } = fabricV;
    const { organisations } = orgs;

    l('Finish Parsing configuration file');
  }
}
