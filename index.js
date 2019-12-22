const express = require('express');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || '5000';

app.use(express.json());
app.use(morgan('dev'));

app.use('/api', require('./src/routes/userRouter'));
app.use(require('./src/errorHandler'));

app.get('/isAlive', (req, res) => {
  res.send('Nodebook server');
});

module.exports = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Listening to requests on http://localhost:${port}`);
});