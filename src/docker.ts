#!/usr/bin/env node
//'use strict';
import { l } from './utils/logs';
//const {Docker} = require('dockerode');
var Docker = require('dockerode');
//import * as Docker from 'node-docker-api';


const test = async () => {
    var docker = new Docker({socketPath: '/var/run/docker.sock'});
    /*var container = docker.getContainer('cloud9');
    container.inspect(function (err, data) {
        console.log(data);
    });*/
    var container = await docker.createContainer({
      Image: 'ubuntu:16.04',
      AttachStdin: false,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      Cmd: ['/bin/bash', '-c', 'tail -f /var/log/dmesg'],
      OpenStdin: false,
      StdinOnce: false
    });
    //await container.start();
    //await container.stop();
    await container.remove();
}

try{
    test();
}catch(error){
    l(error.message);
}



