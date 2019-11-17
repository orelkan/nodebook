const dal = require('../../dal');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const { expect } = chai;
const { users } = require('../resources');

describe('SQL Data Access Layer Tests', function () {
  beforeEach(dal.clearTables);

  const validUser = users[0];

  it('Can connect and close connection', async () => {
    const connection = await dal.connect();
    connection.release();
  });
  
  describe('getUserById', () => {
    it('Will get an undefined result for user that doesnt exist', async () => {
      await expect(dal.getUserById('20')).to.eventually.be.undefined;
    });

    it('Will get a user that was just inserted', async () => {
      const id = await dal.createUser(validUser);
      const result = await dal.getUserById(id);
      const expected = { ...validUser, id };
      expect(result).to.deep.equal(expected);
    });
  });

  describe('createUser', () => {
    it('Can create a user and receive its id', async () => {
      const result = await dal.createUser(validUser);
      expect(result).to.be.a('number');
    });

    it('Rejects when creating a user with missing data', async () => {
      const user = {
        first_name: 'Orel',
        phone_number: '0542938921',
        location: [30.5, 32.6],
        relationship_status: 'single',
        interested_in: 'female'
      };
      await expect(dal.createUser(user)).to.be.rejected;
    });
  });

  describe('deleteUserById', () => {
    it('Can delete a user', async () => {
      const id = await dal.createUser(validUser);
      await expect(dal.getUserById(id)).to.eventually.be.not.empty;
      await dal.deleteUserById(id);
      await expect(dal.getUserById(id)).to.eventually.be.undefined;
    });
  });
});