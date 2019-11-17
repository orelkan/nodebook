const dal = require('../dal');
const logger = require('../logger');
const { CREATED, OK, NOT_FOUND, CONFLICT, BAD_REQUEST } = require('http-status');
const { validCreateUserKeys } = require('../consts');
const { isEqual } = require('lodash');

async function createUser(req, res) {
  const userData = req.body;
  if (!isEqual(Object.keys(userData).sort(), validCreateUserKeys.sort())) {
    return res.status(BAD_REQUEST).send({
      message: 'Some keys are invalid. Make sure to send exactly the right keys',
      validCreateUserKeys }
    );
  }
  try {
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
  const result = await dal.getUsersByQuery(req.query);
  res.send(result);
}

module.exports = {
  createUser,  getUserById, deleteUserById, getUsersByQuery
};