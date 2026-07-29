import express from 'express';
import PreviousCompany from '../models/PreviousCompany';
import PreviousCompanyContactRequest from '../models/PreviousCompanyContactRequest';
import HrContact from '../models/HrContact';
import Branch from '../models/Branch';
import { protect, AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import Settings from '../models/Settings';
import Company from '../models/Company';
import { googleSheetService } from '../services/google/GoogleSheetProvider';
import axios from 'axios';

const router = express.Router();
router.use(protect);

// @route   GET /api/previous-companies/sections
// @desc    Get all available sections (sheet tabs)
router.get('/sections', async (req, res) => {
  try {
    const settings = await Settings.findOne();
    let sections: string[] = [];
    if (settings && settings.pastAcademicYearSheetId) {
      sections = await googleSheetService.getPreviousCompanySections(settings.pastAcademicYearSheetId);
    } else {
      sections = await PreviousCompany.distinct('section');
    }
    res.json({ success: true, data: sections });
  } catch (error) {
    console.error('Sections fetch error:', error);
    try {
       const sections = await PreviousCompany.distinct('section');
       res.json({ success: true, data: sections });
    } catch (e) {
       res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
});

// @route   GET /api/previous-companies/status-counts
// @desc    Get counts of available vs requested companies
router.get('/status-counts', async (req, res) => {
  try {
    const branchId = req.query.branchId as string;
    const availableCount = await PreviousCompany.countDocuments({ contactStatus: 'not_contacted' });
    
    let myCount = 0;
    let othersCount = 0;
    
    if (branchId) {
      myCount = await PreviousCompany.countDocuments({ contactStatus: { $in: ['requested', 'contacted'] }, contactedByBranchId: branchId });
      othersCount = await PreviousCompany.countDocuments({ contactStatus: { $in: ['requested', 'contacted'] }, contactedByBranchId: { $ne: branchId } });
    } else {
      othersCount = await PreviousCompany.countDocuments({ contactStatus: { $in: ['requested', 'contacted'] } });
    }
    
    res.status(200).json({ success: true, data: { availableCount, myCount, othersCount } });
  } catch (error) {
    console.error('Status counts error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/previous-companies/search
// @desc    Search previous year companies by name
router.get('/search', async (req, res) => {
  try {
    const { q, status } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Query string is required' });
    }

    let query: any = { $text: { $search: q as string } };
    if (status) query.contactStatus = status;

    const companies = await PreviousCompany.find(query).limit(10);
    
    // If no text index matches, fallback to regex
    if (companies.length === 0) {
      let regexQuery: any = { companyName: { $regex: q as string, $options: 'i' } };
      if (status) regexQuery.contactStatus = status;
      
      const regexCompanies = await PreviousCompany.find(regexQuery).limit(10);
      return res.status(200).json({ success: true, data: regexCompanies });
    }

    res.status(200).json({ success: true, data: companies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/previous-companies/list
// @desc    Get paginated list of previous companies
router.get('/list', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string; // 'not_contacted' or 'requested'
    const branchId = req.query.branchId as string;
    
    let query: any = {};
    if (status === 'not_contacted') {
      query.contactStatus = 'not_contacted';
    } else if (status === 'my_requests') {
      query.contactStatus = { $in: ['requested', 'contacted'] };
      if (branchId) query.contactedByBranchId = branchId;
    } else if (status === 'others_requests') {
      query.contactStatus = { $in: ['requested', 'contacted'] };
      if (branchId) query.contactedByBranchId = { $ne: branchId };
    } else if (status === 'requested') {
      query.contactStatus = { $in: ['requested', 'contacted'] };
    }

    const skip = (page - 1) * limit;
    
    // For 'not_contacted' we just need the name. For requested, we need full details.
    let selectFields = '';
    if (status === 'not_contacted') {
      selectFields = 'companyName academicYear contactStatus';
    }

    const [companies, total] = await Promise.all([
      PreviousCompany.find(query).select(selectFields).skip(skip).limit(limit).sort({ createdAt: -1 }),
      PreviousCompany.countDocuments(query)
    ]);

    let finalCompanies = companies.map(c => c.toObject());

    // If fetching my_requests and branchId is provided, check existence in Current Year
    if (status === 'my_requests' && branchId && finalCompanies.length > 0) {
      const normalizedNames = finalCompanies.map(c => c.normalizedName);
      const existingCurrentCompanies = await Company.find({
        assignedBranchId: branchId,
        normalizedName: { $in: normalizedNames }
      }).select('normalizedName');
      
      const existingSet = new Set(existingCurrentCompanies.map(c => c.normalizedName));
      
      finalCompanies = finalCompanies.map(c => ({
        ...c,
        existsInCurrentYear: existingSet.has(c.normalizedName)
      }));
    }

    res.status(200).json({
      success: true,
      data: finalCompanies,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/previous-companies/request
// @desc    Submit a contact request for a previous company
router.post('/request', async (req: AuthRequest, res) => {
  try {
    const { companyId, companyName, branchId } = req.body;
    
    if (!companyId || !companyName || !branchId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check if the previous company is already requested or contacted by another branch
    const previousCompany = await PreviousCompany.findById(companyId);
    if (!previousCompany) {
      return res.status(404).json({ success: false, message: 'Previous company not found' });
    }

    if (previousCompany.contactStatus === 'requested' || previousCompany.contactStatus === 'contacted') {
      return res.status(409).json({ success: false, message: `This company is already ${previousCompany.contactStatus} by the ${previousCompany.contactedByBranchName} branch. Please do not duplicate outreach.` });
    }

    // Check if a pending request already exists for this branch and company
    const existingReq = await PreviousCompanyContactRequest.findOne({
      companyId,
      branchId,
      status: 'pending'
    });

    if (existingReq) {
      return res.status(400).json({ success: false, message: 'A pending request already exists for this company.' });
    }

    // Check if the company is already active in the main collection
    const normalizedName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const activeCompany = await Company.findOne({ normalizedName });
    if (activeCompany) {
      return res.status(409).json({ success: false, message: `This company is already active and contacted by the ${activeCompany.assignedBranch} department (Contact Person: ${activeCompany.contactOwner || 'Unknown'}). Please do not duplicate outreach.` });
    }

    // Fetch the branch name
    const branch = await Branch.findById(branchId);

    const contactReq = await PreviousCompanyContactRequest.create({
      companyId,
      companyName,
      branchId,
      requestedBy: req.user._id,
      status: 'pending'
    });

    // Update the PreviousCompany record to show it is now requested
    previousCompany.contactStatus = 'requested';
    previousCompany.contactedByBranchId = branchId;
    previousCompany.contactedByBranchName = branch ? branch.name : 'Unknown Branch';
    previousCompany.contactedByTprName = req.user.name;
    await previousCompany.save();

    res.status(201).json({ success: true, data: contactReq });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/previous-companies/requests/:branchId
// @desc    Get all requests for a specific branch
router.get('/requests/:branchId', async (req, res) => {
  try {
    const requests = await PreviousCompanyContactRequest.find({ branchId: req.params.branchId })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/previous-companies/check-name
// @desc    Check if a previous company exists by name
router.get('/check-name', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const company = await PreviousCompany.findOne({ normalizedName });

    if (!company) {
      return res.json({ exists: false });
    }

    return res.json({
      exists: true,
      company: company.toObject()
    });
  } catch (error) {
    console.error('Check name error:', error);
    res.status(500).json({ error: 'Failed to check company name' });
  }
});

// @route   POST /api/previous-companies/manual
// @desc    Admin only: Add a manual previous company
router.post('/manual', async (req: any, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { companyName, academicYear, hrName, hrPhone, hrEmail, section, extraData } = req.body;
    if (!companyName || !academicYear) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Company name and academic year are required' });
    }

    const normalizedName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let company = await PreviousCompany.findOne({ normalizedName }).session(session);

    if (company) {
      // Upsert: Update existing company
      company.hrName = hrName || company.hrName;
      company.hrPhone = hrPhone || company.hrPhone;
      company.hrEmail = hrEmail || company.hrEmail;
      company.section = section || company.section;
      if (academicYear) company.academicYear = academicYear;
      company.extraData = { ...company.extraData, ...(extraData || {}) };
      company.syncStatus = 'pending';
    } else {
      // Insert new
      company = new PreviousCompany({
        companyName,
        normalizedName,
        academicYear,
        hrName,
        hrEmail,
        hrPhone,
        section: section || 'Uncategorized',
        extraData: extraData || {}
      });
    }
    
    await company.save({ session });

    // Auto-sync to Google Sheet if configured
    try {
      const settings = await Settings.findOne();
      if (settings && settings.pastAcademicYearSheetId) {
        const syncResult = await googleSheetService.appendPreviousCompaniesToSheet([company as any], settings.pastAcademicYearSheetId);
        if (syncResult.success) {
          company.syncStatus = 'synced';
          company.lastSynced = new Date();
          await company.save({ session });
        } else {
          throw new Error('Google Sheets sync reported failure.');
        }
      }
    } catch (syncError) {
      console.error('Immediate sync failed for manual previous company:', syncError);
      throw new Error('Google Sheets Sync Failed: Rollback initiated');
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, company });
  } catch (error) {
    console.error('Manual previous company add error:', error);
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    res.status(500).json({ error: 'Failed to add company' });
  }
});

// @route   PATCH /api/previous-companies/:id/contact-info
// @desc    Update contact info of an approved previous company and add to current year
router.patch('/:id/contact-info', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { hrName, hrEmail, hrPhone, branchId } = req.body;

    const previousCompany = await PreviousCompany.findById(id);
    if (!previousCompany) {
      return res.status(404).json({ success: false, message: 'Previous company not found' });
    }

    // Verify if it is requested/contacted by this branch
    if (previousCompany.contactedByBranchId?.toString() !== branchId) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this company. Claimed by another branch.' });
    }

    // Check if approved request exists
    const reqDoc = await PreviousCompanyContactRequest.findOne({ companyId: id, branchId, status: 'approved' });
    if (!reqDoc) {
      return res.status(403).json({ success: false, message: 'You need an approved request to update contact info.' });
    }

    previousCompany.hrName = hrName;
    previousCompany.hrEmail = hrEmail;
    previousCompany.hrPhone = hrPhone;
    previousCompany.contactStatus = 'contacted';
    previousCompany.syncStatus = 'pending';
    previousCompany.updatedByTprName = req.user.name;
    await previousCompany.save();

    // Trigger sync for Previous Year Google Sheet
    try {
      const settings = await Settings.findOne();
      if (settings && settings.pastAcademicYearSheetId) {
        const syncResult = await googleSheetService.appendPreviousCompaniesToSheet([previousCompany.toObject()], settings.pastAcademicYearSheetId);
        if (syncResult.success) {
          previousCompany.syncStatus = 'synced';
          previousCompany.lastSynced = new Date();
          await previousCompany.save();
        }
      }
    } catch (e) {
      console.error('Failed to sync previous company update to past year sheet:', e);
    }

    // Now, push this company to the current year Company collection and trigger branch sync!
    const normalizedName = previousCompany.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let currentCompany = await Company.findOne({ normalizedName, assignedBranchId: branchId });
    
    if (!currentCompany) {
      currentCompany = new Company({
        companyName: previousCompany.companyName,
        normalizedName,
        industry: 'Unknown', // Required by schema
        website: 'N/A', // Required by schema
        source: {
          platform: 'PreviousYearDatabase',
          sourceUrl: 'Internal'
        },
        assignedBranch: previousCompany.contactedByBranchName,
        assignedBranchId: branchId,
        hrEmail: hrEmail,
        contactOwner: req.user.name,
        contactOwnerRole: req.user.role,
        lastContactStatus: 'not_contacted',
        totalDrivesConducted: 0,
        syncStatus: 'pending'
      });
      await currentCompany.save();

      const hrContact = new HrContact({
        company_id: currentCompany._id,
        name: hrName,
        mobile: hrPhone,
        email: hrEmail
      });
      await hrContact.save();
    } else {
      // Company exists in this branch's DB, so REPLACE the contact info
      currentCompany.hrEmail = hrEmail;
      currentCompany.syncStatus = 'pending';
      await currentCompany.save();

      let hrContact = await HrContact.findOne({ company_id: currentCompany._id });
      if (!hrContact) {
        hrContact = new HrContact({ company_id: currentCompany._id });
      }
      hrContact.name = hrName;
      hrContact.mobile = hrPhone;
      hrContact.email = hrEmail;
      await hrContact.save();
    }

    // Trigger branch sync to push to the current year Google Sheet
    try {
      const branch = await Branch.findById(branchId);
      if (branch) {
        await axios.post(`http://localhost:3001/api/sync/branch/${branch.name}`); // Self call to existing sync route
      }
    } catch (e) {
      console.error('Failed to trigger auto-sync for branch:', e);
    }

    res.status(200).json({ success: true, data: previousCompany });
  } catch (error) {
    console.error('Update contact info error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/previous-companies/bulk-validate
// @desc    Admin only: Validate bulk previous company upload
router.post('/bulk-validate', async (req: any, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const { companies } = req.body;
    if (!Array.isArray(companies)) return res.status(400).json({ error: 'Companies array is required' });

    const existingCompanies = await PreviousCompany.find().select('normalizedName academicYear').lean();
    const existingSet = new Set(existingCompanies.map((c: any) => `${c.normalizedName}-${c.academicYear}`));

    const validCompanies = [];
    const duplicateCompanies = [];

    for (const c of companies) {
      if (!c.companyName || !c.academicYear) continue;
      const normalized = c.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const key = `${normalized}-${c.academicYear}`;
      
      if (existingSet.has(key)) {
        duplicateCompanies.push(c);
      } else {
        validCompanies.push(c);
        existingSet.add(key);
      }
    }

    res.json({
      validCount: validCompanies.length,
      duplicateCount: duplicateCompanies.length,
      validCompanies,
      duplicateCompanies
    });
  } catch (error) {
    console.error('Bulk validate error:', error);
    res.status(500).json({ error: 'Failed to validate companies' });
  }
});

// @route   POST /api/previous-companies/bulk-import
// @desc    Admin only: Import validated previous companies
router.post('/bulk-import', async (req: any, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { companies } = req.body;
    if (!Array.isArray(companies) || companies.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Valid companies array is required' });
    }

    const companyDocs = companies.map(c => ({
      companyName: c.companyName,
      normalizedName: c.companyName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      academicYear: c.academicYear,
      hrName: c.hrName || '',
      hrPhone: c.hrPhone || '',
      hrEmail: c.hrEmail || '',
      section: c.section || 'Uncategorized',
      extraData: c.extraData || {}
    }));

    const insertedDocs = await PreviousCompany.insertMany(companyDocs, { session });
    
    // Auto-sync to Google Sheet if configured
    try {
      const settings = await Settings.findOne();
      if (settings && settings.pastAcademicYearSheetId) {
        const syncResult = await googleSheetService.appendPreviousCompaniesToSheet(insertedDocs as any[], settings.pastAcademicYearSheetId);
        if (syncResult.success) {
          const insertedIds = insertedDocs.map(d => d._id);
          await PreviousCompany.updateMany(
            { _id: { $in: insertedIds } },
            { $set: { syncStatus: 'synced', lastSynced: new Date() } },
            { session }
          );
        } else {
          throw new Error('Google Sheets sync reported failure.');
        }
      }
    } catch (syncError) {
      console.error('Immediate bulk sync failed for previous companies:', syncError);
      throw new Error('Google Sheets Sync Failed: Rollback initiated');
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, count: companyDocs.length });
  } catch (error) {
    console.error('Bulk import error:', error);
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    res.status(500).json({ error: 'Failed to import companies' });
  }
});

// @route   POST /api/previous-companies/sync-sheet
// @desc    Admin only: Sync all previous companies to Google Sheet
router.post('/sync-sheet', async (req: any, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const settings = await Settings.findOne();
    if (!settings || !settings.pastAcademicYearSheetId) {
      return res.status(400).json({ error: 'Past Academic Year Google Sheet ID is not configured' });
    }

    const syncResult = await googleSheetService.syncPreviousCompaniesBidirectional(
      settings.pastAcademicYearSheetId
    );

    if (syncResult.success) {
      const now = new Date();
      
      const totalSyncedInDb = await PreviousCompany.countDocuments({ syncStatus: 'synced' });
      await Settings.updateOne({}, {
        $set: { 
          pastLastSyncDate: now,
          pastTotalSynced: totalSyncedInDb 
        }
      }, { upsert: true });

      res.json({ message: 'Previous year bidirectional sync successful', syncedCount: syncResult.syncedCount });
    } else {
      res.status(500).json({ error: 'Failed to sync with Google Sheet' });
    }
  } catch (error: any) {
    console.error('Previous year sync error:', error);
    if (
      error.code === 403 || 
      error.status === 403 || 
      error.message?.toLowerCase().includes('permission') ||
      error.message?.toLowerCase().includes('forbidden')
    ) {
      return res.status(403).json({ 
        error: 'Permission Denied: Please share the Past Academic Year Google Sheet with the Service Account as an Editor.' 
      });
    }
    res.status(500).json({ error: error.message || 'Failed to perform previous year sync' });
  }
});

export default router;
