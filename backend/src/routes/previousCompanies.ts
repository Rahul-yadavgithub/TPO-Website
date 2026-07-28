import express from 'express';
import PreviousCompany from '../models/PreviousCompany';
import PreviousCompanyContactRequest from '../models/PreviousCompanyContactRequest';
import { protect, AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import Settings from '../models/Settings';
import { googleSheetService } from '../services/google/GoogleSheetProvider';

const router = express.Router();
router.use(protect);

// @route   GET /api/previous-companies/search
// @desc    Search previous year companies by name
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Query string is required' });
    }

    const companies = await PreviousCompany.find({ 
      $text: { $search: q as string } 
    }).limit(10);
    
    // If no text index matches, fallback to regex
    if (companies.length === 0) {
      const regexCompanies = await PreviousCompany.find({
        companyName: { $regex: q as string, $options: 'i' }
      }).limit(10);
      return res.status(200).json({ success: true, data: regexCompanies });
    }

    res.status(200).json({ success: true, data: companies });
  } catch (error) {
    console.error(error);
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

    // Check if a pending request already exists for this branch and company
    const existingReq = await PreviousCompanyContactRequest.findOne({
      companyId,
      branchId,
      status: 'pending'
    });

    if (existingReq) {
      return res.status(400).json({ success: false, message: 'A pending request already exists for this company.' });
    }

    const contactReq = await PreviousCompanyContactRequest.create({
      companyId,
      companyName,
      branchId,
      requestedBy: req.user._id,
      status: 'pending'
    });

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

// @route   POST /api/previous-companies/manual
// @desc    Admin only: Add a manual previous company
router.post('/manual', async (req: any, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const { companyName, academicYear, hrName, hrPhone, hrEmail } = req.body;
    if (!companyName || !academicYear) {
      return res.status(400).json({ error: 'Company name and academic year are required' });
    }

    const normalizedName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let company = await PreviousCompany.findOne({ normalizedName, academicYear });

    if (company) {
      return res.status(400).json({ error: 'Company already exists for this academic year.' });
    }

    company = new PreviousCompany({
      companyName,
      normalizedName,
      academicYear,
      hrName,
      hrEmail,
      hrPhone
    });
    
    await company.save();
    res.json({ success: true, company });
  } catch (error) {
    console.error('Manual previous company add error:', error);
    res.status(500).json({ error: 'Failed to add company' });
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
  try {
    const { companies } = req.body;
    if (!Array.isArray(companies) || companies.length === 0) {
      return res.status(400).json({ error: 'Valid companies array is required' });
    }

    const companyDocs = companies.map(c => ({
      companyName: c.companyName,
      normalizedName: c.companyName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      academicYear: c.academicYear,
      hrName: c.hrName || '',
      hrPhone: c.hrPhone || '',
      hrEmail: c.hrEmail || ''
    }));

    await PreviousCompany.insertMany(companyDocs);
    res.json({ success: true, count: companyDocs.length });
  } catch (error) {
    console.error('Bulk import error:', error);
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
