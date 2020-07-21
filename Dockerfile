FROM ubuntu:20.04

## Install docker
RUN apt update
RUN apt install -y apt-transport-https ca-certificates curl software-properties-common
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
RUN add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
RUN apt update
RUN apt install -y docker-ce

## Install docker-compose
RUN curl -L "https://github.com/docker/compose/releases/download/1.26.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose

## Install node
ENV NVM_VERSION v0.35.3
ENV NODE_VERSION v12.16.3
ENV NVM_DIR /root/.nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/$NVM_VERSION/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default
ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/versions/node/$NODE_VERSION/bin:$PATH

## Build bnc-hlf
RUN apt install -y build-essential
RUN npm install -g typescript
COPY package.json /root/package.json
COPY tsconfig.json /root/tsconfig.json
COPY src /root/src
WORKDIR /root
RUN npm install
RUN npm run build && npm link

## Script
#RUN echo "#!/bin/sh\nset -ex\n\nCONFIG=./tests/manual/demo/config.yaml\nARTIFACTS=/hyperledger-fabric-network/artifacts\n\nbnc enroll-peers -f \$CONFIG\nbnc enroll-orderers -f \$CONFIG\nbnc init --genesis -f \$CONFIG\nbnc init --configtx -f \$CONFIG\nbnc init --anchortx -f \$CONFIG\nbnc start -f \$CONFIG\nbnc channel create -f \$CONFIG -t $ARTIFACTS/mychannel.tx -n mychannel\nbnc channel join -n mychannel -p "peer0.org1.bnc.com" -f \$CONFIG\nbnc channel update -n mychannel -f \$CONFIG -t $ARTIFACTS/org1MSPanchors.tx\n" > run.sh && chmod a+x run.sh
#CMD ["./run.sh"]

# Usage:
# docker build -t bnc-hlf -f Dockerfile .
# docker network create --driver=bridge --subnet=172.20.0.0/16 bnc_network
# docker run -it --rm --name bnc-hlf --network bnc_network -v /tmp:/tmp -v /var/run/docker.sock:/var/run/docker.sock bnc-hlf bash
## NOTES: volume mount /tmp must be the same on host and container to make VAR template_folder works (so you have to cp your config files in /tmp on host)
