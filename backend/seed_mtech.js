const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const branches = ['M.Tech EE', 'M.Tech CH', 'M.Tech MSE'];
  
  for (const name of branches) {
    const existing = await db.collection('branches').findOne({ name });
    if (!existing) {
      console.log('Inserting', name);
      await db.collection('branches').insertOne({
        name,
        category: 'Core',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      console.log('Exists', name);
    }
  }
  
  console.log('Done');
  process.exit(0);
});
