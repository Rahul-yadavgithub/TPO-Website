const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/JobFinder');
const PreviousCompany = mongoose.model('PreviousCompany', new mongoose.Schema({}, { strict: false }));
async function run() {
  const c = await PreviousCompany.findOne({ "extraData.Drive Date": { $exists: true } });
  if (c) console.log(c.extraData);
  else console.log('not found');
  
  const c2 = await PreviousCompany.findOne();
  console.log('Sample keys:', Object.keys(c2?.extraData || {}));
  process.exit(0);
}
run();
