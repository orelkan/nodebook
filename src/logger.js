const { createLogger, format, transports } = require('winston');

module.exports = createLogger({
  transports: [
    new transports.Console()
  ],
  format: format.combine(
    format.colorize(),
    format.simple()
  ),
  // defaultMeta: { service: 'nodebook-server' },
});