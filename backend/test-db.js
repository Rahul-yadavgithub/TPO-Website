const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/jobfinder-tpo').then(async () => {
  const db = mongoose.connection.db;
  const companies = await db.collection('companies').find({ companyName: /Rippling/i }).toArray();
  console.log('Company:', companies);
  process.exit(0);
});
