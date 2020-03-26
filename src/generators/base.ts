import { join } from 'path';
import { SysWrapper } from '../utils/sysWrapper';

export abstract class BaseGenerator {
  /** file contents */
  contents: string;

  /** Breadcrumb */
  success: string;

  /**
   * the Base generator constructor
   * @param filename - name of file
   * @param path - absolute path when the file should be stored
   */
  protected constructor(public filename: string, public path: string) {}

  /**
   * return the concatenation of the path & filename
   */
  get filePath(): string {
    return join(this.path, this.filename);
  }

  /**
   * execute file if it's a shell/bash script
   *
   * @remark the file should be saved before running this function
   */
  run() {
    return SysWrapper.execContent(this.contents);
  }

  /**
   * check if the file exists
   */
  check() {
    return SysWrapper.existsPath(this.success);
  }

  /**
   * Store the file on the path location
   */
  save() {
    return SysWrapper.createFile(this.filePath, this.contents);
  }
}
