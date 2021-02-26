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
import { SysWrapper } from '../../utils/sysWrapper';
import { e, l } from '../../utils/logs';

/**
 * Class Responsible to generate builders scripts to manage external chaincode
 *
 */
export class BuildersScriptsGenerator {
    /* build.sh contents */
    build = `#!/bin/sh

set -euo pipefail

SOURCE=$1
OUTPUT=$3

if [ ! -f "$SOURCE/connection.json" ]; then
    >&2 echo "$SOURCE/connection.json not found"
    exit 1
fi

cp $SOURCE/connection.json $OUTPUT/connection.json

if [ -d "$SOURCE/metadata" ]; then
    cp -a $SOURCE/metadata $OUTPUT/metadata
fi

exit 0`;

    /* detect.sh contents */
    detect = `#!/bin/sh

set -euo pipefail

METADIR=$2
if [ "$(cat $METADIR/metadata.json | grep -o '\\"type\\":[^\\"]*\\"[^\\"]*\\"' | sed -E 's/\\".*\\".*\\"(.*)\\"/\\1/')" == "external" ]; then
    exit 0
fi

exit 1`;

    /* release.sh contents */
    release = `#!/bin/sh

set -euo pipefail

BLD="$1"
RELEASE="$2"

if [ -d "$BLD/metadata" ]; then
   cp -a "$BLD/metadata/"* "$RELEASE/"
fi

if [ -f $BLD/connection.json ]; then
   mkdir -p "$RELEASE"/chaincode/server
   cp $BLD/connection.json "$RELEASE"/chaincode/server

   #if tls_required is true, copy TLS files (using above example, the fully qualified path for these fils would be "$RELEASE"/chaincode/server/tls)

   exit 0
fi

exit 1`;

  /**
   * Constructor
   * @param filename
   * @param options
   */
  constructor(private filepath: string) {}

  /**
   * Save the template file
   * @return true if successful, false otherwise
   */
  async generate(): Promise<Boolean> {
    try {
      SysWrapper.createScript(join(this.filepath, "external/bin/build"), this.build);
      SysWrapper.createScript(join(this.filepath, "external/bin/detect"), this.detect);
      SysWrapper.createScript(join(this.filepath, "external/bin/release"), this.release);
      return true;
    } catch(err) {
      e(err);
      return false;
    }
  }
}

