#!/usr/bin/env node
//'use strict';
import { l } from './utils/logs';
const {Docker} = require('node-docker-api');

class DockerEngine {
    socketPath : string;
    docker;
    
    constructor(socketPath: string) {
        this.socketPath = socketPath;
        this.docker =  new Docker({ socketPath: socketPath });
    }
}

class Container {
    engine : DockerEngine;
    image: string;
    name: string;
    options: Object;
    container;
    
    constructor(engine: DockerEngine, image: string, name: string, options: Object) {
        this.engine = engine;
        this.image = image;
        this.name = name;
        this.options = options;
    }

    async create() {
        this.container = await this.engine.docker.container.create(Object.assign({ Image: this.image, name: this.name }, this.options))
    }
      
    start() {
        this.container.start();
    }
      
    stop() {
        this.container.stop();
    }
      
    delete(options:Object) {
        this.container.delete(options);
    }
      
    restart() {
        this.container.restart();
    }
}



const test = async () => {
    let dockerEngine = new DockerEngine('/var/run/docker.sock');
    let container = new Container(dockerEngine, 'ubuntu:16.04', 'test', {});
    await container.create();
    await container.start();
    await container.stop();
    //await container.restart();
    await container.delete({ force: true });
}

try{
    test();
}catch(error){
    l(error.message);
}
