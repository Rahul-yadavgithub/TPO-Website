import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config({ path: '/home/rahul-yadav/Documents/JobFinder/Last-TPO/backend/.env' });

const uri = process.env.MONGODB_URI;

const Company = mongoose.models.Company || mongoose.model('Company', new mongoose.Schema({}, { strict: false }));
const HrContact = mongoose.models.HrContact || mongoose.model('HrContact', new mongoose.Schema({}, { strict: false }));
const ContactLog = mongoose.models.ContactLog || mongoose.model('ContactLog', new mongoose.Schema({}, { strict: false }));
const CompanyStatusHistory = mongoose.models.CompanyStatusHistory || mongoose.model('CompanyStatusHistory', new mongoose.Schema({}, { strict: false }));

async function run() {
  await mongoose.connect(uri!);
  
  const compRes = await Company.deleteMany({});
  console.log(`Deleted ${compRes.deletedCount} Company records.`);
  
  const hrRes = await HrContact.deleteMany({});
  console.log(`Deleted ${hrRes.deletedCount} HrContact records.`);
  
  const logRes = await ContactLog.deleteMany({});
  console.log(`Deleted ${logRes.deletedCount} ContactLog records.`);
  
  const histRes = await CompanyStatusHistory.deleteMany({});
  console.log(`Deleted ${histRes.deletedCount} CompanyStatusHistory records.`);
  
  await mongoose.disconnect();
}
run();
