const { db } = require('./models');
const { flatMap } = require('lodash');

async function connect() {
  return db.connect();
}

async function userIdExists(userId) {
  const result = await db.query('SELECT id FROM users WHERE id=$1', [userId]);
  return Boolean(result.rowCount);
}

async function getUserById(userId) {
  const result = await getUsersByQuery({ id: userId });
  return result[0];
}

async function createUser(userData) {
  const {
    first_name, last_name, phone_number, location, gender,
    relationship_status, interested_in, hobbies
  } = userData;
  const locationString = stringifyLocation(location);

  const result = await db.query(
    `INSERT INTO users
    (first_name, last_name, phone_number,
    location, gender, relationship_status, interested_in) VALUES
    ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
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
  return db.query(`INSERT INTO hobbies (user_id, hobby) values ${hobbiesInsert}`);
}

async function deleteHobbies(userId) {
  return db.query('DELETE FROM hobbies WHERE user_id=$1', [userId]);
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
  let rowCount = 0;
  const addToCount = result => rowCount += result.rowCount;

  const updateQuery = makeUpdateQuery(updateData);
  if (updateQuery) {
    addToCount(await db.query(`UPDATE users SET ${updateQuery} WHERE id=$1`, [id]));
  }
  const { hobbies } = updateData;
  if (hobbies instanceof Array) {
    addToCount(await deleteHobbies(id));
    if (hobbies.length > 0) {
      addToCount(await insertHobbies(id, hobbies));
    }
  }
  return rowCount;
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
  await db.query('DELETE FROM users WHERE id=$1', [userId]);
}

function parseRows(rows) {
  return rows.map(user => ({
    ...user,
    hobbies: user.hobbies ? user.hobbies.split(',') : []
  }));
}

async function getUsersByQuery(queryObj) {
  const [whereQuery, values] = makeWhereQuery(queryObj);
  const fullWhereQuery = whereQuery ? `WHERE ${whereQuery}` : '';

  // The View uses PostgresSQL's STRING_AGG, which concats the string values by delimiter.
  // In Oracle SQL it's called list_agg
  const fullQuery = `SELECT * FROM users_view ${fullWhereQuery}`;
  const result = await db.query(fullQuery, values);
  return parseRows(result.rows);
}

async function saveFriends(id, friendIds) {
  const baseQuery = 'INSERT INTO friends (user_id1, user_id2) VALUES ';
  const valuesQuery = flatMap(friendIds,
    friendId => [`(${id},${friendId})`, `(${friendId},${id})`]
  ).join(',');
  const query = baseQuery + valuesQuery;
  await db.query(query);
}

async function getFriendsById(id) {
  const query = `
     SELECT u.*
     FROM users_view u 
     JOIN friends f ON u.id=f.user_id2 
     WHERE f.user_id1=$1
  `;

  const result = await db.query(query,[id]);
  return parseRows(result.rows);
}

async function clearTables() {
  await db.query('TRUNCATE TABLE users CASCADE');
}

async function getFriendSuggestions(id) {
  const query = `
     WITH user_friends AS (
       SELECT user_id2 AS id FROM friends WHERE user_id1=$1
     ), user_friends_friends AS (
       SELECT f.user_id2 as id
       FROM user_friends uf 
       JOIN friends f ON uf.id = f.user_id1
       WHERE f.user_id2 NOT IN (SELECT id FROM user_friends)
     )
     
     SELECT u.*
     FROM users_view u 
     JOIN user_friends_friends uff ON u.id=uff.id 
     WHERE u.id!=$1
  `;
  const result = await db.query(query, [id]);
  return parseRows(result.rows);
}

// Returns array containing [user, matches]
// matches is an array of users
async function getUnsortedUserMatches(id) {
  const user = await getUserById(id);
  if (!user) return [undefined, []];

  const { interested_in, gender } = user;
  const query = `
     SELECT *
     FROM users_view 
     WHERE 
        id != $1 
        AND gender = $2 
        AND relationship_status = $3 
        AND interested_in = $4
  `;
  const result = await db.query(query, [id, interested_in, 'single', gender]);
  const matches = parseRows(result.rows);
  return [user, matches];
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
  updateUser,
  getFriendSuggestions,
  userIdExists,
  getUnsortedUserMatches
};

