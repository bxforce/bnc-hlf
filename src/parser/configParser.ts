// TODO move to js-yaml
import YAML from 'yaml';
import * as fs from 'fs-extra';
import { SysWrapper } from '../utils/sysWrapper';
import { l } from '../utils/logs';

export class ConfigParser {
  constructor(public fullFilePath: string) {}

  parse() {
    l('Starting Parsing configuration file');

    const file = fs.readFileSync(this.fullFilePath, 'utf8');
    const content = YAML.parse(file);

    // const configContent = await SysWrapper.getFile(this.fullFilePath);

    // try {
    //   const parsedYaml = YAML.parse(configContent);
    // } catch (ex) {
    //   throw ex;
    // }

    l('Finish Parsing configuration file');
  }
}
