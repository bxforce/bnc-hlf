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
import removePath = SysWrapper.removePath;
import { readFile } from 'fs-extra';


enum TMPFILENAMES {
    initialPB = "config.pb",
    initialJSON = "config.json",
    modifiedJSON = "modified.json",
    modifiedPB = "modified.pb",
    deltaJSON = "delta.json",
    deltaPB = "delta.pb",
    finalPB = "config_update_as_envelope_pb.pb",
    genesisJSON = "genesis.json",
    genesisPB = "genesis.block"
}

enum PROTOBUFTYPE {
    config = "common.Config",
    update = "common.ConfigUpdate",
    envelope = "common.Envelope",
    block = "common.Block"
}

enum CONVERTTYPE {
    encode = "proto_encode",
    decode = "proto_decode"
}

export class Configtxlator {
    
    public tempPath = "/tmp";
    public hlfBinaries;
    public networkConfPath;
    public names =  TMPFILENAMES;
    public protobufType = PROTOBUFTYPE;
    public convertType = CONVERTTYPE;

    constructor(hlfBinaries, networkConfPath) {
        this.hlfBinaries= hlfBinaries;
        this.networkConfPath = networkConfPath;

    }
    
    async convert(from, to, type, convert_type){
        let cmd = `configtxlator ${convert_type} --input ${this.tempPath}/${from} --type ${type}   > ${this.tempPath}/${to}  `
        try{
            await this.executeCMD(cmd);
            
        }catch(err){
            e('error converting')
            return err
        }
    }
    
    async executeCMD(cmd){
        l('Starting conversion')
        const scriptContent = `
export PATH=${this.hlfBinaries}:${this.networkConfPath}:$PATH
export FABRIC_CFG_PATH=${this.networkConfPath}  

which configtxlator
if [ "$?" -ne 0 ]; then
  echo "configtxlator tool not found. exiting"
  exit 1
fi

set -x
${cmd}
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

    async createBlockPb(block){
        let data = block.toBuffer();
        await createFile(`${this.tempPath}/${TMPFILENAMES.initialPB}`, data);
    }

    async createInitialGENESISPB(block){

        //save this file in tmp to be used later to convert it to JSON
        // save config.json under /tmp
        await createFile(`${this.tempPath}/${TMPFILENAMES.genesisPB}`, block);
    }

    async clean() {
        try{
            await removePath(`${this.tempPath}/${TMPFILENAMES.initialPB}`)
            await removePath(`${this.tempPath}/${TMPFILENAMES.initialJSON}`)
            await removePath(`${this.tempPath}/${TMPFILENAMES.modifiedJSON}`)
            await removePath(`${this.tempPath}/${TMPFILENAMES.modifiedPB}`)
            await removePath(`${this.tempPath}/${TMPFILENAMES.deltaJSON}`)
            await removePath(`${this.tempPath}/${TMPFILENAMES.deltaPB}`)
            await removePath(`${this.tempPath}/${TMPFILENAMES.genesisPB}`)
            await removePath(`${this.tempPath}/${TMPFILENAMES.genesisJSON}`)
        }catch(err){
            e('error removing tmp files')
           return err
        }

    }

    
}
