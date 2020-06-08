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

import * as FabricCAServices from 'fabric-ca-client';
import { IEnrollmentRequest, IEnrollResponse, IRegisterRequest, TLSOptions } from 'fabric-ca-client';
import { ClientConfig, ClientHelper } from './helpers';
import { d, e } from '../../utils/logs';

export type UserParams = IRegisterRequest;
export type AdminParams = IEnrollmentRequest;
export interface EnrollmentResponse {
  enrollment: IEnrollResponse;
  secret?: string;
}

/**
 * Class responsible to create user & admin accounts
 *
 * @author sahar.fehri@irt-systemx.fr
 * @author wassim.znaidi@gmail.com
 */
export class Membership extends ClientHelper {
  /* instance of the CA service*/
  public ca: FabricCAServices;

  // TODO should we create a singleton or not ??
  // No need if case of CLI (no meaning)

  /**
   * Constructor
   * @param config
   */
  constructor(public config: ClientConfig) {
    super(config);
  }

  /**
   * build and initialize the {@link FabricCAServices} instance
   * @param caName the name of the CA (provided in the deployment configuration file
   * @param isSecure boolean for the CA TLS connection
   */
  async initCaClient(caName?: string, isSecure = false) {
    await super.init();

    // set the CA instance
    // @ts-ignore
    const caInfo = this.clientConfig.networkProfile?.certificateAuthorities[caName ?? 0];
    const caUrl = caInfo.url;
    const caname = caInfo.caName;

    // read the ca pem certificate
    const caTlsCertPath = caInfo.tlsCACerts.path;
    const options = isSecure ? await this._getCATlsOptions(caTlsCertPath) : null;

    this.ca = new FabricCAServices(caUrl, options, caname);
  }

  /**
   * Enroll the admin account
   */
  async enrollCaAdmin(orgMspId?: string): Promise<IEnrollResponse> {
    try {
      // check if the admin exists & enrolled in the Wallet
      const adminIdentity = await this.wallet.getIdentity(this.clientConfig.admin.name);
      if (adminIdentity) {
        d(`An identity for the admin user (${this.clientConfig.admin.name}) already exists in the wallet`);
        return null;
        // TODO return enrollment response from existing data on wallet & ca container volumes (for ca root certificate)
      }

      // enroll the admin account
      const enrollment = await this.ca.enroll({
        enrollmentID: this.clientConfig.admin.name,
        enrollmentSecret: this.clientConfig.admin.secret
      });

      // get the client mspId
      const mspId = this.client.getMspid() ?? orgMspId;

      // import the identity into the wallet
      const { key, certificate } = enrollment;
      await this.wallet.addIdentity(this.clientConfig.admin.name, mspId, key, certificate);
      d(`Successfully enrolled admin user "${this.clientConfig.admin.name} and imported it into the wallet`);

      return enrollment;
    } catch (err) {
      e(`Failed to enroll admin user "admin": ${err}`);
      return null;
    }
  }

  /**
   *
   * @param request
   * @param adminId
   */
  async enrollTls(request: IEnrollmentRequest, adminId: string = this.clientConfig.admin.name): Promise<IEnrollResponse | undefined> {
    try {
      const identity = await this.wallet.getIdentity(request.enrollmentID);
      if(!identity) {
        d(`The user ${request.enrollmentID} is not registered and enrolled into the wallet`);
        return null;
      }

      // check if the admin account exists
      const adminIdentity = await this.wallet.getIdentity(adminId);
      if (!adminIdentity) {
        d(`An identity of the admin user (${adminId}) does not exists in the wallet`);
        d('Check if admin account is already enrolled');
        return null;
      }

      const enrollment = await this.ca.enroll(request);
      d(`TLS enrolled for user ${request.enrollmentID}`);

      return enrollment;
    } catch(err) {
      e(err);
      return null;
    }
  }

  /**
   * Add a new user account
   * @param params
   * @param mspId
   */
  async addUser(params: UserParams, mspId: string): Promise<EnrollmentResponse | undefined> {
    try {
      // check if the user exists
      const userIdentity = await this.wallet.getIdentity(params.enrollmentID);
      if (userIdentity) {
        d(`An identity for the user (${params.enrollmentID}) already exists`);
        return null;
      }

      // check if the admin account exists
      const adminIdentity = await this.wallet.getIdentity(this.clientConfig.admin.name);
      if (!adminIdentity) {
        d(`An identity of the admin user (${this.clientConfig.admin.name}) does not exists in the wallet`);
        d('Check if admin account is already enrolled');
        return null;
      }

      // build a user object to interact with the CA
      const provider = this.wallet.getWallet().getProviderRegistry().getProvider(adminIdentity.type);
      const adminUser = await provider.getUserContext(adminIdentity, this.clientConfig.admin.name);

      // register the user, enroll the user and import into the wallet
      // @ts-ignore
      const secret = await this.ca.register(params, adminUser);
      const enrollment = await this.ca.enroll({ enrollmentSecret: secret, enrollmentID: params.enrollmentID });

      const { key, certificate } = enrollment;

      // store the new identity in the wallet
      await this.wallet.addIdentity(params.enrollmentID, this.client.getMspid(), key, certificate);
      d(`Successfully add user "${params.enrollmentID} and imported it into the wallet`);

      return { enrollment, secret };
    } catch (err) {
      e(`Failed to add user "${params.enrollmentID}": ${err}`);
      return null;
    }
  }

  /**
   * Build the FabricCaService TLS options to connect
   * @param caTlsCertPath
   * @private
   */
  private async _getCATlsOptions(caTlsCertPath: string): Promise<TLSOptions> {
    const caTlsCertData = await this.readSingleFileInDir(caTlsCertPath);
    const caRoots = Buffer.from(caTlsCertData);

    return {
      trustedRoots: caRoots,
      verify: false
    };
  }
}
