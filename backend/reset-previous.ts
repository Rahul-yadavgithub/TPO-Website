import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config({ path: '/home/rahul-yadav/Documents/JobFinder/Last-TPO/backend/.env' });

const uri = process.env.MONGODB_URI;

const PreviousCompanyContactRequestSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'PreviousCompany', required: true },
  companyName: { type: String, required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNotes: { type: String }
}, { timestamps: true });

const PreviousCompanyContactRequest = mongoose.models.PreviousCompanyContactRequest || mongoose.model('PreviousCompanyContactRequest', PreviousCompanyContactRequestSchema);

const PreviousCompanySchema = new mongoose.Schema({
  companyName: String,
  contactStatus: { type: String, default: 'not_contacted' },
  contactedByBranchId: mongoose.Schema.Types.ObjectId,
  contactedByBranchName: String,
  contactedByTprName: String,
  contactedByTprEmail: String,
}, { timestamps: true, strict: false });

const PreviousCompany = mongoose.models.PreviousCompany || mongoose.model('PreviousCompany', PreviousCompanySchema);

async function run() {
  await mongoose.connect(uri!);
  
  // Delete all PreviousCompanyContactRequest
  const delRes = await PreviousCompanyContactRequest.deleteMany({});
  console.log(`Deleted ${delRes.deletedCount} PreviousCompanyContactRequests.`);
  
  // Reset all PreviousCompany records
  const updateRes = await PreviousCompany.updateMany(
    { contactStatus: { $ne: 'not_contacted' } },
    { 
      $set: { contactStatus: 'not_contacted' },
      $unset: { 
        contactedByBranchId: 1, 
        contactedByBranchName: 1, 
        contactedByTprName: 1, 
        contactedByTprEmail: 1 
      }
    }
  );
  console.log(`Reset ${updateRes.modifiedCount} PreviousCompany records back to not_contacted.`);
  
  await mongoose.disconnect();
}
run();
