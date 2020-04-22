
var hfc = require('fabric-client');

export async function getClientForOrg (userorg) {
  let client = hfc.loadFromConfig('./tests/network-config.yaml');
  client.loadFromConfig(`./tests/${userorg.toLowerCase()}.yaml`);
  return client;
}
