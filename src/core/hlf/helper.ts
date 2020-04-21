
var hfc = require('fabric-client');

export async function getClientForOrg (userorg) {
  let client = hfc.loadFromConfig('./network-config.yaml');
  client.loadFromConfig(`./${userorg.toLowerCase()}.yaml`);
  return client;
}
