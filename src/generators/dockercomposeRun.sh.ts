import { BaseGenerator } from './base';

export class NetworkRestartShOptions {
  networkRootPath: string;
  composeFileName: string;
}

export class DockercomposeRunShGenerator extends BaseGenerator {
  contents = `
#!/bin/bash
set +e

#clean

ITEMS=$(docker ps -a | awk '$2~/hyperledger/ {print $1}') 

if [ ! -z "$ITEMS" ]; then
    docker stop $(docker ps -a | awk '$2~/hyperledger/ {print $1}') 
    docker rm -f $(docker ps -a | awk '$2~/hyperledger/ {print $1}') $(docker ps -a | awk '{ print $1,$2 }' | grep dev-peer | awk '{print $1 }') || true
    docker rmi -f $(docker images | grep dev-peer | awk '{print $3}') || true
fi

# start
docker-compose -f ${this.options.networkRootPath}/docker-compose.yaml up -d
`;

  constructor(filename: string, path: string, private options: NetworkRestartShOptions) {
    super(filename, path);
  }
}
