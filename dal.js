const { db } = require('./models');
const { USERS, HOBBIES, FRIENDS } = require('./consts').tableNames;

async function connect() {
  return await db.connect();
}

async function getUserById(userId) {
  const result = await db.query(
    `SELECT * FROM ${USERS} WHERE id = $1`, [userId]
  );
  const user = result.rows[0];
  if (!user) return;

  const hobbiesResult = await db.query(`SELECT hobby FROM ${HOBBIES} WHERE user_id=$1`, [userId]);
  const hobbies = hobbiesResult.rows.map(({ hobby }) => hobby);
  return { ...user, hobbies };
}

async function createUser(userData) {
  const {
    first_name, last_name, phone_number, location, gender,
    relationship_status, interested_in, hobbies
  } = userData;
  const { x, y } = location || {};
  const locationString = `(${x},${y})`;

  const result = await db.query(
    `INSERT INTO ${USERS} ` +
    '(first_name, last_name, phone_number, ' +
    'location, gender, relationship_status, interested_in) VALUES ' +
    '($1, $2, $3, $4, $5, $6, $7) RETURNING id',
    [first_name, last_name, phone_number, locationString, gender,
      relationship_status, interested_in]);

  const { id } = result.rows[0];

  // Inserting hobbies if they exist
  if (hobbies && hobbies[0]) {
    const hobbiesInsert = hobbies.map(hobby => `('${id}','${hobby}')`).join(',');
    await db.query(`INSERT INTO ${HOBBIES} (user_id, hobby) values ${hobbiesInsert}`);
  }

  return id;
}

async function deleteUserById(userId) {
  await db.query(`DELETE FROM ${USERS} WHERE id=$1`, [userId]);
}

function makeWhereQuery(query) {
  if (!query) return ['', []];

  const keys = Object.keys(query).filter(key => key !== 'hobbies');

  // Note that values are in the same order as the keys
  const values = keys.map(key => key === 'location' ?
    `${query[key].x},${query[key].y}` :
    query[key]
  );
  const whereQuery = keys
    .map((key, i) => key === 'location' ?
      `${key}~=$${i+1}` :
      `${key}=$${i+1}`
    )
    .join(' AND ');
  return [whereQuery, values];
}

async function getUsersByQuery(query) {
  const [whereQuery, values] = makeWhereQuery(query);
  const fullQuery = whereQuery ?
    `SELECT id FROM ${USERS} WHERE ${whereQuery}` :
    `SELECT id FROM ${USERS}`;
  const result = await db.query(fullQuery, values);
  return Promise.all(result.rows.map(r => r.id).map(getUserById));
}

// Used for tests
async function clearTables() {
  await db.query(`DELETE FROM ${USERS}`);
}

// Used for tests
async function createUsers(usersData) {
  await Promise.all(usersData.map(createUser));
}

module.exports = {
  getUserById,
  createUser,
  clearTables,
  deleteUserById,
  getUsersByQuery,
  createUsers,
  connect
};

