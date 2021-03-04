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

/**
 * Class responsible to operate other a docker engine (local or remote)
 * @author ahmed.souissi@irt-systemx.fr
 */

import * as Compose from 'docker-compose';
import { e, l } from '../utils/logs';
import {
  Container,
  ContainerCreateOptions,
  ContainerInfo,
  ContainerInspectInfo,
  DockerOptions,
  Network, NetworkCreateOptions,
  NetworkInspectInfo,
  Volume,
  VolumeInspectInfo,
  Image,
  ImageInfo,
  ImageInspectInfo
} from 'dockerode';
import { IDockerComposeOptions, IDockerComposeResult } from 'docker-compose';
import * as Dockerode from 'dockerode';

interface NetworkListOptions {
  filters?: string;
}

interface VolumeListOptions {
  filters?: string;
}

interface ContainerListOptions {
  all?: boolean;
  limit?: number;
  size?: boolean;
  filters?: string;
}

// interface NetworkCreateOptions {
//   Name: string;
//   CheckDuplicate?: boolean;
//   Driver?: string;
//   Internal?: boolean;
//   Attachable?: boolean;
//   Ingress?: boolean;
//   IPAM?: {};
//   EnableIPv6?: boolean;
//   Options?: {};
//   Labels?: {};
// }

interface VolumeCreateOptions {
  Name?: string;
  Driver?: string;
  DriverOpts?: {};
  Labels?: {};
}

interface ImageCreateOptions {
  Name?: string;
  Driver?: string;
  DriverOpts?: {};
  Labels?: {};
}

interface ContainerRemoveOptions {
  v: boolean;
  force: boolean;
  link: boolean;
}

interface VolumeRemoveOptions {
  force?: boolean;
}

interface ImageRemoveOptions {
  force?: boolean;
}

export class DockerEngine {
  engine: Dockerode;

  constructor(public engineOptions: DockerOptions) {
    this.engine = new Dockerode(engineOptions);
  }

  /**
   * Check if the current configured engine is alive or not
   */
  async isAlive(): Promise<Boolean> {
    try {
      await this.engine.info();
      return true;
    } catch (err) {
      e(err);
      return false;
    }
  }

  //Containers Management
  async createContainer(options: ContainerCreateOptions): Promise<Container> {
    const already = await this.doesContainerExist(options.name);
    if (!already) {
      return this.engine.createContainer(options);
    }
    l(`Docker network (${options.name}) already exists`);
  }
  

  getContainer(id: string): DockerContainer {
    let container = new DockerContainer(this);
    container.setContainer(this.engine.getContainer(id));
    return container;
  }

  async listContainers(options?: ContainerListOptions): Promise<DockerContainer[]> {
    let containers: ContainerInfo[] = await this.engine.listContainers(options);
    let containerList: DockerContainer[] = [];
    for (let containerInfo of containers) {
      let containerObj: DockerContainer = this.getContainer(containerInfo.Id);
      containerList.push(containerObj);
    }
    return containerList;
  }

  /**
   * Check if a container name is already running
   * @param containerName container name
   */
  async doesContainerExist(containerName: string): Promise<boolean> {
    const containers = await this.engine.listContainers();
    const fContainer = containers.filter(container => container.Names.filter(name => name.indexOf(containerName) > 0).length > 0);
    return fContainer.length > 0;
  }

  /**
   * Remove all container existing in the list within the current docker engine
   * @param serviceNames
   * @param remove remove the selected container
   */
  async stopContainerList(serviceNames: string[], remove: boolean): Promise<boolean> {
    try {
      for(const serviceName of serviceNames) {
        await this.stopContainer(serviceName, remove);
      }

      return true;
    } catch(err) {
      e(err);
      return false;
    }
  }

  /**
   * stop running container
   * @param serviceName container service name
   * @param remove remove container
   */
  async stopContainer(serviceName: string, remove: boolean): Promise<boolean> {
    try {
      // filter existing containers info
      const containersInfo = await this.engine.listContainers();
      const foundContainerInfos = containersInfo.filter(container => this.checkContainerName(serviceName, container.Names));

      // retrieve container instance from one found and stop it
      for (let containerInfo of foundContainerInfos) {
        const container: DockerContainer = this.getContainer(containerInfo.Id);
        await container.stop();

        if(remove) {
          await container.remove();
        }
      }

      return true;
    } catch(err) {
      e(err);
      throw err;
    }
  }
  checkContainerName(serviceName: string, containerNames: string[]): boolean {
    for(const name of containerNames) {
      if(name === serviceName || name === `/${serviceName}`) {
        return true;
      }
    }
    return false;
  }

  checkVolumeName(volumeNames: string[], volumeName: string): boolean {
    if(volumeNames.includes(volumeName)){
      return true;
    }
    return false;
  }

  //Networks Management
  async createNetwork(options: NetworkCreateOptions): Promise<Network> {
    const already = await this.doesNetworkExist(options.Name);
    if (!already) {
      return this.engine.createNetwork(options);
    }
    l(`Docker network (${options.Name}) already exists`);
  }

  getNetwork(id: string): DockerNetwork {
    let network = new DockerNetwork(this);
    network.setNetwork(this.engine.getNetwork(id));
    return network;
  }

  async listNetworks(options?: VolumeListOptions): Promise<DockerNetwork[]> {
    let networks: any[] = await this.engine.listNetworks(options);
    let networkList: DockerNetwork[] = [];
    for (let networkInfo of networks) {
      let networkObj: DockerNetwork = this.getNetwork(networkInfo.Id);
      networkList.push(networkObj);
    }
    return networkList;
  }

  async doesNetworkExist(name: string): Promise<Boolean> {
    const networks = await this.engine.listNetworks();
    const fNetwork = networks.filter(network => network.Name === name);
    return fNetwork.length > 0;
  }

  // TODO implement delete network

  //Volumes Management
  async createVolume(options: VolumeCreateOptions): Promise<Volume> {
    if (options.hasOwnProperty('Name')) {
      const already = await this.doesNetworkExist(options.Name);
      if (!already) {
        return this.engine.createVolume(options);
      }
      l(`Docker network (${options.Name}) already exists`);
    } else {
      return this.engine.createVolume(options);
    }
  }

  getVolume(name: string): DockerVolume {
    let volume = new DockerVolume(this);
    volume.setVolume(this.engine.getVolume(name));
    return volume;
  }

  getImage(name: string): DockerImage {
    let image = new DockerImage(this);
    image.setImage(this.engine.getImage(name));
    return image;
  }
  
  async pruneVolume(opts): Promise<any> {
    await this.engine.pruneVolumes(opts)
  }

  async listVolumes(options?: NetworkListOptions): Promise<DockerVolume[]> {
    let { Volumes } = await this.engine.listVolumes(options);
    let volumeList: DockerVolume[] = [];
    for (let volumeInfo of Volumes) {
      let volumeObj: DockerVolume = this.getVolume(volumeInfo.Name);
      volumeList.push(volumeObj);
    }
    return volumeList;
  }

  findMyImage(myArray: string[]){
    const regex = new RegExp('dev-peer*');
    let found ;
    console.log(myArray)
    for(let single of myArray){
      found = regex.test(single)
      if (found){
        break
      }
    }
    return found
  }

  async deleteDevPeerImages(options?: NetworkListOptions): Promise<boolean> {
    let Images: ImageInfo[]  = await this.engine.listImages(options);
   // console.log('immm', Images)
    let myList: ImageInfo[] = []

    for( let myImage of Images){
      if(this.findMyImage(myImage.RepoTags)){
        myList.push(myImage)
      }
    }
    try{
      for (let singleImage of myList) {
        let imageObj: DockerImage = this.getImage(singleImage.Id);
        console.log('volume to stop', imageObj)
        await imageObj.remove();
      }
      return true;
    }catch (e) {
      console.log(e)
      return false;
    }
  }

  async doesVolumeExist(name: string): Promise<Boolean> {
    const { Volumes } = await this.engine.listVolumes();
    const fVolume = Volumes.filter(volume => volume.Name === name);
    return fVolume.length > 0;
  }

  // TODO implement delete volumes

  async deleteVolumesList(volumesList: string[]): Promise<boolean> {
    try {

      const volumeInfo = await this.engine.listVolumes();
      const arrayVolumes = volumeInfo.Volumes;
      console.log('here in deleteVolumesList volume', arrayVolumes)
      const foundVolumeInfos = arrayVolumes.filter(volume => this.checkVolumeName(volumesList, volume.Name));

      for (let singleVolume of foundVolumeInfos) {
         let volumeObj: DockerVolume = this.getVolume(singleVolume.Name);
         console.log('volume to stop', volumeObj)
         await volumeObj.remove();
      }
      return true;
    } catch(err) {
      e(err);
      return false;
    }
  }

  //Docker-compose Management
  composeUpAll(options?: IDockerComposeOptions): Promise<IDockerComposeResult> {
    return Compose.upAll(options);
  }

  composeOne(service: string, options?: IDockerComposeOptions): Promise<IDockerComposeResult> {
    return Compose.upOne(service, options);
  }

  composeDown(options?: IDockerComposeOptions): Promise<IDockerComposeResult> {
    return Compose.down(options);
  }
}

export class DockerContainer {
  public container: Container;

  constructor(public engine: DockerEngine, public options?: ContainerCreateOptions) {
    
  }

  async create(): Promise<void> {
    this.container = await this.engine.createContainer(this.options);
  }

  start(options?: {}): Promise<any> {
    return this.container.start(options);
  }

  inspect(options?: {}): Promise<ContainerInspectInfo> {
    return this.container.inspect(options);
  }

  stop(options?: {}): Promise<any> {
    return this.container.stop(options);
  }

  exec(options?: {}): Promise<any> {
    return this.container.exec(options);
  }

  remove(options?: ContainerRemoveOptions): Promise<any> {
    return this.container.remove(options);
  }

  setContainer(container: Container): void {
    this.container = container;
  }
}

export class DockerNetwork {
  network: Network;

  constructor(public engine: DockerEngine, public options?: NetworkCreateOptions) {}

  async create(): Promise<void> {
    this.network = await this.engine.createNetwork(this.options);
  }

  remove(options?: {}): Promise<any> {
    return this.network.remove(options);
  }

  connect(options?: {}): Promise<any> {
    return this.network.connect(options);
  }

  disconnect(options?: {}): Promise<any> {
    return this.network.disconnect(options);
  }

  inspect(): Promise<NetworkInspectInfo> {
    return this.network.inspect();
  }

  setNetwork(network: Network): void {
    this.network = network;
  }
}

export class DockerVolume {
  volume: Volume;

  constructor(public engine: DockerEngine, public options?: VolumeCreateOptions) {}

  async create(): Promise<void> {
    this.volume = await this.engine.createVolume(this.options);
  }

  remove(options?: VolumeRemoveOptions): Promise<any> {
    return this.volume.remove(options);
  }

  inspect(): Promise<VolumeInspectInfo> {
    return this.volume.inspect();
  }

  setVolume(volume: Volume): void {
    this.volume = volume;
  }
}

export class DockerImage {
  image: Image;

  constructor(public engine: DockerEngine, public options?: ImageCreateOptions) {}

  remove(options?: ImageRemoveOptions): Promise<any> {
    return this.image.remove(options);
  }

  inspect(): Promise<ImageInspectInfo> {
    return this.image.inspect();
  }
  
  setImage(image: Image): void {
    this.image = image;
  }
}
