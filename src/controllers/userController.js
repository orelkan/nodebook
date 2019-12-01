const { CREATED, OK, NOT_FOUND, CONFLICT, BAD_REQUEST } = require('http-status');
const { isEqual, isEmpty } = require('lodash');
const dal = require('../dal');
const logger = require('../logger');
const { sortUserMatches, isSubsetOf } = require('./userLogic');
const { validCreateUserKeys } = require('../consts');

async function createUser(req, res) {
  const userData = req.body;
  if (createDataIsInvalid(userData)) {
    return respondDataKeysAreInvalid(res);
  } try {
    const id = await dal.createUser(userData);
    res.status(CREATED).send(id.toString());
  } catch (err) {
    if (err.constraint) {
      logger.info(err.message);
      res.status(CONFLICT).end();
    }
    else throw err;
  }
}

const createDataIsInvalid = data =>
  !isEqual(Object.keys(data).sort(), validCreateUserKeys.sort());

const updateDataIsInvalid = data =>
  isEmpty(data) || !isSubsetOf(validCreateUserKeys, Object.keys(data));

const getUsersQueryIsInvalid = data =>
  !isSubsetOf(validCreateUserKeys, Object.keys(data));

const respondDataKeysAreInvalid = res => res.status(BAD_REQUEST).send({
  message: 'Some keys are invalid. Make sure to send exactly the right keys',
  validCreateUserKeys
});

async function updateUser(req, res) {
  const { id } = req.params;
  const updateData = req.body;
  if (updateDataIsInvalid(updateData)) {
    return respondDataKeysAreInvalid(res);
  }
  const result = await dal.updateUser(id, updateData);
  logger.info(`Update user ${id}: ${result} rows affected`);
  if (result) res.status(OK).end();
  else res.status(NOT_FOUND).end();
}

async function getUserById(req, res) {
  const { id } = req.params;
  const userData = await dal.getUserById(id);

  if (userData) res.status(OK).send(userData);
  else res.status(NOT_FOUND).end();
}

async function deleteUserById(req, res) {
  const { id } = req.params;
  await dal.deleteUserById(id);
  res.status(OK).end();
}

async function getUsersByQuery(req, res) {
  if (getUsersQueryIsInvalid(req.query)) {
    return respondDataKeysAreInvalid(res);
  }
  res.send(await dal.getUsersByQuery(req.query));
}

async function postFriends(req, res) {
  const { id: idParam } = req.params;
  const id = parseInt(idParam);
  const friendIds = req.body;
  if (!id || !friendIds || !(friendIds instanceof Array) || friendIds.includes(id)) {
    return res.status(BAD_REQUEST).end();
  }
  try {
    await dal.saveFriends(id, friendIds);
    res.status(CREATED).end();
  } catch (err) {
    if (err.constraint) {
      logger.info(err);
      // Constraint that checks this row is unique in the Friends table
      if (err.constraint.includes('uniq')) {
        res.status(CONFLICT).end();
      }
      // fk - Foreign key constraint that checks the key exists in Users
      else if (err.constraint.includes('fk')) {
        res.status(NOT_FOUND).end();
      }
    }
    else throw err;
  }
}

async function getFriends(req, res) {
  const { id } = req.params;
  const userExists = await dal.userIdExists(id);
  if (!userExists) return res.status(NOT_FOUND).end();

  res.send(await dal.getFriendsById(id));
}

async function deleteUsers(req, res) {
  await dal.clearTables();
  res.status(OK).end();
}

async function getFriendSuggestions(req, res) {
  const { id } = req.params;
  const userExists = await dal.userIdExists(id);
  if (!userExists) return res.status(NOT_FOUND).end();

  const suggestions = await dal.getFriendSuggestions(id);
  res.send(suggestions);
}

async function getUserMatches(req, res) {
  const { id } = req.params;

  const [user, matches] = await dal.getUnsortedUserMatches(id);
  if (!user) return res.status(NOT_FOUND).end();

  const { first_name, last_name } = user;
  logger.info(`Matching ${id} ${first_name} ${last_name}`);
  res.send(sortUserMatches(user, matches));
}

module.exports = {
  createUser,
  getUserById,
  deleteUserById,
  deleteUsers,
  getUserMatches,
  getUsersByQuery,
  postFriends,
  getFriends,
  updateUser,
  getFriendSuggestions
};