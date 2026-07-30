const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const docs = await db.collection('companies').find({ assignedBranch: 'MNC' }).limit(5).toArray();
  console.log('Docs:', docs.map(d => ({ name: d.companyName, assignedBranchId: d.assignedBranchId })));
  process.exit(0);
});
