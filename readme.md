# BNC

BNC is the a CLI deployment tools for Enterprise Blockchain projects. 
It supports mainly Hyperledger Blockchain umbrella.

## Prerequisites

* NPM
* [Docker](https://www.docker.com/community-edition)

## Usage

TBD

### Crypto materials for your users

All the certificates and Application files for your default users reside in `$HOME/hyperledger-fabric-network/.hfc-*`.

### Network profiles

Your network profiles will be provisioned at `$HOME/hyperledger-fabric-network/network-profiles`.

* The `*.network-profile.yaml` files: map your network if you run outside of the Docker network. For example, straight from your Machine.
* The `*.network-profile.inside-docker.yaml` files: map your network if you run an application inside a docker container in the same network as the blockchain `hurley_dev_net`.

## Changelog

[Go to changelog](./changelog.md)
