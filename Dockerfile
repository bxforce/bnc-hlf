FROM ubuntu:20.04 as npm_build

## Install docker
RUN apt-get update && \
    DEBIAN_FRONTEND="noninteractive" apt-get install -y apt-transport-https ca-certificates curl software-properties-common build-essential && \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add - && \
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable" && \
    apt-get update && \
    apt-get install -y docker-ce

## Install docker-compose
RUN curl -L "https://github.com/docker/compose/releases/download/1.26.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose

RUN useradd -ms /bin/bash bnc
RUN usermod -aG docker bnc
RUN mkdir /bnc && chown bnc:bnc /bnc
ENV HOME /bnc
WORKDIR $HOME
#USER bnc

## Install node
ENV NVM_VERSION v0.35.3
ENV NODE_VERSION v12.16.3
ENV NVM_DIR $HOME/.nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/$NVM_VERSION/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default
ENV NODE_PATH $NVM_DIR/versions/node/$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/versions/node/$NODE_VERSION/bin:$PATH

## Build bnc-hlf
RUN npm install -g typescript

COPY tsconfig.json $HOME/tsconfig.json
COPY tslint.json $HOME/tslint.json
COPY package.json $HOME/package.json
RUN mkdir src && touch src/index.ts
RUN npm install

COPY src $HOME/src
RUN npm run build && npm link

## Add default configs
COPY scripts $HOME/scripts
COPY tests/chaincode $HOME/chaincode
COPY tests/demo/config.yaml $HOME/config/config.yaml
COPY tests/single_machine/config-hosts.yaml $HOME/config/config-hosts.yaml
COPY tests/transact.js $HOME/transact.js

ENTRYPOINT ["bnc"]
