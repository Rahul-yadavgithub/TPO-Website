import mongoose from 'mongoose';
import Company from './src/models/Company';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const c = await Company.findOne({ companyName: /Chargebee/i }).lean();
  console.log(JSON.stringify(c, null, 2));
  process.exit(0);
}
run();
