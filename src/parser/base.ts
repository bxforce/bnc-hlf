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
