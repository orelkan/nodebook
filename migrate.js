const { db } = require('./src/models');
const fs = require('fs');
const path = require('path');
const sqlFileNames = ['gender', 'relationship_status', 'users', 'hobbies', 'friends'];

async function migrate() {
  for (let fileName of sqlFileNames) {
    const filePath = path.join(__dirname, `sql/${fileName}.sql`);
    const query = fs.readFileSync(filePath).toString();
    await db.query(query);
  }
  // eslint-disable-next-line no-console
  console.log('Migrate complete');
}

// eslint-disable-next-line no-console
migrate().catch(console.error);

