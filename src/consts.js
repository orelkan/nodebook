exports.tableNames = {
  USERS: 'users',
  HOBBIES: 'hobbies',
  FRIENDS: 'friends'
};

exports.validUserKeys = [
  'first_name', 'last_name', 'phone_number', 'location', 'gender',
  'relationship_status', 'interested_in', 'hobbies', 'friends'
];

exports.validCreateUserKeys = exports.validUserKeys.filter(key => key !== 'friends');