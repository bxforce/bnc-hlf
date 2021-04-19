
# bnc-hlf

Blockchain Network Composer for Hyperledger Fabric.
BNC is the CLI deployment tools for Enterprise Blockchain projects.
It supports mainly Hyperledger Blockchain umbrella.

## Prerequisites

- tested with node v12.16.x
- NPM
- [Docker](https://www.docker.com/community-edition)
- Linux host (tested with ubuntu 18.04) to execute Hyperledger Fabric binaries


## Usage and documentation

Please refer to the _**docs**_ section to get more details about tools description and usage

## Version matching
| Fabric node SDK | Fabric CA node SDK  | Fabric network node SDK  |
| ------------- |:-------------:|:-------------:|
| v1.4.8     | v2.1.0 | v2.1.0 |

#### Hints - Tests

Before executing the bnc-tool command, you need to run

```shell script
npm link
```

This command will install globally a symlink linking to your project so there's no need
for you to re-run this when you update the code.

One done, you can run the commands (for more information refer the command.ts file):

```shell script
bnc new -f YOUR_CONFIFURATION_FILE
```

## Contributing

1. Fork it! 🍴
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request 😁 🎉

## Process overview (two orgs example) :bulb:

![BNC](/docs/bnc.PNG)


## Tutorials :books:
* [input files](docs/input.md)
* [Run single org on single machine](docs/single-org.md)
* [Run two org on two machines](docs/two-org.md)

## Credits

- Lead - Wassim Znaidi ([@Wassimz](https://github.com/wassimz))
- Developer - Ahmed Souissi ([@ahmeds](#))
- Developer - Sahar Fehri ([@sharf](#))
- Product owner - Chiraz Chaabane ([@chirazc](#))
- [@worldsibu](https://github.com/worldsibu) for inspiration and some part of the util code.


## Changelog

[Go to changelog](./changelog.md)
