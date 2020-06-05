# BNC

BNC is the a CLI deployment tools for Enterprise Blockchain projects.
It supports mainly Hyperledger Blockchain umbrella.

## Prerequisites

- NPM
- [Docker](https://www.docker.com/community-edition)

## Usage

#### Tests

Before executing the bnc-tool command, you need to run

```shell script
npm link
```

This command command will install globally a symlink linking to your project so there's no need
for you to re-run this when you update the code.

One done, you can run the commands (for more information refer the command.ts file):

```shell script
bnc new -f YOUR_CONFIFURATION_FILE
```

TBD

## Changelog

[Go to changelog](./changelog.md)


- configtx etcdraft section
- orderer docker compose ports
