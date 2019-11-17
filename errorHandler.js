const logger = require('./logger');
const { INTERNAL_SERVER_ERROR, BAD_REQUEST } = require('http-status');

// Error handler function in Express is defined by getting 4 parameters
module.exports = function (err, req, res, next) {
  if (err.message && err.message.includes('invalid input') ||
      err.message.includes('does not exist')) {
    logger.info(err);
    res.status(BAD_REQUEST).send({ message: err.message });
  } else {
    logger.error(err);
    const status = err.status || err.statusCode || INTERNAL_SERVER_ERROR;
    res.status(status).end();
  }
};