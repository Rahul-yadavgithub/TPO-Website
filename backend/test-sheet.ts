import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { googleSheetService } from './src/services/google/GoogleSheetProvider';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jobfinder');
  console.log('Connected to DB');
  
  // We need to test why deleteCompanyFromSheet fails
  // Let's pass a dummy or specific company ID
  // Actually let's just fetch the rows from the sheet and see what is in column 7
  const Settings = (await import('./src/models/Settings')).default;
  const settings = await Settings.findOne();
  
  const sheetId = settings.currentAcademicYearSheetId;
  const branchName = 'CSE'; // example
  console.log('Sheet ID:', sheetId);
  
  const rows = await googleSheetService.fetchInboundData(sheetId, branchName);
  console.log(`Fetched ${rows.length} rows from ${branchName}`);
  
  if (rows.length > 0) {
    console.log('Header row (indices):');
    rows[0].forEach((col, idx) => console.log(`${idx}: ${col}`));
    
    if (rows.length > 1) {
      console.log('First data row:');
      rows[1].forEach((col, idx) => console.log(`${idx}: ${col}`));
    }
  }

  process.exit(0);
}

run().catch(console.error);
