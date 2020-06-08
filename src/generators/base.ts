/*
Copyright 2020 IRT SystemX

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { join } from 'path';
import { SysWrapper } from '../utils/sysWrapper';

/**
 *
 * @author wassim.znaidi@gmail.com
 */
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
