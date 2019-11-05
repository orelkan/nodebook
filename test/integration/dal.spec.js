const dal = require('../../dal');

describe('Oracle Data Access Layer Tests', () => {

  it('Can connect and close connection', async () => {
    const connection = await dal.connect();
    await connection.close();
  });

});