#!/usr/bin/env node
import { l } from './utils/logs';
import * as path from 'path';
import { DockerEngine, Container } from './agents/docker-agent';

const test = async () => {
  let engine = new DockerEngine({socketPath: '/var/run/docker.sock'});
  let container = new Container(engine,{
    Image: 'ubuntu:16.04',
    name: 'test',
    AttachStdin: false,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
    Cmd: ['/bin/bash', '-c', 'tail -f /var/log/:w' +
    'dmesg'],
    OpenStdin: false,
    StdinOnce: false
  });
  await container.create();
  await container.start();
  //l(typeof container);
  await container.stop();

  let containerData = await container.inspect();
  l(containerData.Name);
  let containerClone: Container = engine.getContainer(containerData.Name.substr(1));
  await containerClone.start();
  await containerClone.stop();
  await containerClone.remove();
};

const testCompose = async () => {
  let engine = new DockerEngine({socketPath: '/var/run/docker.sock'});
  await engine.composeDown({cwd: path.join(__dirname), log: true });
  await engine.composeUpAll({
    cwd: path.join(__dirname),
    log: true/*,
    config: 'docker-compose-build.yml',
    commandOptions: [ '--build', [ '--timeout', '5' ]]*/
  });
  // option object : https://docs.docker.com/engine/api/v1.37/#operation/ContainerList
  let containers: Container[] = await  engine.listContainers({
    all: true,
    filters: {
      network: ['bnc-tools_default']
    }
  });
  for(let container of containers){
    await container.remove({force: true}); //If the container is running, kill it before removing it.
  }
};
try{
  test();
  //test-remote(); //TODO
  testCompose();
}catch(error){
  l(error.message);
}
