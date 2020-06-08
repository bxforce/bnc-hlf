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

export class CaOptions {
  engineName?: string;
  number?: number;
  ports?: '7054';
  host?: string;
  user?: 'admin';
  password?: 'adminpw';
  isSecure?: false;
}

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export class Ca {
  constructor(public name: string, public options: CaOptions) {}
}
