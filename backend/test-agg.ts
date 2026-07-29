import mongoose from 'mongoose';
import Company from './src/models/Company';

mongoose.connect('mongodb+srv://rahulyadavdakshana_db_user:XGwtLRtBXkVd4ixV@cluster0.zw9ieds.mongodb.net/TPR-Data').then(async () => {
  try {
    const query = { assignedBranch: { $exists: true, $ne: null } };
    const skip = 0;
    const limit = 20;
    
    console.log("Running aggregate...");
    const companies = await Company.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'hrcontacts',
          localField: '_id',
          foreignField: 'company_id',
          as: 'hr_contacts'
        }
      },
      {
        $lookup: {
          from: 'contactlogs',
          localField: '_id',
          foreignField: 'company_id',
          as: 'contact_logs'
        }
      }
    ]);
    const total = await Company.countDocuments(query);
    console.log(`Found ${companies.length} companies, total: ${total}`);
  } catch (error) {
    console.error("Aggregation error:", error);
  } finally {
    mongoose.disconnect();
  }
});
