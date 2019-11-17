const request = require('supertest');
const app = require('../../index');
const server = request(app);
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const { expect } = chai;
const { sortBy, omit } = require('lodash');
const { CREATED, OK, NOT_FOUND, CONFLICT, BAD_REQUEST } = require('http-status');
const dal = require('../../src/dal');
const { users } = require('../resources');

const route = '/user';
describe('User end-to-end test', function () {
  beforeEach(dal.clearTables);
  after(() => app.close());

  it('GET user/:id & POST user: Can get and create user', async () => {
    const user = users[0];

    // Create
    const postResult = await server.post(route).send(user).expect(CREATED);
    const userId = parseInt(postResult.text);
    expect(userId).to.be.a('number');

    // Get
    const getResult = await server.get(`${route}/${userId}`).expect(OK);
    const expected = { ...user, id: userId };
    expect(getResult.body).to.deep.equal(expected);
  });

  describe('GET user/:id', () => {
    it('Will get Not Found for an unknown id', () => {
      return server.get(`${route}/3`).expect(NOT_FOUND);
    });
  });

  describe('DELETE user/:id', () => {
    it('Can delete a created user', async () => {
      const user = users[0];

      // Create
      const postResult = await server.post(route).send(user).expect(CREATED);
      const userId = parseInt(postResult.text);
      expect(userId).to.be.a('number');

      // Get
      await server.get(`${route}/${userId}`).expect(OK);

      await server.delete(`${route}/${userId}`).expect(OK);
      await server.get(`${route}/${userId}`).expect(NOT_FOUND);
    });
  });

  describe('POST user', () => {
    it('Will give CREATED status for creating valid user', () => {
      return server.post(route).send(users[0]).expect(CREATED);
    });

    it('Will give CONFLICT error for creating the same user twice', async () => {
      const user = users[0];

      await server.post(route).send(user).expect(CREATED);
      await server.post(route).send(user).expect(CONFLICT);
    });

    it('Will give bad request error for missing data', async () => {
      await server.post(route).send({
        first_name: 'Test',
        last_name: 'User'
      }).expect(BAD_REQUEST);
    });

    it('Will give bad request error for extra invalid data', async () => {
      await server.post(route).send({
        ...users[0], invalid: 'invalid data'
      }).expect(BAD_REQUEST);
    });
  });

  describe('GET users', () => {
    const usersRoute = '/users';

    const sortUsers = users => sortBy(users, 'phone_number');

    it('Will get an empty array when no users', async () => {
      const { body } = await server.get(usersRoute).expect(OK);
      expect(body).to.deep.equal([]);
    });

    it('Will get all users in db', async () => {
      await dal.createUsers(users);
      const { body: resultUsers } = await server.get(usersRoute).expect(OK);

      expect(resultUsers).to.have.length(users.length);
      resultUsers.forEach(resultUser => expect(resultUser).to.have.property('id'));

      const resultUsersWithoutId = resultUsers.map(user => omit(user, 'id'));
      expect(sortUsers(resultUsersWithoutId)).to.deep.equal(sortUsers(users));
    });

    it('Will only get users with last name Cohen', async () => {
      await dal.createUsers(users);
      const { body: resultUsers } = await server.get(usersRoute)
        .query({ last_name: 'Cohen' }).expect(OK);

      const cohenUsers = users.filter(user => user.last_name === 'Cohen');

      expect(resultUsers).to.have.length(cohenUsers.length);
      resultUsers.forEach(resultUser => expect(resultUser).to.have.property('id'));

      const resultUsersWithoutId = resultUsers.map(user => omit(user, 'id'));
      expect(sortUsers(resultUsersWithoutId)).to.deep.equal(sortUsers(cohenUsers));
    });
    
    it('Will only get Orel Kanditan by name', async () => {
      await dal.createUsers(users);
      const { body: resultUsers } = 
        await server.get(usersRoute)
          .query({ first_name: 'Orel', last_name: 'Kanditan' })
          .expect(OK);

      const [orel] = users.filter(user => user.last_name === 'Kanditan');

      expect(resultUsers).to.have.length(1);
      const resultUser = resultUsers[0];
      expect(resultUser).to.have.property('id');
      expect(omit(resultUser, 'id')).to.deep.equal(orel);
    });

    it('Will only get Orel Kanditan by location', async () => {
      await dal.createUsers(users);
      const { body: resultUsers } =
        await server.get(usersRoute)
          .query({ location: { x: 30.5, y: 32.6 }, gender: 'male' })
          .expect(OK);

      const [orel] = users.filter(user => user.last_name === 'Kanditan');

      expect(resultUsers).to.have.length(1);
      const resultUser = resultUsers[0];
      expect(resultUser).to.have.property('id');
      expect(omit(resultUser, 'id')).to.deep.equal(orel);
    });

    it('Will give bad request status code for invalid query param', async () => {
      await server.get(usersRoute).query({ invalid_param: 'Hi' }).expect(BAD_REQUEST);
    });

    it('Will give bad request status code for invalid enum query param', async () => {
      await server.get(usersRoute).query({ gender: 'mal' }).expect(BAD_REQUEST);
    });
  });
});