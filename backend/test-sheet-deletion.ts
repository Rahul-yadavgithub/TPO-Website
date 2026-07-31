import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { googleSheetService } from './src/services/google/GoogleSheetProvider';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jobfinder');
  console.log('Connected to DB');
  
  const Settings = (await import('./src/models/Settings')).default;
  const settings = await Settings.findOne();
  if (!settings) {
    console.log('No settings');
    process.exit(1);
  }
  
  const sheetId = settings.currentAcademicYearSheetId;
  const branchName = 'MNC'; // Example from screenshot
  
  const rows = await googleSheetService.fetchInboundData(sheetId, branchName);
  console.log(`Fetched ${rows.length} rows from ${branchName}`);
  
  const targetCompany = 'Rippling'; // Example from screenshot
  const normalizedTargetName = targetCompany?.toLowerCase().replace(/[^a-z0-9]/g, '');
  console.log(`Target Normalized: ${normalizedTargetName}`);

  let rowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const rowCompanyName = rows[i][0]?.trim();
    const hiddenId = rows[i][7]?.trim();
    const normalizedRowName = rowCompanyName?.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (i < 10) {
        console.log(`Row ${i}: Name="${rowCompanyName}", NormName="${normalizedRowName}", HiddenId="${hiddenId}"`);
    }

    if (normalizedRowName === normalizedTargetName) {
      console.log(`MATCH FOUND AT ROW ${i} just by name!`);
    }

    if (hiddenId === 'fakeid' || normalizedRowName === normalizedTargetName) {
      rowIndex = i;
      console.log(`=> SELECTED ROW ${i} for deletion`);
      break;
    }
  }

  if (rowIndex === -1) {
    console.log(`COULD NOT FIND ${normalizedTargetName} in the sheet!`);
  } else {
    // Try to actually call deleteCompanyFromSheet
    console.log('Now calling deleteCompanyFromSheet to see what it does...');
    const result = await googleSheetService.deleteCompanyFromSheet('fakeid', 'Rippling', 'MNC');
    console.log('deleteCompanyFromSheet result:', result);
  }

  process.exit(0);
}

run().catch(console.error);
