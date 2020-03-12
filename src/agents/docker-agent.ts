import * as Docker from 'dockerode';
import * as Compose from 'docker-compose';
import { IDockerComposeOptions } from 'docker-compose';

export class DockerEngine {
  engine: any;

  constructor(public engineAdr: any) {
    this.engine = new Docker(engineAdr);
  }

  //Containers Management
  createContainer(options): Promise<any> {
    return this.engine.createContainer(options);
  }

  getContainer(id): Container {
    let container = new Container(this.engine);
    container.setContainer(this.engine.getContainer(id));
    return container;
  }

  async listContainers(options?): Promise<Container[]> {
    let containers: any[] = await this.engine.listContainers(options);
    let containerList: Container[] = [];
    for (let containerInfo of containers) {
      let containerObj = this.getContainer(containerInfo.Id);
      containerList.push(containerObj);
    }
    return containerList;
  }

  //Networks Management
  createNetwork(options): Promise<any> {
    // TODO check if the network exists already
    return this.engine.createNetwork(options);
  }

  getNetwork(id): Network {
    let network = new Network(this.engine);
    network.setNetwork(this.engine.getNetwork(id));
    return network;
  }

  listNetworks(): Promise<any> {
    //TODO return a list of Network Objects
    return this.engine.listNetworks();
  }

  //Volumes Management
  createVolume(options): Promise<any> {
    // TODO
    return this.engine.createVolume(options);
  }

  getVolume(id): Volume {
    let volume = new Volume(this.engine);
    volume.setVolume(this.engine.getVolume(id));
    return volume;
  }

  listVolumes(): Promise<any> {
    //TODO return a list of Volume Objects
    return this.engine.listVolumes();
  }

  //Docker-compose Management
  composeUpAll(options: Compose.IDockerComposeOptions): Promise<any> {
    return Compose.upAll(options);
  }

  composeOne(service: string, options: Compose.IDockerComposeOptions): Promise<any> {
    return Compose.upOne(service, options);
  }

  composeDown(options: Compose.IDockerComposeOptions): Promise<any> {
    return Compose.down(options);
  }
}

export class Container {
  container: any;

  constructor(public engine: DockerEngine, public options?: any) {}

  async create() {
    this.container = await this.engine.createContainer(this.options);
  }

  start() {
    return this.container.start();
  }

  inspect() {
    return this.container.inspect();
  }

  stop() {
    return this.container.stop();
  }

  remove(options?) {
    return this.container.remove(options);
  }

  setContainer(container: any) {
    return (this.container = container);
  }
}

export class Network {
  // TODO test and verify
  network: any;

  constructor(public engine: DockerEngine, public options?: any) {}

  async create() {
    this.network = await this.engine.createNetwork(this.options);
  }

  remove() {
    return this.network.remove();
  }

  connect() {
    return this.network.connect();
  }

  update() {
    return this.network.update();
  }

  inspect() {
    return this.network.inspect();
  }

  setNetwork(network: any) {
    return (this.network = network);
  }
}

export class Volume {
  // TODO test and verify
  volume: any;

  constructor(public engine: DockerEngine, public options?: any) {}

  async create() {
    this.volume = await this.engine.createVolume(this.options);
  }

  remove() {
    return this.volume.remove();
  }

  inspect() {
    return this.volume.inspect();
  }

  setVolume(volume: any) {
    return (this.volume = volume);
  }
}
