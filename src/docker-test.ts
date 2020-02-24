#!/usr/bin/env node
import { l } from './utils/logs';
import { DockerEngine, Container } from './generators/agents/docker-agent';

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
  await container.stop();

  let containerData = await container.inspect();
  l(containerData.Name);
  let containerClone: Container = engine.getContainer(containerData.Name.substr(1));
  await containerClone.start();
  await containerClone.stop();
  await containerClone.remove();
};

try{
  test();
}catch(error){
  l(error.message);
}
