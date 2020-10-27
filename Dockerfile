FROM ubuntu:20.04 as npm_build

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
COPY scripts /root/scripts

RUN apt install -y build-essential
RUN npm install -g typescript

COPY tsconfig.json /root/tsconfig.json
COPY tslint.json /root/tslint.json
COPY package.json /root/package.json

WORKDIR /root
RUN npm install

COPY src /root/src
RUN npm run build && npm link

ENTRYPOINT ["bnc"]
