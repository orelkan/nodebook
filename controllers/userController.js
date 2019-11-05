const dal = require('../dal');
const asyncHandler = require('express-async-handler');

async function createUser(req, res) {
  const userData = req.body;
  const connection = await dal.connect();
  try {
    await dal.createUser(connection, userData);
    res.status(201).end();
  } finally {
    await connection.close();
  }
}

async function getUserById(req, res) {
  const { id } = req.params;
  const connection = await dal.connect();
  const userData = await dal.getUserById(connection, id);
  await connection.close();
  res.status(200).send(userData);
}

module.exports = {
  createUser: asyncHandler(createUser),
  getUserById: asyncHandler(getUserById)
};