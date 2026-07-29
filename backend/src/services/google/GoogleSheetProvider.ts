import { google, sheets_v4 } from 'googleapis';
import Settings from '../../models/Settings';
import { ICompany } from '../../models/Company';
import HrContact from '../../models/HrContact';
import ContactLog from '../../models/ContactLog';

export class GoogleSheetProvider {
  private sheets: sheets_v4.Sheets | null = null;
  private isInitialized = false;

  private async initialize() {
    if (this.isInitialized) return;

    try {
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!clientEmail || !privateKey || clientEmail.includes('placeholder')) {
        console.warn('Google Sheets not properly configured in .env. Skipping initialization.');
        return;
      }

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Google Sheets Auth:', error);
    }
  }



  public async testConnection(sheetId: string): Promise<{ success: boolean; error?: string }> {
    await this.initialize();
    if (!this.sheets) {
      return { success: false, error: 'Google Sheets Auth is not configured properly in .env' };
    }

    try {
      const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId: sheetId });
      const sheets = spreadsheet.data.sheets || [];
      if (sheets.length === 0 || !sheets[0].properties?.title) {
        return { success: false, error: 'No worksheets found in the spreadsheet' };
      }
      
      const firstSheetName = sheets[0].properties.title;

      const appendRes = await this.sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${firstSheetName}!A:A`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['__jobfinder_test_row__']] },
      });

      const updatedRange = appendRes.data.updates?.updatedRange;
      if (updatedRange) {
        await this.sheets.spreadsheets.values.clear({
          spreadsheetId: sheetId,
          range: updatedRange,
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Google Sheets Test Error:', error.message);
      if (error.code === 403) return { success: false, error: 'Service account does not have Editor permission' };
      if (error.code === 404) return { success: false, error: 'Invalid Sheet ID or Sheet is inaccessible' };
      return { success: false, error: error.message || 'Failed to verify connection' };
    }
  }



  public async appendCompaniesToSheet(
    companies: ICompany[],
    branchName: string
  ): Promise<{ success: boolean }> {
    await this.initialize();
    if (!this.sheets) throw new Error('Google Sheets Auth not configured');

    const settings = await Settings.findOne();
    if (!settings) throw new Error('Settings not configured in DB');

    const syncBatch = async (batch: ICompany[], sheetId: string) => {
      if (batch.length === 0) return;
      if (!sheetId) throw new Error(`Target Google Sheet ID is missing.`);

      // 1. Fetch existing rows to map locations
      const existingRows = await this.fetchInboundData(sheetId, branchName);
      const companyRowMap = new Map<string, number>();
      const duplicateRowIndices: { rowIndex: number, companyId: string }[] = [];
      
      for (let i = 0; i < existingRows.length; i++) {
        const row = existingRows[i];
        if (i === 0 && row[0]?.toLowerCase().includes('company')) continue;
        
        const companyName = row[0]?.trim();
        const hiddenId = row[7]?.trim();
        let matchKey = hiddenId;
        if (!matchKey) matchKey = companyName?.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (!matchKey) continue;
        
        if (companyRowMap.has(matchKey)) {
          duplicateRowIndices.push({ rowIndex: i, companyId: matchKey });
        } else {
          companyRowMap.set(matchKey, i);
        }
      }

      const valuesToAppend: string[][] = [];
      const updates: { range: string, values: string[][] }[] = [];

      // 2. Prepare Updates and Appends for the synced batch
      for (const company of batch) {
        const hrContact = await HrContact.findOne({ company_id: company._id });
        const lastLog = await ContactLog.findOne({ company_id: company._id }).sort({ contact_date: -1 });

        let statusText = '';
        if (company.contact_outcome === 'rejected') statusText = 'REJECTED';
        else if (company.contact_outcome === 'accepted' || company.confirmation_status === 'confirmed') statusText = 'ACCEPTED';
        else if (company.contact_outcome === 'call_again') statusText = 'CALL AGAIN';

        let nextCallText = '';
        if (company.nextFollowupDate) {
          const d = company.nextFollowupDate;
          nextCallText = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
        }
        
        const rowData = [
          company.companyName,
          hrContact?.name || '',
          hrContact?.mobile || '',
          hrContact?.email || '',
          statusText,
          nextCallText,
          lastLog?.notes || company.notes || '',
          company._id.toString()
        ];

        const hiddenIdStr = company._id.toString();
        const normalizedName = company.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const existingRowIndex = companyRowMap.has(hiddenIdStr) 
          ? companyRowMap.get(hiddenIdStr) 
          : companyRowMap.get(normalizedName);

        if (existingRowIndex !== undefined) {
          // Update the first occurrence (1-based index in sheets)
          updates.push({
            range: `${branchName}!A${existingRowIndex + 1}:H${existingRowIndex + 1}`,
            values: [rowData]
          });
        } else {
          // Append entirely new company
          valuesToAppend.push(rowData);
        }
      }

      // 3. Mark duplicate rows in the sheet with a red warning
      for (const dup of duplicateRowIndices) {
         const existingDescription = existingRows[dup.rowIndex][6] || '';
         if (!existingDescription.includes('🔴 DUPLICATE')) {
           updates.push({
             range: `${branchName}!G${dup.rowIndex + 1}`,
             values: [[`🔴 DUPLICATE PLEASE DELETE - ${existingDescription}`]]
           });
         }
      }

      // 4. Execute updates using batchUpdate
      if (updates.length > 0) {
        await this.sheets!.spreadsheets.values.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: updates
          }
        });
      }

      // 5. Execute appends
      if (valuesToAppend.length > 0) {
        await this.sheets!.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: `${branchName}!A:H`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: valuesToAppend },
        });
      }
    };

    try {
      let sheetId = settings.currentAcademicYearSheetId;
      if (branchName.startsWith('M.Tech')) {
        sheetId = settings.mtechCurrentAcademicYearSheetId;
      }
      await syncBatch(companies, sheetId);

      return { success: true };
    } catch (error) {
      console.error('Failed to append companies to sheet:', error);
      throw error;
    }
  }

  public async appendPreviousCompaniesToSheet(
    companies: any[],
    sheetId: string
  ): Promise<{ success: boolean }> {
    await this.initialize();
    if (!this.sheets) throw new Error('Google Sheets Auth not configured');
    if (!sheetId) throw new Error('Target Google Sheet ID is missing.');

    const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const sheets = spreadsheet.data.sheets || [];
    const sheetTitles = sheets.map(s => s.properties?.title).filter(Boolean) as string[];

    // Group companies by section
    const bySection: Record<string, any[]> = {};
    for (const c of companies) {
      const section = c.section || 'Uncategorized';
      if (!bySection[section]) bySection[section] = [];
      bySection[section].push(c);
    }

    const updates: { range: string, values: string[][] }[] = [];
    
    // Ensure all required sections exist as tabs
    const addSheetRequests: any[] = [];
    for (const section of Object.keys(bySection)) {
      if (!sheetTitles.includes(section)) {
        addSheetRequests.push({
          addSheet: { properties: { title: section } }
        });
        sheetTitles.push(section); // Mark as created
      }
    }

    if (addSheetRequests.length > 0) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests: addSheetRequests }
      });
      
      // Initialize headers for newly created sheets
      for (const req of addSheetRequests) {
        const title = req.addSheet.properties.title;
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: `${title}!A1:H1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['Company Name', 'HR Name', 'HR Phone', 'HR Email', 'Academic Year', 'Notes', 'Database ID', 'Extra Data JSON']] },
        });
      }
    }

    for (const section of Object.keys(bySection)) {
      const sectionCompanies = bySection[section];
      const existingRows = await this.fetchInboundData(sheetId, section);
      const companyRowMap = new Map<string, number>();
      
      for (let i = 0; i < existingRows.length; i++) {
        const row = existingRows[i];
        if (i === 0 && row[0]?.toLowerCase().includes('company')) continue;
        
        const companyName = row[0]?.trim();
        const hiddenId = row[6]?.trim(); // ID is at index 6 (Col G)
        
        if (hiddenId) {
          companyRowMap.set(hiddenId, i);
        }
        if (companyName) {
          const normalized = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
          companyRowMap.set(normalized, i);
        }
      }

      const valuesToAppend: string[][] = [];

      for (const company of sectionCompanies) {
        const extraDataStr = company.extraData && Object.keys(company.extraData).length > 0 
          ? JSON.stringify(company.extraData) 
          : '';

        const rowData = [
          company.companyName || '',
          company.hrName || '',
          company.hrPhone || '',
          company.hrEmail || '',
          company.academicYear || '',
          company.notes || '',
          company._id.toString(),
          extraDataStr
        ];

        const hiddenIdStr = company._id.toString();
        const normalizedName = company.companyName?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
        
        const existingRowIndex = companyRowMap.has(hiddenIdStr) 
          ? companyRowMap.get(hiddenIdStr) 
          : companyRowMap.get(normalizedName);

        if (existingRowIndex !== undefined) {
          updates.push({
            range: `${section}!A${existingRowIndex + 1}:H${existingRowIndex + 1}`,
            values: [rowData]
          });
        } else {
          valuesToAppend.push(rowData);
        }
      }

      if (valuesToAppend.length > 0) {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: `${section}!A:H`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: valuesToAppend },
        });
      }
    }

    // Execute updates
    if (updates.length > 0) {
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: updates
        }
      });
    }

    return { success: true };
  }

  public async syncPreviousCompaniesBidirectional(sheetId: string): Promise<{ success: boolean; syncedCount: number }> {
    await this.initialize();
    if (!this.sheets) throw new Error('Google Sheets Auth not configured');
    if (!sheetId) throw new Error('Target Google Sheet ID is missing.');

    const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const sheets = spreadsheet.data.sheets || [];
    const sheetTitles = sheets.map(s => s.properties?.title).filter(Boolean) as string[];

    if (sheetTitles.length === 0) {
      throw new Error('No worksheets found in the target spreadsheet');
    }

    const PreviousCompany = (await import('../../models/PreviousCompany')).default;
    const allValidNormalizedNames = new Set<string>();
    let syncedCount = 0;

    for (const sectionTab of sheetTitles) {
      const existingRows = await this.fetchInboundData(sheetId, sectionTab);

      // Process Sheet -> MongoDB (One-way sync based on normalized name)
      for (let i = 0; i < existingRows.length; i++) {
        const row = existingRows[i];
        if (i === 0 && row[0]?.toLowerCase().includes('company')) continue; // skip header
        
        const companyName = row[0]?.trim();
        if (!companyName) continue; // Skip empty rows

        const hrName = row[1]?.trim() || '';
        const hrPhone = row[2]?.trim() || '';
        const hrEmail = row[3]?.trim() || '';
        const academicYear = row[4]?.trim() || 'Unknown';
        const notes = row[5]?.trim() || '';
        const extraDataStr = row[7]?.trim() || '{}';
        
        let extraData = {};
        try {
          extraData = JSON.parse(extraDataStr);
        } catch(e) {}

        const normalizedName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
        allValidNormalizedNames.add(normalizedName);

        try {
          let existing = await PreviousCompany.findOne({ normalizedName });
          if (existing) {
            existing.companyName = companyName;
            existing.hrName = hrName;
            existing.hrPhone = hrPhone;
            existing.hrEmail = hrEmail;
            if (row[4]?.trim()) existing.academicYear = academicYear;
            existing.notes = notes;
            existing.extraData = { ...existing.extraData, ...extraData };
            existing.syncStatus = 'synced';
            existing.lastSynced = new Date();
            await existing.save();
            syncedCount++;
          } else {
            const newCompany = new PreviousCompany({
              companyName, normalizedName, hrName, hrPhone, hrEmail, academicYear, notes,
              section: sectionTab, extraData,
              syncStatus: 'synced', lastSynced: new Date()
            });
            await newCompany.save();
            syncedCount++;
          }
        } catch (e) {
          console.error('Error syncing previous company row:', e);
        }
      }
    }

    // Deletion Pass: Remove any companies from DB that were deleted from Google Sheet
    if (allValidNormalizedNames.size > 0) {
      const allDbCompanies = await PreviousCompany.find();
      const idsToDelete = allDbCompanies
        .filter(c => !allValidNormalizedNames.has(c.normalizedName))
        .map(c => c._id);
      
      if (idsToDelete.length > 0) {
        await PreviousCompany.deleteMany({ _id: { $in: idsToDelete } });
        console.log(`Deleted ${idsToDelete.length} orphaned previous companies during bidirectional sync`);
      }
    }

    return { success: true, syncedCount: syncedCount };
  }

  public async fetchInboundData(spreadsheetId: string, sheetTab: string): Promise<string[][]> {
    await this.initialize();
    if (!this.sheets) throw new Error('Google Sheets Auth not configured');
    if (!spreadsheetId) throw new Error('Spreadsheet ID is required');

    try {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${sheetTab}!A:H`,
      });
      return res.data.values || [];
    } catch (error) {
      console.error(`Failed to fetch inbound data for tab ${sheetTab}:`, error);
      return [];
    }
  }

  public async getPreviousCompanySections(sheetId: string): Promise<string[]> {
    await this.initialize();
    if (!this.sheets) throw new Error('Google Sheets Auth not configured');
    if (!sheetId) throw new Error('Target Google Sheet ID is missing.');

    const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const sheets = spreadsheet.data.sheets || [];
    return sheets.map(s => s.properties?.title).filter(Boolean) as string[];
  }

  public async deleteRows(spreadsheetId: string, sheetTab: string, rowRefs: string[]): Promise<boolean> {
    await this.initialize();
    if (!this.sheets) throw new Error('Google Sheets Auth not configured');

    try {
      const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId });
      const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetTab);
      
      if (!sheet || sheet.properties?.sheetId === undefined) {
        throw new Error(`Sheet tab ${sheetTab} not found`);
      }

      const sheetId = sheet.properties.sheetId;

      const sortedRows = rowRefs.map(r => parseInt(r, 10)).filter(r => !isNaN(r)).sort((a, b) => b - a);
      if (sortedRows.length === 0) return true;

      const requests: sheets_v4.Schema$Request[] = sortedRows.map(rowIdx => ({
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIdx - 1, // 0-indexed in API
            endIndex: rowIdx
          }
        }
      }));

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });

      return true;
    } catch (error) {
      console.error(`Failed to delete rows in tab ${sheetTab}:`, error);
      throw error;
    }
  }
}

export const googleSheetService = new GoogleSheetProvider();
