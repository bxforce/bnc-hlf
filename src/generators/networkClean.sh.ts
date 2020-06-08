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

import { BaseGenerator } from './base';
import { join } from 'path';

export class NetworkCleanShOptions {
  removeImages: boolean;
}

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export class NetworkCleanShGenerator extends BaseGenerator {
  success = join(this.path, 'networkclean.sh.successful');
  contents = `#!/bin/bash
set -e
#clean
docker stop $(docker ps -a | awk '$2~/hyperledger/ {print $1}') 
docker rm -f $(docker ps -a | awk '$2~/hyperledger/ {print $1}') $(docker ps -a | awk '{ print $1,$2 }' | grep dev-peer | awk '{print $1 }') || true
${this.options.removeImages ? `docker rmi -f $(docker images | grep dev-peer | awk '{print $3}') || true` : ``}
`;

  constructor(filename: string, path: string, private options: NetworkCleanShOptions) {
    super(filename, path);
  }
}
