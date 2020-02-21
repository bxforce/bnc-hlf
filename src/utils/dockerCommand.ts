import { exec } from 'shelljs';

export const dockerComposeStart = template => {
  return exec(`docker-compose -f ${template} up -d`, { silent: true });
};

export const dockerComposeStop = template => {
  return exec(`docker-compose -f ${template} down`, { silent: true });
};

// TODO improvement -- use [execa](https://www.npmjs.com/package/execa)
