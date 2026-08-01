import mongoose from 'mongoose';
import Company from './src/models/Company';
import ExternalSnapshot from './src/models/ExternalSnapshot';
import { AggregationService } from './src/services/aggregation/application/AggregationService';
import { MongoCompanyRepository } from './src/services/company/repositories/MongoCompanyRepository';
import { MongoExternalSnapshotRepository } from './src/services/aggregation/repositories/MongoExternalSnapshotRepository';

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/jobfinder');
  
  // 1. Create a dummy company
  const company = new Company({
    companyName: 'Test Aggregation Corp',
    normalizedName: 'testaggregationcorp',
    website: 'http://test.com',
    source: {
      platform: 'MANUAL',
      sourceUrl: 'MANUAL'
    }
  });
  await company.save();
  
  // 2. Create a dummy snapshot
  const snapshot = new ExternalSnapshot({
    normalizedName: 'testaggregationcorp',
    companyName: 'Test Aggregation Corp Global',
    fundingStage: 'Series B',
    placementScore: 99
  });
  await snapshot.save();
  
  // 3. Test Aggregation Service
  const companyRepo = new MongoCompanyRepository();
  const snapshotRepo = new MongoExternalSnapshotRepository();
  const aggregationService = new AggregationService(companyRepo, snapshotRepo);
  
  const merged = await aggregationService.getCompanyProfile(company._id.toString());
  
  console.log('Merged Profile:');
  console.log(JSON.stringify(merged, null, 2));
  
  // 4. Cleanup
  await Company.deleteOne({ _id: company._id });
  await ExternalSnapshot.deleteOne({ _id: snapshot._id });
  
  await mongoose.disconnect();
}

run().catch(console.error);
