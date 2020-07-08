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

import { Ca } from './ca';
import { Orderer } from './orderer';

export class OrdererOrganizationOptions {
  ca?: Ca;
  orderers?: Orderer[];
  domainName?: string;
  isSecure?: boolean;
}

/**
 *
 * @author wassim.znaidi@gmail.com
 */
export class OrdererOrganization {
  ca: Ca;
  orderers: Orderer[] = [];
  domainName: string;
  isSecure = false;

  constructor(public name: string, options?: OrdererOrganizationOptions) {
    if(options) {
      this.ca = options.ca ?? undefined;
      this.orderers = options.orderers ?? [];
      this.domainName = options.domainName ?? 'unknown';
      this.isSecure = options.isSecure ?? false;
    }
  }

  ordererFullName(orderer: Orderer): string {
    return `${orderer.name}.${this.domainName}`;
  }

  get caName(): string {
    return `${this.ca.name}.${this.name}`;
  }

  get caCn(): string {
    return `orderer.${this.domainName}`;
  }

  get mspName(): string {
    return `${this.name}MSP`;
  }

  get fullName(): string {
    return `${this.name}.${this.domainName}`;
  }

  get adminUser(): string {
    return `${this.name}Admin`;
  }

  get adminUserPass(): string {
    return `${this.name}Adminpw`;
  }

  get adminUserFull(): string {
    return `Admin@${this.domainName}`;
  }
}
