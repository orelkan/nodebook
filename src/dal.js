const { db } = require('./models');
const { flatMap } = require('lodash');
const { USERS, HOBBIES, FRIENDS } = require('./consts').tableNames;

async function connect() {
  return db.connect();
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
  const locationString = stringifyLocation(location);

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
    await insertHobbies(id, hobbies);
  }

  return id;
}

async function insertHobbies(userId, hobbies) {
  const hobbiesInsert = hobbies.map(hobby => `(${userId},'${hobby}')`).join(',');
  return db.query(`INSERT INTO ${HOBBIES} (user_id, hobby) values ${hobbiesInsert}`);
}

async function deleteHobbies(userId) {
  return db.query(`DELETE FROM ${HOBBIES} WHERE user_id=$1`, [userId]);
}

function stringifyLocation(locationObj) {
  const { x, y } = locationObj;
  return `(${x},${y})`;
}

function makeUpdateQuery(updateData) {
  return Object.entries(updateData)
    .filter(([key]) => key !== 'hobbies')
    .map(([key, val]) => key === 'location' ?
      `${key}=point${stringifyLocation(val)}` :
      `${key}='${val}'`)
    .join(',');
}

// Returns the number of affected rows
async function updateUser(id, updateData) {
  // It's better if it'll be a transaction
  const updateQuery = makeUpdateQuery(updateData);
  const result = await db.query(`UPDATE ${USERS} SET ${updateQuery} WHERE id=$1`, [id]);
  if (updateData.hobbies instanceof Array) {
    await deleteHobbies(id);
    await insertHobbies(id, updateData.hobbies);
  }
  return result.rowCount;
}

function makeWhereQuery(queryObj) {
  if (!queryObj) return ['', []];

  const keys = Object.keys(queryObj).filter(key => key !== 'hobbies');

  // Note that values are in the same order as the keys
  const values = keys
    .map(key => key === 'location' ?
      stringifyLocation(queryObj[key]) :
      queryObj[key]
    );

  const whereQuery = keys
    .map((key, i) => key === 'location' ?
      `${key}~=$${i+1}` :
      `${key}=$${i+1}`
    ).join(' AND ');

  return [whereQuery, values];
}

async function deleteUserById(userId) {
  await db.query(`DELETE FROM ${USERS} WHERE id=$1`, [userId]);
}

async function getUsersByQuery(queryObj) {
  const [whereQuery, values] = makeWhereQuery(queryObj);
  const fullQuery = whereQuery ?
    `SELECT id FROM ${USERS} WHERE ${whereQuery}` :
    `SELECT id FROM ${USERS}`;
  const result = await db.query(fullQuery, values);
  return Promise.all(result.rows.map(r => r.id).map(getUserById));
}

async function saveFriends(id, friendIds) {
  const baseQuery = `INSERT INTO ${FRIENDS} (user_id1, user_id2) VALUES `;
  const valuesQuery = flatMap(friendIds,
    friendId => [`(${id},${friendId})`, `(${friendId},${id})`]
  ).join(',');
  const query = baseQuery + valuesQuery;
  await db.query(query);
}

async function getFriendsById(id) {
  const result =
    await db.query(`SELECT user_id2 FROM ${FRIENDS} WHERE user_id1=$1`,[id]);

  return Promise.all(result.rows.map(r => r.user_id2).map(getUserById));
}

// Used for tests
async function clearTables() {
  await db.query(`DELETE FROM ${USERS}`);
}

// Used for tests
async function createUsers(usersData) {
  return Promise.all(usersData.map(createUser));
}

module.exports = {
  connect,
  getUserById,
  createUser,
  clearTables,
  deleteUserById,
  getUsersByQuery,
  saveFriends,
  createUsers,
  getFriendsById,
  updateUser
};

