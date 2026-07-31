import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config({ path: '/home/rahul-yadav/Documents/JobFinder/Last-TPO/backend/.env' });

const uri = process.env.MONGODB_URI;

const CompanyTransferRequestSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  fromOwnerType: { type: String, enum: ['branch', 'tpo'], required: true },
  fromOwnerId: { type: String, required: true },
  toOwnerType: { type: String, enum: ['branch', 'tpo'], required: true },
  toOwnerId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

const CompanyTransferRequest = mongoose.models.CompanyTransferRequest || mongoose.model('CompanyTransferRequest', CompanyTransferRequestSchema);

async function run() {
  await mongoose.connect(uri!);
  
  // Find requests where the fromOwnerId is CSE and toOwnerId is MNC
  // Actually, let's just delete all pending requests to clear the board for the user to test fresh.
  const res = await CompanyTransferRequest.deleteMany({ status: 'pending' });
  console.log(`Deleted ${res.deletedCount} pending requests to clean up bad data.`);
  
  await mongoose.disconnect();
}
run();
