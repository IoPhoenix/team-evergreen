//config.js
/* Created by Fil G on August 25, 2019
   Based on info at https://codingsans.com/blog/node-config-best-practices.
   If ports/names different from defaults set appropriate env value in .env file on your machine.
   !!! Make sure you've added .env to your .gitignore file or we will clobber each other's configuration !!! */

require('dotenv').config();

const env = process.env.NODE_ENV || 'dev'; // defaults to dev environment if nothing set

const dev = {
  app: {
    port: parseInt(process.env.DEV_APP_PORT) || 3000
  },
  db: {
    host: process.env.DEV_DB_HOST || 'localhost',
    port: parseInt(process.env.DEV_DB_PORT) || 27017,
    name: process.env.DEV_DB_NAME || 'evergreen_dev',
    dbType: process.env.DEV_DB_TYPE || 'mongodb',
  }
};
const test = {
  app: {
    port: parseInt(process.env.TEST_APP_PORT) || 3000
  },
  db: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT) || 27017,
    name: process.env.TEST_DB_NAME || 'evergreen_test',
    type: process.env.DEV_DB_TYPE || 'mongodb',
  }
};

const config = {
  dev,
  test
};

module.exports = config[env];