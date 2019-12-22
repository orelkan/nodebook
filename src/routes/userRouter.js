const controller = require('../controllers/userController');
const router = require('express-promise-router')();

router.get('/user/:id/friends', controller.getFriends);
router.post('/user/:id/friends', controller.postFriends);
router.delete('/user/:id/friends', controller.deleteFriends);
router.get('/user/:id/suggestions', controller.getFriendSuggestions);
router.get('/user/:id/matches', controller.getUserMatches);
router.get('/user/:id', controller.getUserById);
router.delete('/user/:id', controller.deleteUserById);
router.patch('/user/:id', controller.updateUser);
router.post('/user', controller.createUser);
router.delete('/users', controller.deleteUsers);
router.get('/users', controller.getUsersByQuery);

module.exports = router;
