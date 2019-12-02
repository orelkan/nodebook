const request = require('supertest');
const { sortBy, omit } = require('lodash');
const { CREATED, OK, NOT_FOUND, CONFLICT, BAD_REQUEST } = require('http-status');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const app = require('../../index');
const dal = require('../../src/dal');
const { users } = require('../resources');
const server = request(app);
chai.use(chaiAsPromised);
const { expect } = chai;

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

  const withSortedHobbies = user => ({ ...user, hobbies: user.hobbies.sort() });

  // Omits id from usersResult and compares them to expected unordered
  // Also sorts the inner hobbies arrays to compare these unordered
  function assertResultUsersEqualsExpected(resultUsers, expectedUsers) {
    expect(resultUsers).to.have.length(expectedUsers.length);
    resultUsers.forEach(resultUser => expect(resultUser).to.have.property('id'));

    const resultUsersWithoutId = resultUsers.map(user => withSortedHobbies(omit(user, 'id')));
    const sortedExpectedWithSortedHobbies = sortUsers(expectedUsers.map(withSortedHobbies));
    expect(sortUsers(resultUsersWithoutId)).to.deep.equal(sortedExpectedWithSortedHobbies);
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

    it('Will get a user with empty hobbies', async () => {
      const user = {
        ...users[0], hobbies: []
      };
      const userId = await createUser(user);
      const { body: resultUser } = await server.get(`${route}/${userId}`).expect(OK);
      const expected = { ...user, id: userId };
      expect(resultUser).to.deep.equal(expected);
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

    it('Will give CREATED status for creating a user with empty hobbies', () => {
      return server.post(route).send({
        ...users[0], hobbies: []
      }).expect(CREATED);
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

  describe('DELETE users', () => {
    it('Will give status OK', async () => {
      await server.delete('/users').expect(OK);
    });

    it('Will delete all users', async () => {
      const ids = await createUsers(users);
      await Promise.all(ids.map(id => {
        return server.get(`${route}/${id}`).expect(OK);
      }));

      await server.delete('/users').expect(OK);

      await Promise.all(ids.map(id => {
        return server.get(`${route}/${id}`).expect(NOT_FOUND);
      }));
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

    it('Will try to put empty hobbies array', async () => {
      const id = await createUser(users[0]);
      const updateData = { hobbies: [] };
      await server.patch(`${route}/${id}`).send(updateData).expect(OK);

      const updatedUser = (await server.get(`${route}/${id}`).expect(OK)).body;
      expect(updatedUser).to.deep.equal({
        id, ...users[0], ...updateData
      });
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

      const updatedUser = (await server.get(`${route}/${id}`).expect(OK)).body;
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

    it('Will get an empty array for user that has no friends', async () => {
      const id = await createUser(users[0]);
      return server
        .get(`${route}/${id}/friends`)
        .expect(OK, []);
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

  describe('GET user/:id/suggestions', () => {
    it('Will give not found error when user doesnt exist', async () => {
      await server.get(`${route}/12/suggestions`).expect(NOT_FOUND);
    });

    it('Will give an empty array when user has no friends', async () => {
      const id = await createUser(users[0]);
      await server.get(`${route}/${id}/suggestions`).expect(OK, []);
    });

    it('Will give 1 correct suggestion', async () => {
      const [user1, user2, user3] = users;
      const [id1, id2, id3] = await createUsers([user1, user2, user3]);

      await server.post(`${route}/${id1}/friends`).send([id2]).expect(CREATED);
      await server.post(`${route}/${id2}/friends`).send([id3]).expect(CREATED);

      const result = await server.get(`${route}/${id1}/suggestions`).expect(OK);
      expect(result.body).to.deep.equal([{ ...user3, id: id3 }]);
    });

    it('Will give 1 correct suggestion without repetition', async () => {
      const [user1, user2, user3, user4] = users;
      const [id1, id2, id3, id4] = await createUsers([user1, user2, user3, user4]);

      // Both 2 and 4 are friends with 3, but I expect to only receive it once
      await server.post(`${route}/${id1}/friends`).send([id2]).expect(CREATED);
      await server.post(`${route}/${id2}/friends`).send([id3]).expect(CREATED);
      await server.post(`${route}/${id4}/friends`).send([id3]).expect(CREATED);

      const result = await server.get(`${route}/${id1}/suggestions`).expect(OK);
      assertResultUsersEqualsExpected(result.body, [user3]);
    });

    it('Will give several correct suggestions', async () => {
      const [user1, user2, user3, user4] = users;
      const [id1, id2, id3, id4] = await createUsers([user1, user2, user3, user4]);

      // Now 2 and 4 are also friends. I expect to get 4 as well
      await server.post(`${route}/${id1}/friends`).send([id2]).expect(CREATED);
      await server.post(`${route}/${id2}/friends`).send([id3]).expect(CREATED);
      await server.post(`${route}/${id4}/friends`).send([id3]).expect(CREATED);
      await server.post(`${route}/${id2}/friends`).send([id4]).expect(CREATED);

      const result = await server.get(`${route}/${id1}/suggestions`).expect(OK);
      assertResultUsersEqualsExpected(result.body, [user3, user4]);
    });

  });

  describe('GET user/:id/matches', () => {
    it('Will give not found error when user doesnt exist', async () => {
      await server.get(`${route}/12/matches`).expect(NOT_FOUND);
    });

    it('Will give no matches when only 1 user', async () => {
      const id = await createUser(users[0]);
      await server.get(`${route}/${id}/matches`).expect(OK, []);
    });

    it('Will give 1 match', async () => {
      // These 2 can match
      const [user1, user2] = [users[0], users[2]];
      const [id1, id2] = await createUsers([user1, user2]);

      const result1 = await server.get(`${route}/${id1}/matches`).expect(OK);
      const result2 = await server.get(`${route}/${id2}/matches`).expect(OK);
      assertResultUsersEqualsExpected(result1.body, [user2]);
      assertResultUsersEqualsExpected(result2.body, [user1]);
    });

    it('Will give several matches', async () => {
      const ids = await createUsers(users);
      const targetId = ids[2];
      const result = await server.get(`${route}/${targetId}/matches`).expect(OK);

      // In that order
      const expected = [0, 3, 4].map(i => ({
        ...users[i],
        id: ids[i]
      }));

      expect(result.body.map(withSortedHobbies))
        .to.deep.equal(expected.map(withSortedHobbies));
    });
  });
});