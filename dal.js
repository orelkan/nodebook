const oracledb = require('oracledb');
const config = require('config');

async function connect() {
  const { user, password, connectString } = config.oracle;
  const connectionConfig = { user, password, connectString };
  return await oracledb.getConnection(connectionConfig);
}

async function getUserById(connection, userId) {
  return await connection.execute(
    'SELECT * FROM users WHERE id = :id', [userId]
  );
}

async function createUser(connection, userData) {
  return connection.execute(
    'INSERT INTO files (id, first_name, last_name) VALUES (?, ?, ?)',
    [userData.id, userData.firstName, userData.lastName]);
}

// Used for tests
async function clearTables(connection) {
  await connection.execute('TRUNCATE TABLE users');
  // await connection.execute('TRUNCATE TABLE friends');
}

module.exports = {
  connect, getUserById, createUser, clearTables
};

