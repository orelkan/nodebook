const { Pool } = require('pg');
const config = require('config');
const logger = require('./logger');

const realDb = new Pool({
  max: 10,
  connectionString: config.postgres.connectionString
});

const query = realDb.query.bind(realDb);
const connect = realDb.connect.bind(realDb);

if (config.logs && config.logs.logSqlQueries) {
  realDb.query = (...args) => {
    logger.info('SQL: ' + args[0], {values: args[1]});
    return query(...args);
  };
}

if (config.logs && config.logs.logSqlQueriesInConnection) {
  // Adding logs to connection which sometimes works with callbacks
  realDb.connect = async (cb) => {
    try {
      const client = await connect();
      const clientQuery = client.query.bind(client);
      client.query = (...args) => {
        logger.info('SQL Connection: ' + args[0], {values: args[1]});
        return clientQuery(...args);
      };
      if (cb) cb(null, client);
      else return client;
    } catch (e) {
      if (cb) cb(e);
      else throw e;
    }
  };
}

module.exports.db = realDb;