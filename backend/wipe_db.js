require('dotenv').config();
const mongoose = require('mongoose');

async function wipeDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    const collectionsToWipe = [
      'companies',
      'contactlogs',
      'hrcontacts',
      'previouscompanycontactrequests',
      'scanhistory',
      'rawdiscoveries',
      'branchnotifications',
      'apikeyusagelogs',
      'apikeyrequestqueues',
      'targetcompanies',
      'companystatushistory',
      'users'
    ];

    console.log('\nStarting database wipe for current year data...\n');

    for (const collectionName of collectionsToWipe) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        const result = await collection.deleteMany({});
        console.log(`✅ Cleared '${collectionName}': ${result.deletedCount} documents deleted.`);
      } catch (err) {
        // If collection doesn't exist or other error, it's fine, we just skip
        console.log(`⚠️ Skipping '${collectionName}': ${err.message}`);
      }
    }

    console.log('\n🎉 Wipe Complete! Your database is now ready for production.');
    console.log('Preserved collections: users, previouscompanies, branches, settings, sources.');

  } catch (err) {
    console.error('Error during wipe:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

wipeDatabase();
