import * as YamlValidator from 'yaml-validator';
import { l } from '../../utils/logs';

// TODO use directly the js-yaml safeLoad schema options
export class ConfigurationValidator {
  static structureDeployment = {
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

  static structureGenesis = {
    genesis: {
      template_folder: 'string',
      consensus: 'string',
      organisations: [
        {
          organisation: 'string',
          domain_name: 'string',
          orderers: [
            {
              orderer: 'string',
              host_name: 'string',
              port: 'number'
            }
          ],
          anchorPeer: {
            host_name: 'string',
            port: 'string'
          }
        }
      ]
    }
  };

  isValidDeployment(filePath: string) {
    return ConfigurationValidator.isValid(filePath, this.getValidatorOptions(ConfigurationValidator.structureDeployment));
  }

  isValidGenesis(filePath: string) {
    return ConfigurationValidator.isValid(filePath, this.getValidatorOptions(ConfigurationValidator.structureGenesis));
  }

  private getValidatorOptions(structure): YamlValidator.IYamlValidatorOptions {
    return {
      log: false,
      structure: structure,
      onWarning: function(error, filepath) {
        l(`${filepath} has error: ${error}`);
      },
      writeJson: false
    };
  }

  private static isValid(filePath: string, options: YamlValidator.IYamlValidatorOptions) {
    l(`Validating ${filePath}...`);
    const validator = new YamlValidator(options);
    validator.validate([filePath]);
    const reports = validator.report();

    return reports == 0;
  }
}
