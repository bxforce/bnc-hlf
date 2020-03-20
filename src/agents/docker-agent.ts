import * as Compose from 'docker-compose';
import { l } from '../utils/logs';
import {
  Container,
  ContainerCreateOptions,
  ContainerInfo,
  ContainerInspectInfo,
  DockerOptions,
  Network,
  NetworkInspectInfo,
  Volume,
  VolumeInspectInfo
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

interface NetworkCreateOptions {
  Name: string;
  CheckDuplicate?: boolean;
  Driver?: string;
  Internal?: boolean;
  Attachable?: boolean;
  Ingress?: boolean;
  IPAM?: {};
  EnableIPv6?: boolean;
  Options?: {};
  Labels?: {};
}

interface VolumeCreateOptions {
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

export class DockerEngine {
  engine: Dockerode;

  constructor(public engineOptions: DockerOptions) {
    this.engine = new Dockerode(engineOptions);
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

  async doesContainerExist(name: string): Promise<Boolean> {
    const containers = await this.engine.listContainers();
    const fContainer = containers.filter(container => container.Names.filter(Name => Name === name).length > 0);
    return fContainer.length > 0;
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

  async listVolumes(options?: NetworkListOptions): Promise<DockerVolume[]> {
    let { Volumes } = await this.engine.listVolumes(options);
    let volumeList: DockerVolume[] = [];
    for (let volumeInfo of Volumes) {
      let volumeObj: DockerVolume = this.getVolume(volumeInfo.Name);
      volumeList.push(volumeObj);
    }
    return volumeList;
  }

  async doesVolumeExist(name: string): Promise<Boolean> {
    const { Volumes } = await this.engine.listVolumes();
    const fVolume = Volumes.filter(volume => volume.Name === name);
    return fVolume.length > 0;
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

  constructor(public engine: DockerEngine, public options?: ContainerCreateOptions) {}

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
