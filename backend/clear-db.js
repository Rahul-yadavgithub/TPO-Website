require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    // Clear companies
    const result = await mongoose.connection.db.collection('companies').deleteMany({});
    console.log(`Deleted ${result.deletedCount} companies from the current year database.`);

    // Also clear HrContacts as they are linked to companies
    const hrResult = await mongoose.connection.db.collection('hrcontacts').deleteMany({});
    console.log(`Deleted ${hrResult.deletedCount} hr contacts.`);
    
    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
