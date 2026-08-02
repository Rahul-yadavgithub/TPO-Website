import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const PreviousCompanySchema = new mongoose.Schema({
  companyName: String,
  createdAt: Date
}, { collection: 'PreviousCompany' });
const PreviousCompany = mongoose.model('PreviousCompany', PreviousCompanySchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jobfinder');
  
  const page1 = await PreviousCompany.find({}).select('companyName').skip(0).limit(5).sort({ createdAt: -1, _id: 1 });
  console.log("Page 1:");
  page1.forEach(c => console.log(c.companyName, c._id));
  
  const page2 = await PreviousCompany.find({}).select('companyName').skip(5).limit(5).sort({ createdAt: -1, _id: 1 });
  console.log("\nPage 2:");
  page2.forEach(c => console.log(c.companyName, c._id));
  
  process.exit(0);
}
run();
