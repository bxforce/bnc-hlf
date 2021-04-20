
# bnc-hlf

Blockchain Network Composer for Hyperledger Fabric.
BNC is the CLI deployment tools for Enterprise Blockchain projects.
It supports mainly Hyperledger Blockchain umbrella.

## Getting Started :rocket:

Run BNC:

````aidl
curl -sL https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/bin/bnc > bnc && chmod a+x bnc && ./bnc run
````

The command above will start a single organization with single peer and orderer.

It will deploy the default absotre chaincode embedded in the image.

Clear BNC:

````aidl
curl -sL https://raw.githubusercontent.com/bxforce/bnc-hlf/improve-docs/bin/bnc > bnc && chmod a+x bnc && ./bnc clear
````


## Process overview (two orgs example) :bulb:

In the process below, we illustrate the process of starting a consortium blockchain with two organizations: org1 and org2.

In this scenario, org1 is the organization in charge of creating the genesis block and the channel. 

In order to generate the genesis block and the channel definition, org2 shares its orderers/peers certificates with org1.

These generated artifacts by org1 are shared with org2.


![BNC](/docs/bnc.PNG)


## Tutorials :books:
* [input files](docs/input.md)
* [Run two org on two machines](docs/two-org.md)


## Contributing

1. Fork it! 🍴
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request 😁 🎉


## Credits

- Lead - Wassim Znaidi ([@Wassimz](https://github.com/wassimz))
- Developer - Ahmed Souissi ([@ahmeds](#))
- Developer - Sahar Fehri ([@sharf](#))
- Product owner - Chiraz Chaabane ([@chirazc](#))
- [@worldsibu](https://github.com/worldsibu) for inspiration and some part of the util code.


## Changelog

[Go to changelog](./changelog.md)
