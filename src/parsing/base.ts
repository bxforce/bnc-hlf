import { join } from 'path';
import {SysWrapper} from '../utils/sysWrapper';

export abstract class BaseParser {
  content: string;

  constructor(public filename: string, public path:string) {
  }

  get filePath(): string {
    return join(this.path, this.filename);
  }
}