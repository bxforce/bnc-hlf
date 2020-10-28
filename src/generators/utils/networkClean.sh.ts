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

import { BaseGenerator } from '../base';
import { join } from 'path';

export class NetworkCleanShOptions {
  removeImages: boolean;
  path: string;
}

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export class NetworkCleanShGenerator extends BaseGenerator {
  success = join(this.path, 'networkclean.sh.successful');
  contents = `#!/bin/bash
docker rm -f $(docker ps -aq -f label=bnc) 
docker rm -f $(docker ps -a | awk '{ print $1,$2 }' | grep dev-peer | awk '{print $1 }') $(docker ps -a | awk '{ print $1,$2 }' | grep couchdb | awk '{print $1 }')
docker rm -f cli.org1.bnc.com
docker volume prune -f
${this.options.removeImages ? `docker rmi -f $(docker images | grep dev-peer | awk '{print $3}') || true` : ``}
mv ${this.options.path}/fabric-binaries /tmp/; 
rm -rf ${this.options.path}/*; 
mv /tmp/fabric-binaries ${this.options.path}/;
`;

  // TODO: avoid docker volume prune...

  constructor(filename: string, path: string, private options: NetworkCleanShOptions) {
    super(filename, path);
  }
}
