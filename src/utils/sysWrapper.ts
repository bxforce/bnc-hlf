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
import {l} from './logs';

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export module SysWrapper {

  /** Create a file to specific path from contents.
   * @returns Promise<void>
   */
  export function createFile(filePath: string, contents: string): Promise<void> {
    return new Promise((fulfilled, rejected) => {
      try {
        write(filePath, contents, fulfilled);
      } catch (ex) {
        rejected(ex);
      }
    });
  }

  export function copyFolderRecursively(src: string, dest: string): Promise<void>  {
    return new Promise((fulfilled, rejected) => {
      try {
        fs.copySync(src, dest)
        console.log('success!')
        fulfilled()
      } catch (err) {
        console.error(err)
        rejected(err)
      }

    });
  }

  /**
   * Remove based on a path.
   */
  export function removePath(filePath: string): Promise<void> {
    return remove(filePath);
  }

  /**
   * Get a file from a path.
   */
  export function getFile(filePath: string, content?: any): Promise<string> {
    return new Promise(async (fulfilled, rejected) => {
      if (content) {
        fulfilled(await renderTemplateFromFile(filePath, content));
      } else {
        const store = memFs.create();
        const editor = memFsEditor.create(store);
        try {
          let file = editor.read(filePath);
          if (!file) {
            rejected('Empty or not found file.');
          }
          fulfilled(file);
        } catch (ex) {
          rejected(ex);
        }
      }
    });
  }
  
  export async function execContent(content: any): Promise<void> {
    if (exec(content,
      {silent: false, shell: '/bin/bash'}).code !== 0) {
      l('Found error while running script!');
      throw new Error('Errors found in script, stopping execution');
    }
  }

  /** Copies a file
   * @returns Promise<void>
   */
  export function copyFile(from: string, to: string): Promise<void> {
    return new Promise((fulfilled, rejected) => {
      const store = memFs.create();
      const editor = memFsEditor.create(store);
      editor.copy(from, to);
      editor.commit([], fulfilled);
    });
  }

  /** Check if a file exists.
   * @returns Promise<boolean>
   */
  export function existsPath(filePath: string): Promise<boolean> {
    return new Promise((fulfilled, rejected) => {
      const store = memFs.create();
      const editor = memFsEditor.create(store);
      fulfilled(editor.exists(filePath));
    });
  }

  /**
   * Check if a folder exists
   * @param folderPath
   * @returns Promise<boolean>
   */
  export function existsFolder(folderPath: string): Promise<boolean> {
    return new Promise((fulfilled, rejected) => {
      return fulfilled(fs.existsSync(folderPath));
    });
  }
/** Create a folder.
   * @return Promise<void>
   **/
  export function createFolder(folder: string) {
    return fs.ensureDir(folder);
  }

  /**
   * Render a new string from a disk file and contents.
   **/
  export function renderTemplateFromFile(filePath: string, content: any): Promise<string> {
    return new Promise(async (fulfilled, rejected) => {
      const store = memFs.create();
      const editor = memFsEditor.create(store);
      let file = editor.read(filePath);
      if (!file) {
        return rejected(Error(`${filePath} does not exist.`));
      }
      fulfilled(await renderTemplateFromContent(file, content));
    });
  }

  /**
   * Render a new string from a string template and contents.
   **/
  export function renderTemplateFromContent(templateContent: string, content: any): Promise<string> {
    return new Promise((fulfilled, rejected) => {
      let renderedFile = ejs.render(templateContent, content);
      fulfilled(renderedFile);
    });
  }

  function remove(filePath: string): Promise<void> {
    return fs.remove(filePath);
  }

  function write(filePath: string, contents: string, cb: any) {
    const store = memFs.create();
    const editor = memFsEditor.create(store);
    editor.write(filePath,
      contents);
    editor.commit([], cb);
  }

  export function readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }
  
  export function enumFilesInFolder(folder: string): Promise<string[]> {
    return new Promise((fulfilled, rejected) => {
      fs.readdir(folder, (err, files) => {
        fulfilled(files);
      });
    });
  }

  export function getJSON(filePath: string): Promise<any> {
    return new Promise((fulfilled, rejected) => {
      try {
        const store = memFs.create();
        const editor = memFsEditor.create(store);
        fulfilled(editor.readJSON(filePath));
      } catch (ex) {
        rejected(ex);
      }
    });
  }

  /**
   * Renders to disk a file from a template
   * @param filePath Destination path
   * @param contents Contents in JSON format
   * @param templatePath Location of the template
   
  export function createFileFromTemplate(filePath: string, contents: any, templatePath: string): Promise<void | {}> {
    return renderTemplateFromFile(templatePath, contents).then((compiledContents: string) => {
      return new Promise((fulfilled, rejected) => {
        try {
          write(filePath, compiledContents, fulfilled);
        } catch (ex) {
          rejected(ex);
        }
      });
    });
  }

  export function createFileRaw(filePath: string, contents: Buffer): Promise<void> {
    return new Promise((fulfilled, rejected) => {
      try {
        writeBuffer(filePath, contents, fulfilled);
      } catch (ex) {
        rejected(ex);
      }
    });
  }
  
  export async function execFile(filePath: string, content?: any): Promise<void> {
    if (content) {
      let renderedFileContent = await renderTemplateFromFile(filePath, content);

      return exec(
        renderedFileContent,
        {silent: false}
      );
    } else {
      let simpleFileContent = await getFile(filePath);

      if (exec(simpleFileContent,
        {silent: false, shell: '/bin/bash'}).code !== 0) {
        l('Found error while running script!');
        throw new Error('Errors found in script, stopping execution');
      }
    }
  }
 
  export const dockerComposeStart = template => {
    return exec(`docker-compose -f ${template} up -d`, { silent: true });
  };
  export const dockerComposeStop = template => {
    return exec(`docker-compose -f ${template} down`, { silent: true });
  };
  // TODO improvement -- use [execa](https://www.npmjs.com/package/execa)

  export function getFileRaw(filePath: string): Promise<Buffer> {
    return new Promise(async function (fulfilled, rejected) {
      try {
        const store = memFs.create();
        const editor = memFsEditor.create(store);
        let file = editor.read(filePath, {raw: false});
        if (!file) {
          rejected('Empty or not found file.');
        }
        fulfilled(file);
      } catch (ex) {
        rejected(ex);
      }
    });
  }

  export function createJSON(filePath: string, contents: any): Promise<void> {
    return new Promise((fulfilled, rejected) => {
      const store = memFs.create();
      const editor = memFsEditor.create(store);
      editor.writeJSON(filePath, contents);
      editor.commit([], fulfilled);
    });
  }

  function writeBuffer(filePath: string, contents: Buffer, cb: any) {
    const store = memFs.create();
    const editor = memFsEditor.create(store);

    editor.write(filePath,
      contents);
    editor.commit([], cb);
  }
  
  */
}
