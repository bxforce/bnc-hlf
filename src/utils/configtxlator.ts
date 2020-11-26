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

import * as ejs from 'ejs';
import * as fs from 'fs-extra';
import {exec} from 'shelljs';
import memFs = require('mem-fs');
import memFsEditor = require('mem-fs-editor');
import {l, e} from './logs';
import { SysWrapper } from './sysWrapper';
import createFile = SysWrapper.createFile;
import execContent = SysWrapper.execContent;
import copyFile = SysWrapper.copyFile;
import { readFile } from 'fs-extra';


enum TMPFILENAMES {
    initialPB = "config.pb",
    initialJSON = "config.json",
    modifiedJSON = "modified.json",
    modifiedPB = "modified.pb",
    deltaJSON = "delta.json",
    deltaPB = "delta.pb",
    finalPB = "config_update_as_envelope_pb.pb"
}

export class Configtxlator {
    
    public tempPath = "/tmp";
    public hlfBinaries;
    public networkConfPath;
    public names =  TMPFILENAMES;



    constructor(hlfBinaries, networkConfPath) {
        this.hlfBinaries= hlfBinaries;
        this.networkConfPath = networkConfPath;

    }

    async fromBinaryToJson(from, to, type) {
        l('Starting conversion from binary to JSON')
        const scriptContent = `
export PATH=${this.hlfBinaries}:${this.networkConfPath}:$PATH
export FABRIC_CFG_PATH=${this.networkConfPath}  

which configtxlator
if [ "$?" -ne 0 ]; then
  echo "configtxlator tool not found. exiting"
  exit 1
fi

set -x
configtxlator proto_decode --input ${this.tempPath}/${from} --type ${type}   > ${this.tempPath}/${to}  
res=$?
echo res
set +x
if [ $res -ne 0 ]; then
  echo "Failed to generate json config..."
  exit 1
fi

    `;

        try {
            await execContent(scriptContent);
            return true;
        } catch (err) {
            e(err);
            return false;
        }
    }

    async calculateDeltaPB(original, modified,to, nameChannel){

        l('Starting DELTA computation')
        const scriptContent = `
export PATH=${this.hlfBinaries}:${this.networkConfPath}:$PATH
export FABRIC_CFG_PATH=${this.networkConfPath}  

which configtxlator
if [ "$?" -ne 0 ]; then
  echo "configtxlator tool not found. exiting"
  exit 1
fi

set -x
configtxlator compute_update  --channel_id ${nameChannel} --original ${this.tempPath}/${original} --updated ${this.tempPath}/${modified}   > ${this.tempPath}/${to}  
res=$?
echo res
set +x
if [ $res -ne 0 ]; then
  echo "Failed to generate json config..."
  exit 1
fi

    `;

        try {
            await execContent(scriptContent);
            return true;
        } catch (err) {
            e(err);
            return false;
        }
    }


    async fromJSONTOPB(from, to, type) { //TODO make proto_encode an argument and have one function for conversion
        l('Starting conversion from JSON to binary')
        const scriptContent = `
export PATH=${this.hlfBinaries}:${this.networkConfPath}:$PATH
export FABRIC_CFG_PATH=${this.networkConfPath}  

which configtxlator
if [ "$?" -ne 0 ]; then
  echo "configtxlator tool not found. exiting"
  exit 1
fi

set -x
configtxlator proto_encode --input ${this.tempPath}/${from} --type ${type}   > ${this.tempPath}/${to}  
res=$?
echo res
set +x
if [ $res -ne 0 ]; then
  echo "Failed to generate json config..."
  exit 1
fi

    `;

        try {
            await execContent(scriptContent);
            return true;
        } catch (err) {
            e(err);
            return false;
        }
    }

    async getFile(file){
        let myFile =  await readFile(`${this.tempPath}/${file}`, 'utf-8');
        return JSON.parse((myFile))
    }

    async saveFile(to, data) {
        await createFile(`${this.tempPath}/${to}`, data);
    }
    
    async copyFile (from, to) {
        await copyFile(`${this.tempPath}/${from}`,to);
    }

    async createInitialConfigPb(envelope){
        let data = envelope.config.toBuffer();
        //save this file in tmp to be used later to convert it to JSON
        // save config.json under /tmp
        await createFile(`${this.tempPath}/${TMPFILENAMES.initialPB}`, data);
    }

    
}
