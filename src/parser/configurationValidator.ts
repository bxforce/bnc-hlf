import * as YamlValidator from 'yaml-validator';
import { l } from '../utils/logs';

export class ConfigurationValidator {
  static structure = {
    chains: {
      template_folder: 'string',
      fabric: 'string',
      tls: 'boolean',
      consensus: 'string',
      db: 'string',
      organisations: [
        {
          organisation: 'string',
          engineOrg: 'string',
          domain_name: 'string',
          ca: {
            name: 'string',
            engine_name: 'string'
          },
          orderers: [
            {
              orderer: 'string',
              engine_name: 'string'
            }
          ],
          peers: [
            {
              peer: 'string',
              engine_name: 'string'
            }
          ]
        }
      ]
    },
    engines: [
      {
        engine: 'string',
        hosts: [
          {
            host: 'string',
            type: 'string',
            url: 'string',
            port: 'number',
            settings: ['string']
          }
        ]
      }
    ]
  };

  options: YamlValidator.IYamlValidatorOptions = {
    log: false,
    structure: ConfigurationValidator.structure,
    onWarning: function(error, filepath) {
      l(`${filepath} has error: ${error}`);
    },
    writeJson: false
  };

  isValid(filePath: string) {
    l(`Validating ${filePath}...`);
    const validator = new YamlValidator(this.options);
    validator.validate([filePath]);
    const reports = validator.report();

    return reports == 0;
  }
}
