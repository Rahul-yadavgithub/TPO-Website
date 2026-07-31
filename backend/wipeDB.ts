import mongoose from 'mongoose';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const collectionsToWipe = [
  'users',
  'companies',
  'hrcontacts',
  'companytransferrequests'
];

async function wipeDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobfinder';
    await mongoose.connect(mongoUri);
    console.log(`Connected to Database: ${mongoUri}`);

    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('Database connection failed');
    }
    
    // We do NOT wipe:
    // - previouscompanies (Past Year Company Database)
    // - branches (Master configuration for branches)
    // - settings (App configuration)

    for (const collectionName of collectionsToWipe) {
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length > 0) {
        await db.dropCollection(collectionName);
        console.log(`✅ Successfully dropped collection: ${collectionName}`);
      } else {
        console.log(`ℹ️ Collection ${collectionName} does not exist, skipping.`);
      }
    }

    console.log('\n🎉 Database Wipe Complete! All users, active companies, and transfer requests have been removed.');
    console.log('Past Year Companies, Branches, and Settings have been PRESERVED.');
    console.log('You will need to register a new account to access the portal.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error wiping database:', error);
    process.exit(1);
  }
}

wipeDatabase();
