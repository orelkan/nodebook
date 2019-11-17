const controller = require('../controllers/userController');
const router = require('express-promise-router')();

router.get('/user/:id', controller.getUserById);
router.delete('/user/:id', controller.deleteUserById);
router.post('/user', controller.createUser);
router.get('/users', controller.getUsersByQuery);

module.exports = router;
