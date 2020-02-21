import * as YamlValidator from 'yaml-validator';
import { l } from '../utils/logs';
import {IYamlValidatorOptions} from 'yaml-validator';

export class ConfigurationValidator {

  configurationOptions: IYamlValidatorOptions = {
    log: false,
    structure: {
      chains: {
        template_folder: 'string',
        fabric: 'string',
        organisations: [
          {
            'name': {
              tls: 'boolean',
              couchdb: 'boolean',
              domain_name: 'string',
              ca: 'string',
              orderers: {
                consensus: 'string',
                engine_name: 'string'
              },
              peers: [
                {
                  'peerName': {
                    engine_name: 'string'
                  }
                }
              ]
            }
          }
        ]
      },
      engines: [
        {
          'orgEngineName': [
            {
              'engineName': {
                type: 'string',
                ip: 'string',
                port: 'string',
                settings: [
                  'string'
                ]
              }
            }
          ]
        }
      ]
    },
    onWarning: function(error, filepath){
      l(`${filepath} has error: ${error}`);
    },
    writeJson: false,
  };

  isValid(filePath: string) {
    const validator = new YamlValidator(this.configurationOptions);
    validator.validate([filePath]);
    const reports = validator.report();

    return reports == 0;
  }
}