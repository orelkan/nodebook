const { Pool } = require('pg');
const config = require('config');

module.exports.db = new Pool({
  max: 10,
  connectionString: config.postgres.connectionString
});