const express = require('express');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || '5000';

app.use(express.json());
app.use(morgan('dev'));

app.use('/', require('./routes/userRouter'));
app.use(require('./errorHandler'));

app.get('/', (req, res) => {
  res.status(200).send('Nodebook server');
});

module.exports = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Listening to requests on http://localhost:${port}`);
});