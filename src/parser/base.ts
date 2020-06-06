import { safeLoad } from 'js-yaml';
import { SysWrapper } from '../utils/sysWrapper';
import { l } from '../utils/logs';

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export abstract class BaseParser {
  constructor(public fileNamePath: string) {}

  async parseRaw() {
    const content = await SysWrapper.getFile(this.fileNamePath);
    return safeLoad(content);
  }
}
