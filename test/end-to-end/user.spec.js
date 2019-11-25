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
  this.timeout(10000);

  beforeEach(dal.clearTables);
  after(() => app.close());

  // Can replace with Promise.all for POST user
  async function createUsers(users) {
    return dal.createUsers(users);
  }
  const createUser = async user => (await createUsers([user]))[0];

  const sortUsers = users => sortBy(users, 'phone_number');

  // Omits id from usersResult and compares them to expected unordered
  function assertResultUsersEqualsExpected(resultUsers, expectedUsers) {
    expect(resultUsers).to.have.length(expectedUsers.length);
    resultUsers.forEach(resultUser => expect(resultUser).to.have.property('id'));

    const resultUsersWithoutId = resultUsers.map(user => omit(user, 'id'));
    expect(sortUsers(resultUsersWithoutId)).to.deep.equal(sortUsers(expectedUsers));
  }

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

    it('Will get an empty array when no users', async () => {
      const { body } = await server.get(usersRoute).expect(OK);
      expect(body).to.deep.equal([]);
    });

    it('Will get all users in db', async () => {
      await createUsers(users);
      const { body: resultUsers } = await server.get(usersRoute).expect(OK);

      assertResultUsersEqualsExpected(resultUsers, users);
    });

    it('Will only get users with last name Cohen', async () => {
      await createUsers(users);
      const { body: resultUsers } = await server.get(usersRoute)
        .query({ last_name: 'Cohen' }).expect(OK);

      const cohenUsers = users.filter(user => user.last_name === 'Cohen');

      assertResultUsersEqualsExpected(resultUsers, cohenUsers);
    });
    
    it('Will only get Orel Kanditan by name', async () => {
      await createUsers(users);
      const { body: resultUsers } = 
        await server.get(usersRoute)
          .query({ first_name: 'Orel', last_name: 'Kanditan' })
          .expect(OK);

      const [orel] = users.filter(user => user.last_name === 'Kanditan');

      assertResultUsersEqualsExpected(resultUsers, [orel]);
    });

    it('Will only get Orel Kanditan by location', async () => {
      await createUsers(users);
      const { body: resultUsers } =
        await server.get(usersRoute)
          .query({ location: { x: 30.5, y: 32.6 }, gender: 'male' })
          .expect(OK);

      const [orel] = users.filter(user => user.last_name === 'Kanditan');

      assertResultUsersEqualsExpected(resultUsers, [orel]);
    });

    it('Will give bad request status code for invalid query param', async () => {
      await server.get(usersRoute).query({ invalid_param: 'Hi' }).expect(BAD_REQUEST);
    });

    it('Will give bad request status code for invalid enum query param', async () => {
      await server.get(usersRoute).query({ gender: 'mal' }).expect(BAD_REQUEST);
    });
  });

  describe('PATCH user/:id', () => {
    it('Will give bad request when no body', async () => {
      return server.patch(`${route}/5`).expect(BAD_REQUEST);
    });

    it('Will give bad request when invalid keys in body', async () => {
      return server.patch(`${route}/5`)
        .send({ invalid_key: 'val' }).expect(BAD_REQUEST);
    });

    it('Will give not found error for id that doesnt exist', async () => {
      return server.patch(`${route}/5`)
        .send({ first_name: 'yaniv' }).expect(NOT_FOUND);
    });

    it('Will successfully patch user', async () => {
      const id = await createUser(users[0]);
      const updateData = {
        first_name: 'not_orel',
        last_name: 'not_kanditan',
        phone_number: '5903890234',
        hobbies: ['mock hobby', 'another mock'],
        location: {
          x: 50,
          y: 60
        }
      };
      await server.patch(`${route}/${id}`).send(updateData).expect(OK);

      const updatedUser = (await server.get(`${route}/${id}`)).body;
      expect(updatedUser).to.deep.equal({
        id, ...users[0], ...updateData
      });
    });
  });

  describe('POST user/:id/friends', () => {
    it('Will give not found error for user that doesnt exist', () => {
      return server
        .post(`${route}/10/friends`)
        .send([1, 2, 3]).expect(NOT_FOUND);
    });

    it('Will give not found error for a user that exists but friend ids to add dont exist', async () => {
      const id = await dal.createUser(users[0]);
      return server
        .post(`${route}/${id}/friends`)
        .send([1, 2, 3]).expect(NOT_FOUND);
    });

    it('Will add friends successfully', async () => {
      const ids = await createUsers(users);
      const [id, ...friendsIds] = ids;
      return server
        .post(`${route}/${id}/friends`)
        .send(friendsIds).expect(CREATED);
    });

    it('Will give bad request when trying to save user as his own friend', async () => {
      const id = await createUser(users[0]);
      return server
        .post(`${route}/${id}/friends`)
        .send([id]).expect(BAD_REQUEST);
    });

    it('Will give conflict error when users already friends', async () => {
      const [user1, user2] = users;
      const [id1, id2] = await createUsers([user1, user2]);
      await server
        .post(`${route}/${id1}/friends`)
        .send([id2]).expect(CREATED);

      await server
        .post(`${route}/${id1}/friends`)
        .send([id2]).expect(CONFLICT);

      await server
        .post(`${route}/${id2}/friends`)
        .send([id1]).expect(CONFLICT);
    });
  });

  describe('GET user/:id/friends', () => {
    it('Will give not found error for user that doesnt exist', () => {
      return server
        .get(`${route}/10/friends`)
        .expect(NOT_FOUND);
    });

    it('Will post and get friends successfully', async () => {
      const ids = await createUsers(users);
      const [id, ...friendsIds] = ids;
      await server
        .post(`${route}/${id}/friends`)
        .send(friendsIds).expect(CREATED);

      const { body: friendsResult } = await server
        .get(`${route}/${id}/friends`)
        .expect(OK);

      // eslint-disable-next-line no-unused-vars
      const [_, ...friends] = users;
      assertResultUsersEqualsExpected(friendsResult, friends);
    });
  });
});