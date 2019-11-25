const { Pool } = require('pg');
const config = require('config');
const logger = require('./logger');

const realDb = new Pool({
  max: 10,
  connectionString: config.postgres.connectionString
});

const query = realDb.query.bind(realDb);

realDb.query = (...args) => {
  logger.info('SQL: ' + args[0], { values: args[1] });
  return query(...args);
};

module.exports.db = realDb;