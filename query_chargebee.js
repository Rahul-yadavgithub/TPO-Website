const mongoose = require('mongoose');
const Company = require('./backend/src/models/Company').default;
require('dotenv').config({ path: './backend/.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const c = await Company.findOne({ companyName: /Chargebee/i }).lean();
  console.log(JSON.stringify(c, null, 2));
  process.exit(0);
}
run();
