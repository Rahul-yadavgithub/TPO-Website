import { Router } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import { scrapeQueue } from '../jobs/queue';
import Company, { CompanyStatus } from '../models/Company';
import ScanHistory from '../models/ScanHistory';
import RawDiscovery from '../models/RawDiscovery';
import Source from '../models/Source';
import Settings from '../models/Settings';
import CompanyStatusHistory from '../models/CompanyStatusHistory';
import Branch from '../models/Branch';
import PreviousCompany from '../models/PreviousCompany';

import HrContact from '../models/HrContact';
import ContactLog from '../models/ContactLog';
import TargetCompany from '../models/TargetCompany';
import { googleSheetService } from '../services/google/GoogleSheetProvider';

import { apiKeyController } from '../controllers/apiKeyController';
import { hrValidationController } from '../controllers/hrValidationController';
import { companyController } from '../controllers/companyController';
import { extractionController } from '../controllers/extractionController';
import { bulkController } from '../controllers/bulkController';
import { analyticsController } from '../controllers/analyticsController';
import { outreachController } from '../controllers/outreachController';
import { AgentPipeline } from '../services/agents/AgentPipeline';
import { protect, authorizeRoles } from '../middleware/auth';
import { uploadLogo } from '../utils/cloudinary';
import { acquireLock, releaseLock } from '../utils/lock';

const router = Router();

// Apply auth middleware to all /api routes
router.use(protect);

router.post('/companies/extract-info', extractionController.extractInfo);


router.get('/companies/branch-overview', analyticsController.getBranchOverview);

// --- DASHBOARD STATS ---
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Run ALL stat queries in parallel — avoids sequential DB round-trips
    const [
      companiesFound,
      newCompaniesToday,
      freshersHiring,
      internships,
      startups,
      highConfidence,
      campusHiring,
      pendingReview,
      approvedCompanies,
      rejectedCompanies,
      activeSourcesCount,
      lastScan
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ createdAt: { $gte: today } }),
      Company.countDocuments({ fresherHiring: true }),
      Company.countDocuments({ internshipAvailable: true }),
      Company.countDocuments({ fundingStage: { $in: ['Seed', 'Series A', 'Series B'] } }),
      Company.countDocuments({ confidenceScore: { $gte: 90 } }),
      Company.countDocuments({ placementPriority: 'HIGH' }),
      Company.countDocuments({ status: CompanyStatus.PENDING_REVIEW }),
      Company.countDocuments({ status: CompanyStatus.APPROVED }),
      Company.countDocuments({ status: CompanyStatus.REJECTED }),
      Source.countDocuments({ isEnabled: true }),
      ScanHistory.findOne().sort({ date: -1 }).select('date').lean()
    ]);

    res.json({
      companiesFound,
      newCompaniesToday,
      freshersHiring,
      internships,
      startups,
      highConfidence,
      campusHiring,
      pendingReview,
      approvedCompanies,
      rejectedCompanies,
      activeSourcesCount,
      lastScanTime: lastScan?.date || null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// --- SCAN TRIGGER ---
router.post('/scan/trigger', async (req, res) => {
  try {
    const activeSources = await Source.find({ isEnabled: true });

    if (activeSources.length === 0) {
      await scrapeQueue.add('wellfound-scan', { platform: 'Wellfound' });
      return res.json({ message: 'Scan triggered for Wellfound (default)' });
    }

    for (const source of activeSources) {
      const history = await ScanHistory.create({
        platform: source.platformName,
        status: 'QUEUED',
        phase: 'Queued for processing',
        date: new Date(),
      });

      await scrapeQueue.add(`${source.platformName}-scan`, {
        platform: source.platformName,
        sourceUrl: source.sourceUrl,
        scanHistoryId: history._id
      });
    }

    res.json({ message: 'Scans triggered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger scans' });
  }
});

router.post('/scan/trigger/:sourceId', async (req, res) => {
  try {
    const source = await Source.findById(req.params.sourceId);
    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    const history = await ScanHistory.create({
      platform: source.platformName,
      status: 'QUEUED',
      phase: 'Queued for processing',
      date: new Date(),
    });

    await scrapeQueue.add(`${source.platformName}-scan`, {
      platform: source.platformName,
      sourceUrl: source.sourceUrl,
      scanHistoryId: history._id
    });

    res.json({ message: 'Scan triggered', scanHistoryId: history._id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger scan' });
  }
});

// --- COMPANIES ---
router.get('/companies', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const query: any = { 'source.platform': { $ne: 'PreviousYearDatabase' } };
    if (req.query.search) {
      query.companyName = { $regex: req.query.search, $options: 'i' };
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Run find and count in parallel + use .lean() to skip Mongoose hydration
    const [companies, total] = await Promise.all([
      Company.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Company.countDocuments(query)
    ]);

    res.json({
      data: companies,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// GET /api/companies/check-name?name=...
router.get('/companies/check-name', async (req, res) => {
  try {
    const { name, branchId } = req.query;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    let query: any = { normalizedName };
    if (branchId) query.assignedBranchId = branchId;
    
    const company = await Company.findOne(query);

    if (!company) {
      return res.json({ exists: false });
    }

    const hrContact = await HrContact.findOne({ company_id: company._id });

    return res.json({
      exists: true,
      company: {
        _id: company._id,
        companyName: company.companyName,
        assignedBranch: company.assignedBranch,
        linkedinCompanyUrl: company.linkedinCompanyUrl,
        linkedinRecruiterUrl: company.linkedinRecruiterUrl,
        is_verified_by_admin: company.is_verified_by_admin
      },
      hrContact: hrContact ? {
        name: hrContact.name,
        mobile: hrContact.mobile,
        email: hrContact.email
      } : null
    });
  } catch (error) {
    console.error('Check name error:', error);
    res.status(500).json({ error: 'Failed to check company name' });
  };
})

// @route   POST /api/companies/manual-company
// @desc    Admin only: Add a manual company to global pool
router.post('/companies/manual-company', companyController.addManualCompany);

// @route   POST /api/companies/bulk-validate-companies
// @desc    Admin only: Validate bulk company upload
router.post('/companies/bulk-validate-companies', authorizeRoles('admin'), bulkController.validateCompanies);

// @route   POST /api/companies/bulk-import-companies
// @desc    Admin only: Import validated companies
router.post('/companies/bulk-import-companies', authorizeRoles('admin'), bulkController.importCompanies);

router.get('/companies/:id', companyController.getCompanyById);
router.get('/companies/:id/external-insights', companyController.getExternalInsights);



router.patch('/companies/:id/verify', outreachController.verifyCompany);
router.put('/companies/:id/assignment', outreachController.assignCompany);
router.put('/companies/:id/override-assign', outreachController.overrideAssign);

router.patch('/companies/:id/review', outreachController.reviewCompany);

// --- BRANCHES & ASSIGNMENTS ---
router.get('/branches', async (req, res) => {
  try {
    const branches = await Branch.find().sort({ name: 1 });
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// Route removed as BranchAssignments are now part of Company



// --- SYNC CENTER ---
router.get('/sync/pending', async (req, res) => {
  try {
    const results = await Company.aggregate([
      { $match: { syncStatus: 'pending', assignedBranch: { $exists: true, $ne: null } } },
      { $lookup: { from: 'branches', localField: 'assignedBranch', foreignField: 'name', as: 'branchDetails' } },
      { $unwind: { path: '$branchDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { name: '$assignedBranch', category: '$branchDetails.category' },
          count: { $sum: 1 },
          companies: {
            $push: {
              _id: '$_id',
              companyName: '$companyName',
              sync_status: '$syncStatus'
            }
          }
        }
      },
      { $project: { _id: 0, branch_name: '$_id.name', branch_category: { $ifNull: ['$_id.category', 'Other'] }, count: 1, companies: 1 } },
      { $sort: { branch_category: 1, branch_name: 1 } }
    ]);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending syncs' });
  }
});

router.get('/sync/history', async (req, res) => {
  try {
    const results = await Company.aggregate([
      { $match: { syncStatus: 'synced', assignedBranch: { $exists: true, $ne: null } } },
      { $lookup: { from: 'branches', localField: 'assignedBranch', foreignField: 'name', as: 'branchDetails' } },
      { $unwind: { path: '$branchDetails', preserveNullAndEmptyArrays: true } },
      { $sort: { lastSynced: -1 } },
      {
        $group: {
          _id: { name: '$assignedBranch', category: '$branchDetails.category' },
          count: { $sum: 1 },
          lastSynced: { $max: '$lastSynced' },
          companies: {
            $push: {
              _id: '$_id',
              companyName: '$companyName',
              sync_status: '$syncStatus',
              synced_at: '$lastSynced'
            }
          }
        }
      },
      { $project: { _id: 0, branch_name: '$_id.name', branch_category: { $ifNull: ['$_id.category', 'Other'] }, count: 1, lastSynced: 1, companies: { $slice: ['$companies', 20] } } },
      { $sort: { branch_category: 1, branch_name: 1 } }
    ]);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sync history' });
  }
});

router.post('/companies/bulk-assign', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { companyIds, branch_id, assigned_by } = req.body;

    if (!companyIds || !companyIds.length || !branch_id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Missing companyIds or branch_id' });
    }

    const branch = await Branch.findById(branch_id).session(session);
    if (!branch) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Branch not found' });
    }

    const historyLogs = [];

    for (const companyId of companyIds) {
      const company = await Company.findById(companyId).session(session);
      if (company) {
        const oldBranch = company.assignedBranch;
        company.assignedBranch = branch.name;
        company.syncStatus = 'pending';
        await company.save({ session });

        historyLogs.push({
          company_id: companyId,
          field_changed: 'branch_assignment',
          old_value: oldBranch || 'None',
          new_value: branch.name,
          changed_by: assigned_by || 'System'
        });
      }
    }

    if (historyLogs.length > 0) {
      await CompanyStatusHistory.insertMany(historyLogs, { session });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Bulk assignment successful', count: historyLogs.length });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Failed to bulk assign branches' });
  }
});

router.post('/companies/sync-sheet', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Sync all companies that have an assigned branch
    const companiesToSync = await Company.find({
      assignedBranch: { $exists: true, $ne: null }
    }).session(session);

    if (companiesToSync.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'No companies available to sync' });
    }

    const now = new Date();
    let totalSynced = 0;
    const historyLogs = [];

    // Group by branch
    const branchMap = new Map<string, typeof companiesToSync>();
    for (const company of companiesToSync) {
      const branchName = company.assignedBranch!;
      if (!branchMap.has(branchName)) branchMap.set(branchName, []);
      branchMap.get(branchName)!.push(company);
    }

    // Sync per branch
    for (const [branchName, companiesGroup] of branchMap.entries()) {
      // --- Sync Deletions ---
      try {
        const settings = await Settings.findOne().session(session);
        let sheetId = settings?.currentAcademicYearSheetId;
        if (branchName.startsWith('M.Tech')) {
          sheetId = settings?.mtechCurrentAcademicYearSheetId;
        }
        
        if (sheetId) {
          const sheetRows = await googleSheetService.fetchInboundData(sheetId, branchName);
          if (sheetRows.length > 0) {
            const validSheetIds = new Set<string>();
            for (let i = 0; i < sheetRows.length; i++) {
              const row = sheetRows[i];
              if (i === 0 && row[0]?.toLowerCase().includes('company')) continue;
              const hiddenId = row[7]?.trim();
              if (hiddenId) validSheetIds.add(hiddenId);
            }
            
            const companiesToDelete = companiesGroup.filter(c => !validSheetIds.has(c._id.toString()) && c.syncStatus === 'synced');
            
            if (companiesToDelete.length > 0) {
              const idsToDelete = companiesToDelete.map(c => c._id);
              await Company.deleteMany({ _id: { $in: idsToDelete } }, { session });
              await HrContact.deleteMany({ company_id: { $in: idsToDelete } }, { session });
              await ContactLog.deleteMany({ company_id: { $in: idsToDelete } }, { session });
              await CompanyStatusHistory.deleteMany({ company_id: { $in: idsToDelete } }, { session });
              console.log(`Deleted ${idsToDelete.length} orphaned companies during global sync for ${branchName}`);
              
              // Remove deleted from companiesGroup so they don't get appended
              for (let i = companiesGroup.length - 1; i >= 0; i--) {
                if (!validSheetIds.has(companiesGroup[i]._id.toString()) && companiesGroup[i].syncStatus === 'synced') {
                  companiesGroup.splice(i, 1);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error during sync deletions for branch ${branchName}:`, err);
      }
      // --- End Sync Deletions ---

      const syncResult = await googleSheetService.appendCompaniesToSheet(companiesGroup, branchName);

      if (syncResult.success) {
        for (const company of companiesGroup) {
          if (company.contact_outcome === 'rejected') {
            await Company.deleteOne({ _id: company._id }, { session });
            await HrContact.deleteMany({ company_id: company._id }, { session });
            await ContactLog.deleteMany({ company_id: company._id }, { session });
            await CompanyStatusHistory.deleteMany({ company_id: company._id }, { session });
          } else {
            await Company.updateOne(
              { _id: company._id },
              { $set: { syncStatus: 'synced', lastSynced: now } },
              { session }
            );
            totalSynced++;
          }
        }

        historyLogs.push(...companiesGroup
          .filter(company => company.contact_outcome !== 'rejected')
          .map(company => ({
            company_id: company._id,
            field_changed: 'sync_status',
            old_value: company.syncStatus || 'pending',
            new_value: 'synced',
            changed_by: 'System (Global Sync)'
          }))
        );
      } else {
        console.error(`Global sync failed for branch ${branchName}`);
      }
    }

    if (historyLogs.length > 0) {
      await CompanyStatusHistory.insertMany(historyLogs, { session });
    }

    // Get total count of all synced companies across the database to update settings accurately
    const totalSyncedInDb = await Company.countDocuments({ syncStatus: 'synced' }).session(session);

    await Settings.updateOne({}, {
      $set: {
        lastSyncDate: now,
        totalSynced: totalSyncedInDb
      }
    }, { session, upsert: true });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Global sync successful', syncedCount: totalSynced });
  } catch (error) {
    console.error('Global sync error:', error);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Failed to perform global sync' });
  }
});

router.post('/sync/bulk-sync', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { companyIds } = req.body;

    if (!companyIds || !companyIds.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Missing companyIds' });
    }

    // Find all pending companies
    const pendingCompanies = await Company.find({
      _id: { $in: companyIds },
      syncStatus: 'pending',
      assignedBranch: { $exists: true, $ne: null }
    }).session(session);

    if (pendingCompanies.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'No pending assignments to sync among selected companies' });
    }

    const now = new Date();
    let totalSynced = 0;
    const historyLogs = [];

    // Group by branch
    const branchMap = new Map<string, typeof pendingCompanies>();
    for (const company of pendingCompanies) {
      const branchName = company.assignedBranch!;
      if (!branchMap.has(branchName)) branchMap.set(branchName, []);
      branchMap.get(branchName)!.push(company);
    }

    // Sync per branch
    for (const [branchName, companiesGroup] of branchMap.entries()) {
      const syncResult = await googleSheetService.appendCompaniesToSheet(companiesGroup, branchName);

      if (syncResult.success) {
        for (const company of companiesGroup) {
          await Company.updateOne(
            { _id: company._id },
            { $set: { syncStatus: 'synced', lastSynced: now } },
            { session }
          );
          totalSynced++;
        }

        historyLogs.push(...companiesGroup.map(company => ({
          company_id: company._id,
          field_changed: 'sync_status',
          old_value: 'pending',
          new_value: 'synced',
          changed_by: 'System'
        })));
      } else {
        console.error(`Bulk sync failed for branch ${branchName}`);
      }
    }

    if (historyLogs.length > 0) {
      await CompanyStatusHistory.insertMany(historyLogs, { session });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Bulk sync successful', count: totalSynced });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Failed to perform bulk sync' });
  }
});

router.post('/sync/branch/:branch_identifier', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const param = req.params.branch_identifier;
    let branch;

    if (mongoose.Types.ObjectId.isValid(param)) {
      branch = await Branch.findById(param).session(session);
    }
    if (!branch) {
      branch = await Branch.findOne({ name: param }).session(session);
    }

    if (!branch) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Branch not found' });
    }

    const allCompanies = await Company.find({ assignedBranch: branch.name }).session(session);

    // 1. Sync Deletions: Remove DB companies that were deleted from Google Sheet
    try {
      const settings = await Settings.findOne().session(session);
      let sheetId = settings?.currentAcademicYearSheetId;
      if (branch.name.startsWith('M.Tech')) {
        sheetId = settings?.mtechCurrentAcademicYearSheetId;
      }
      
      if (sheetId) {
        const sheetRows = await googleSheetService.fetchInboundData(sheetId, branch.name);
        if (sheetRows.length > 0) { // Safety check: only process if we got data/headers back
          const validSheetIds = new Set<string>();
          for (let i = 0; i < sheetRows.length; i++) {
            const row = sheetRows[i];
            if (i === 0 && row[0]?.toLowerCase().includes('company')) continue;
            const hiddenId = row[7]?.trim();
            if (hiddenId) validSheetIds.add(hiddenId);
          }
          
          const companiesToDelete = allCompanies.filter(c => !validSheetIds.has(c._id.toString()) && c.syncStatus === 'synced');
          
          if (companiesToDelete.length > 0) {
            const idsToDelete = companiesToDelete.map(c => c._id);
            await Company.deleteMany({ _id: { $in: idsToDelete } }, { session });
            await HrContact.deleteMany({ company_id: { $in: idsToDelete } }, { session });
            await ContactLog.deleteMany({ company_id: { $in: idsToDelete } }, { session });
            await CompanyStatusHistory.deleteMany({ company_id: { $in: idsToDelete } }, { session });
            console.log(`Deleted ${idsToDelete.length} orphaned companies during branch sync for ${branch.name}`);
          }
        }
      }
    } catch (err) {
      console.error('Error during sync deletions:', err);
      // Proceed with push sync even if deletion check fails
    }

    // 2. Push Pending Updates
    const pendingCompanies = await Company.find({
      assignedBranch: branch.name,
      syncStatus: 'pending'
    }).session(session);

    if (pendingCompanies.length === 0) {
      await session.commitTransaction();
      session.endSession();
      return res.json({ message: 'Sync successful (No pending updates pushed, but deletions checked)' });
    }

    const syncResult = await googleSheetService.appendCompaniesToSheet(pendingCompanies, branch.name);

    if (!syncResult.success) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ error: 'Google Sheets API error' });
    }

    const now = new Date();

    for (const company of pendingCompanies) {
      if (company.contact_outcome === 'rejected') {
        // The user explicitly requested to permanently delete rejected companies
        await Company.deleteOne({ _id: company._id }, { session });
        await HrContact.deleteMany({ company_id: company._id }, { session });
        await ContactLog.deleteMany({ company_id: company._id }, { session });
        await CompanyStatusHistory.deleteMany({ company_id: company._id }, { session });
      } else {
        await Company.updateOne(
          { _id: company._id },
          { $set: { syncStatus: 'synced', lastSynced: now } },
          { session }
        );
      }
    }

    const historyLogs = pendingCompanies
      .filter(company => company.contact_outcome !== 'rejected')
      .map(company => ({
        company_id: company._id,
        field_changed: 'sync_status',
        old_value: 'pending',
        new_value: 'synced',
        changed_by: 'System'
      }));

    if (historyLogs.length > 0) {
      await CompanyStatusHistory.insertMany(historyLogs, { session });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Sync successful', count: pendingCompanies.length });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Failed to perform sync' });
  }
});

router.get('/sync/history/:branch_id/companies', async (req, res) => {
  try {
    const branchId = new mongoose.Types.ObjectId(req.params.branch_id);
    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    const companies = await Company.find({
      assignedBranch: branch.name,
      syncStatus: 'synced'
    }).lean();

    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch synced companies' });
  }
});

router.post('/sync/inbound', async (req, res) => {
  try {
    const { branch_id } = req.body;
    let branches = [];
    if (branch_id) {
      const b = await Branch.findById(branch_id);
      if (!b) return res.status(404).json({ error: 'Branch not found' });
      branches = [b];
    } else {
      branches = await Branch.find();
    }

    const allBranches = await Branch.find();
    const branchCategoryMap = new Map(allBranches.map(b => [b.name, b.category]));

    const settings = await Settings.findOne();
    if (!settings) return res.status(400).json({ error: 'Settings not configured' });

    let totalUpdated = 0;
    const conflicts: string[] = [];

    // Helper to parse dates like 1/03/2026, 01/03/2026, 1-Mar-2026, March 1 2026
    const parseNextCallDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;

      // Try to handle DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY, DD-MM-YY
      const parts = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/);
      if (parts) {
        const day = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10) - 1; // 0-indexed
        let year = parseInt(parts[3], 10);
        if (year < 100) year += 2000;
        const parsed = new Date(year, month, day);
        if (!isNaN(parsed.getTime())) return parsed;
      }

      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return null;
      return parsed;
    };

    for (const branch of branches) {
      const sheetTab = branch.sheet_tab_ref || branch.name;
      const sheetIdsToPoll = [settings.currentAcademicYearSheetId, settings.pastAcademicYearSheetId].filter(id => id);

      for (const spreadsheetId of sheetIdsToPoll) {
        const rows = await googleSheetService.fetchInboundData(spreadsheetId, sheetTab);
        if (rows.length === 0) continue;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const companyName = row[0]?.trim();

          if (i === 0 && companyName?.toLowerCase().includes('company')) {
            continue;
          }

          const hrName = row[1]?.trim();
          const hrPhone = row[2]?.trim();
          const hrEmail = row[3]?.trim();
          const statusText = row[4]?.trim();
          const nextCallText = row[5]?.trim();
          const description = row[6]?.trim();
          const hiddenId = row[7]?.trim();

          if (!companyName) continue;

          let company;
          if (hiddenId && mongoose.Types.ObjectId.isValid(hiddenId)) {
            company = await Company.findById(hiddenId);
          }

          if (!company) {
            const normalized = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const possibleCompanies = await Company.find({
              $or: [{ companyName }, { normalizedName: normalized }]
            });

            // Deduplicate only within the SAME category (Circuital vs Core)
            company = possibleCompanies.find(c => {
              const cCat = branchCategoryMap.get(c.assignedBranch || '');
              return cCat === branch.category || !cCat; // if no assigned branch, assume it's a match
            });
          }

          if (!company) {
            if (statusText?.toUpperCase() === 'REJECTED') {
              // The user requested that REJECTED ghost companies in the sheet should NOT be imported.
              continue;
            }

            // Create the missing company from sheet data
            company = new Company({
              companyName,
              normalizedName: companyName.toLowerCase().replace(/[^a-z0-9]/g, ''),
              status: CompanyStatus.PENDING_REVIEW,
              data_source: 'excel_import',
              assignedBranch: branch.name,
              source: {
                platform: 'Google Sheets Import',
                sourceUrl: 'N/A',
                discoveryMethod: 'DIRECT',
                discoveredAt: new Date()
              }
            });
            await company.save();
            conflicts.push(`Imported new company from ${sheetTab}: ${companyName}`);
          }

          let updated = false;

          // 1. HR Contacts
          if (hrName || hrPhone || hrEmail) {
            let hrContact = await HrContact.findOne({ company_id: company._id });
            if (!hrContact) {
              hrContact = new HrContact({ company_id: company._id });
            }
            if (hrName) hrContact.name = hrName;
            if (hrPhone) hrContact.mobile = hrPhone;
            if (hrEmail) hrContact.email = hrEmail;
            await hrContact.save();
          }

          // 2. Parse Date and Status Mapping
          const parsedDate = parseNextCallDate(nextCallText);
          let newContactStatus = 'not_contacted';
          let newContactOutcome = null;
          let newConfirmationStatus = company.confirmation_status;

          if (statusText) {
            const statusUpper = statusText.toUpperCase();
            if (statusUpper === 'REJECTED') {
              newContactStatus = 'contacted';
              newContactOutcome = 'rejected';
            } else if (statusUpper === 'ACCEPTED' || statusUpper === 'CONFIRMED') {
              newContactStatus = 'contacted';
              newContactOutcome = 'accepted';
              newConfirmationStatus = 'confirmed';
            } else if (statusUpper === 'CALL AGAIN') {
              newContactStatus = 'contacted';
              newContactOutcome = 'call_again';
            } else {
              newContactStatus = 'contacted';
              newContactOutcome = 'call_again'; // Default for non-empty
            }
          } else if (parsedDate) {
            // Auto-detect 'CALL AGAIN' if they just typed a date but left status blank
            newContactStatus = 'contacted';
            newContactOutcome = 'call_again';
          }

          const trackChange = async (field: string, oldVal: any, newVal: any) => {
            if (oldVal !== newVal) {
              await CompanyStatusHistory.create({
                company_id: company._id, field_changed: field,
                old_value: String(oldVal || 'null'), new_value: String(newVal || 'null'), changed_by: 'Sheets Inbound Sync'
              });
              return true;
            }
            return false;
          };

          if (await trackChange('contact_status', company.contact_status, newContactStatus)) {
            company.contact_status = newContactStatus as any;
            updated = true;
          }
          if (await trackChange('contact_outcome', company.contact_outcome, newContactOutcome)) {
            company.contact_outcome = newContactOutcome as any;
            updated = true;
          }
          if (await trackChange('confirmation_status', company.confirmation_status, newConfirmationStatus)) {
            company.confirmation_status = newConfirmationStatus as any;
            updated = true;
          }

          // 3. Description & Next Call Date
          if (newContactOutcome === 'call_again' || newContactOutcome === 'accepted') {
            if (description) {
              let contactLog = await ContactLog.findOne({ company_id: company._id, notes: description });
              if (!contactLog) {
                await ContactLog.create({
                  company_id: company._id,
                  notes: description,
                  contact_date: new Date(),
                  outcome: newContactOutcome,
                  created_by: 'Sheets Sync'
                });
              }
            }
          }

          if (parsedDate) {
            if (company.nextFollowupDate?.getTime() !== parsedDate.getTime()) {
              company.nextFollowupDate = parsedDate;
              updated = true;
            }
          } else if (nextCallText === '') {
            if (company.nextFollowupDate) {
              company.nextFollowupDate = undefined;
              updated = true;
            }
          }

          if (updated) {
            await company.save();
            totalUpdated++;
          }
        }
      }
    }

    res.json({ message: 'Inbound sync complete', totalUpdated, conflicts });
  } catch (error) {
    console.error('Inbound sync error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to perform inbound sync' });
  }
});

// --- BRANCH PORTAL & CONTACTS ---
router.get('/branch/:branch_id/contact-today', async (req, res) => {
  try {
    const branchId = new mongoose.Types.ObjectId(req.params.branch_id);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    const companies = await Company.find({
      assignedBranch: branch.name,
      confirmation_status: { $ne: 'confirmed' },
      nextFollowupDate: { $lte: endOfToday }
    }).lean();

    const companyIds = companies.map(c => c._id);
    const allHrContacts = await HrContact.find({ company_id: { $in: companyIds } }).lean();
    const allContactLogs = await ContactLog.find({ company_id: { $in: companyIds } }).sort({ contact_date: -1 }).lean();

    const hrContactMap = allHrContacts.reduce((acc: any, curr: any) => {
      const key = curr.company_id.toString();
      acc[key] = acc[key] || [];
      acc[key].push(curr);
      return acc;
    }, {});

    const logMap = allContactLogs.reduce((acc: any, curr: any) => {
      const key = curr.company_id.toString();
      acc[key] = acc[key] || [];
      acc[key].push(curr);
      return acc;
    }, {});

    const result = companies.map(company => ({
      ...company,
      hr_contacts: hrContactMap[company._id.toString()] || [],
      contact_logs: logMap[company._id.toString()] || []
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contact-today list' });
  }
});

router.post('/contact-logs', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { company_id, branch_id, contact_date, channel, outcome, notes, created_by, next_contact_date, show_to_tpr, show_to_tpo, tpo_name, is_admin } = req.body;

    let validBranchId = undefined;
    if (branch_id && mongoose.Types.ObjectId.isValid(branch_id)) {
      validBranchId = branch_id;
    }

    const newLog = await ContactLog.create([{
      company_id,
      branch_id: validBranchId,
      contact_date: contact_date || new Date(),
      channel,
      outcome,
      notes,
      created_by,
      show_to_tpr: show_to_tpr || false,
      show_to_tpo: show_to_tpo || false,
      tpo_name
    }], { session });

    const company = await Company.findById(company_id).session(session);
    if (company) {
      company.contact_status = 'contacted';
      company.contactOwner = created_by; // Update POC TPR dynamically
      if (tpo_name) {
        company.assignedTPO = tpo_name; // Temporarily point to TPO for their dashboard view
      }
      if (outcome === 'call_again') {
        company.contact_outcome = 'call_again';
        if (next_contact_date) {
          company.nextFollowupDate = new Date(next_contact_date);
        }
      } else if (outcome === 'rejected') {
        company.contact_outcome = 'rejected';
        company.status = CompanyStatus.REJECTED;
      } else if (outcome === 'accepted') {
        company.contact_outcome = 'accepted';
        company.confirmation_status = 'confirmed';
      } else if (outcome === 'brochure_jnf') {
        company.contact_outcome = 'brochure_jnf';
        company.primary_contact_verified = true;
        if (is_admin) {
          company.emailDeliveryStatus = 'sent';
          company.emailStatusUpdatedAt = new Date();
          company.emailStatusUpdatedBy = created_by;
        }
        const currentPrimary = await HrContact.findOne({ company_id }).session(session);
        if (currentPrimary) {
          currentPrimary.is_verified = true;
          await currentPrimary.save({ session });
        }
      } else if (outcome === 'tpo_talk') {
        company.contact_outcome = 'tpo_talk';
        company.is_verified_by_admin = true;
      }

      company.syncStatus = 'pending';
      await company.save({ session });

      await CompanyStatusHistory.create([{
        company_id: company._id,
        field_changed: 'contact_status',
        new_value: `Logged: ${outcome}`,
        changed_by: created_by
      }], { session });
      
      // If a TPO staff is logging a contact for a company that belongs to a branch, notify the branch
      if (tpo_name && company.assignedBranch && company.assignedBranch !== 'Pending Assignment') {
        const branchObj = await Branch.findOne({ name: company.assignedBranch }).session(session);
        if (branchObj) {
          // Import BranchNotification if not already imported, wait, let's use the mongoose model directly
          const BranchNotification = mongoose.model('BranchNotification');
          await BranchNotification.create([{
            branchId: branchObj._id,
            type: 'info',
            message: `TPO ${tpo_name} has made a call to ${company.companyName} (${outcome}).`
          }], { session });
        }
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.json(newLog[0]);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Failed to create contact log' });
  }
});

router.get('/branch/:branch_id/confirmed', async (req, res) => {
  try {
    const branchId = new mongoose.Types.ObjectId(req.params.branch_id);

    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    const companies = await Company.find({
      assignedBranch: branch.name,
      confirmation_status: 'confirmed'
    }).lean();

    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch confirmed companies' });
  }
});

router.patch('/companies/:id/confirmation', async (req, res) => {
  try {
    const companyId = req.params.id;
    const { role, expected_month, expected_year, drive_type } = req.body;

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    company.confirmation_status = 'confirmed';
    if (role !== undefined) company.role = role;
    if (expected_month !== undefined) company.expected_month = expected_month;
    if (expected_year !== undefined) company.expected_year = expected_year;
    if (drive_type !== undefined) company.drive_type = drive_type;

    await company.save();

    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update company confirmation status' });
  }
});

router.patch('/companies/:id/placement-details', async (req, res) => {
  try {
    const companyId = req.params.id;
    const { drive_type, role, academic_year } = req.body;

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (drive_type !== undefined) company.drive_type = drive_type;
    if (role !== undefined) company.role = role;
    if (academic_year !== undefined) company.academic_year = academic_year;

    await company.save();

    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update company placement details' });
  }
});

router.get('/branch/:branch_id/not-confirmed', async (req, res) => {
  try {
    const branchId = new mongoose.Types.ObjectId(req.params.branch_id);
    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    const companies = await Company.find({
      assignedBranch: branch.name,
      confirmation_status: { $ne: 'confirmed' }
    }).lean();

    const companyIds = companies.map(c => c._id);
    const allHrContacts = await HrContact.find({ company_id: { $in: companyIds } }).lean();
    const allContactLogs = await ContactLog.find({ company_id: { $in: companyIds } }).sort({ contact_date: -1 }).lean();

    const hrContactMap = allHrContacts.reduce((acc: any, curr: any) => {
      const key = curr.company_id.toString();
      acc[key] = acc[key] || [];
      acc[key].push(curr);
      return acc;
    }, {});

    const logMap = allContactLogs.reduce((acc: any, curr: any) => {
      const key = curr.company_id.toString();
      acc[key] = acc[key] || [];
      acc[key].push(curr);
      return acc;
    }, {});

    const result = companies.map(company => ({
      ...company,
      hr_contacts: hrContactMap[company._id.toString()] || [],
      contact_logs: logMap[company._id.toString()] || []
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch not confirmed companies' });
  }
});

// POST /api/branch/:branch_id/manual-company
router.post('/branch/:branch_id/manual-company', async (req, res) => {
  const branchIdParam = req.params.branch_id;

  let branchInfo;
  if (mongoose.Types.ObjectId.isValid(branchIdParam)) {
    branchInfo = await Branch.findById(branchIdParam);
  } else {
    branchInfo = await Branch.findOne({ name: branchIdParam });
  }

  if (!branchInfo) {
    return res.status(404).json({ error: 'Branch not found' });
  }

  const lockKey = `sync_lock_${branchInfo.name}`;
  const locked = await acquireLock(lockKey, 30);
  if (!locked) {
    return res.status(409).json({ error: 'Another user is currently modifying this branch. Please try again in a moment.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { companyName, hrName, hrPhone, hrEmail, linkedinProfile } = req.body;
    if (!companyName) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Company Name is required' });
    }

    const normalizedName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let company = await Company.findOne({ normalizedName }).session(session);

    if (company) {
      // Check if it belongs to another branch
      if (company.assignedBranch && company.assignedBranch !== branchInfo.name) {
        if (session.inTransaction()) await session.abortTransaction();
        session.endSession();
        await releaseLock(lockKey);
        return res.status(409).json({ error: `This company is already contacted by the ${company.assignedBranch} department (Contact Person: ${company.contactOwner || 'Unknown'}). Please do not duplicate outreach.` });
      }

      if (company.is_verified_by_admin) {
        if (session.inTransaction()) await session.abortTransaction();
        session.endSession();
        await releaseLock(lockKey);
        return res.status(403).json({ error: 'This company is verified by Admin and its HR details cannot be modified.' });
      }

      // Update existing company
      company.syncStatus = 'pending'; // Queue for sheet sync
      await company.save({ session });
    } else {
      // Create new company
      company = new Company({
        companyName,
        normalizedName,
        assignedBranch: branchInfo.name,
        syncStatus: 'pending',
        status: CompanyStatus.DISCOVERED,
        placementScore: 0,
        confidenceScore: 0,
        aiConfidence: 0,
        source: {
          platform: 'MANUAL',
          sourceUrl: 'MANUAL',
          discoveredAt: new Date()
        },
        discoveryHistory: [],
        startupSignals: [],
        confirmation_status: 'not_confirmed',
        contact_status: 'not_contacted'
      });
      await company.save({ session });
    }

    // Upsert HrContact
    let hrContact = await HrContact.findOne({ company_id: company._id }).session(session);
    if (hrContact) {
      if (hrName) hrContact.name = hrName;
      if (hrPhone) hrContact.mobile = hrPhone;
      if (hrEmail) hrContact.email = hrEmail;
      if (linkedinProfile) hrContact.linkedin_url = linkedinProfile;
      await hrContact.save({ session });
    } else if (hrName || hrPhone || hrEmail || linkedinProfile) {
      await HrContact.create([{
        company_id: company._id,
        name: hrName,
        mobile: hrPhone,
        email: hrEmail,
        linkedin_url: linkedinProfile
      }], { session });
    }

    try {
      const syncResult = await googleSheetService.appendCompaniesToSheet([company as any], branchInfo.name);
      if (syncResult.success) {
        company.syncStatus = 'synced';
        company.lastSynced = new Date();
        await company.save({ session });
      } else {
        throw new Error('Google Sheets sync reported failure.');
      }
    } catch (syncError) {
      console.error('Immediate sync failed:', syncError);
      throw new Error('Google Sheets Sync Failed: Rollback initiated');
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, company });
  } catch (error) {
    console.error('Manual company add error:', error);
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    res.status(500).json({ error: 'Failed to add or update company' });
  } finally {
    await releaseLock(lockKey);
  }
});

router.post('/branch/:branch_id/bulk-validate-companies', async (req, res) => {
  try {
    const branchIdParam = req.params.branch_id;
    let branch;
    if (mongoose.Types.ObjectId.isValid(branchIdParam)) {
      branch = await Branch.findById(branchIdParam);
    }
    if (!branch) {
      branch = await Branch.findOne({ name: branchIdParam });
    }
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    const { companies } = req.body;
    if (!Array.isArray(companies)) return res.status(400).json({ error: 'Companies array is required' });

    const existingCompanies = await Company.find().select('normalizedName assignedBranch contactOwner').lean();
    const existingMap = new Map(existingCompanies.map((c: any) => [c.normalizedName, c]));

    const validCompaniesMap = new Map<string, any>();
    const duplicateCompanies = [];
    const conflictCompanies = [];

    for (const c of companies) {
      if (!c.companyName) continue;
      const normalized = c.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');

      const existing = existingMap.get(normalized);
      if (existing) {
        if (existing.assignedBranch && existing.assignedBranch !== branch.name) {
          conflictCompanies.push({
            ...c,
            companyId: existing._id,
            conflictBranch: existing.assignedBranch,
            conflictOwner: existing.contactOwner || 'Unknown'
          });
        } else {
          duplicateCompanies.push(c);
        }
      } else {
        if (validCompaniesMap.has(normalized)) {
          const existingValid = validCompaniesMap.get(normalized);
          if (!existingValid.additionalContacts) existingValid.additionalContacts = [];
          existingValid.additionalContacts.push({
            hrName: c.hrName || '',
            hrEmail: c.hrEmail || '',
            hrPhone: c.hrPhone || '',
            sourceSheet: 'Bulk Upload',
            academicYear: 'Current Year'
          });
        } else {
          validCompaniesMap.set(normalized, { ...c, additionalContacts: [] });
        }
      }
    }

    const validCompanies = Array.from(validCompaniesMap.values());

    res.json({
      validCount: validCompanies.length,
      duplicateCount: duplicateCompanies.length,
      conflictCount: conflictCompanies.length,
      validCompanies,
      duplicateCompanies,
      conflictCompanies
    });
  } catch (error) {
    console.error('Bulk validate error:', error);
    res.status(500).json({ error: 'Failed to validate companies' });
  }
});

router.post('/branch/:branch_id/bulk-import-companies', async (req, res) => {
  const branchIdParam = req.params.branch_id;

  let branchInfo;
  if (mongoose.Types.ObjectId.isValid(branchIdParam)) {
    branchInfo = await Branch.findById(branchIdParam);
  } else {
    branchInfo = await Branch.findOne({ name: branchIdParam });
  }

  if (!branchInfo) {
    return res.status(404).json({ error: 'Branch not found' });
  }

  const lockKey = `sync_lock_${branchInfo.name}`;
  const locked = await acquireLock(lockKey, 30);
  if (!locked) {
    return res.status(409).json({ error: 'Another user is currently modifying this branch. Please try again in a moment.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { companies } = req.body;
    if (!Array.isArray(companies)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Companies array is required' });
    }

    const bulkOps: any[] = [];

    for (const c of companies) {
      const normalizedName = c.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const companyId = new mongoose.Types.ObjectId();

      bulkOps.push({
        updateOne: {
          filter: { normalizedName },
          update: {
            $setOnInsert: {
              _id: companyId,
              companyName: c.companyName,
              normalizedName,
              assignedBranch: branchInfo.name,
              assignedBranchId: branchInfo._id,
              syncStatus: 'pending',
              status: CompanyStatus.DISCOVERED,
              placementScore: 0,
              confidenceScore: 0,
              aiConfidence: 0,
              source: {
                platform: 'EXCEL_IMPORT',
                sourceUrl: 'EXCEL_IMPORT',
                discoveredAt: new Date()
              },
              discoveryHistory: [],
              startupSignals: [],
              confirmation_status: 'not_confirmed',
              contact_status: 'not_contacted'
            },
            $push: {
              additionalContacts: { $each: c.additionalContacts || [] }
            }
          },
          upsert: true
        }
      });
    }

    let insertedCompanies: any[] = [];
    const newHrContacts: any[] = [];

    if (bulkOps.length > 0) {
      const result = await Company.bulkWrite(bulkOps, { session });
      
      const upsertedIdsArray = Object.values(result.upsertedIds || {});
      
      if (upsertedIdsArray.length > 0) {
        insertedCompanies = await Company.find({ _id: { $in: upsertedIdsArray } }).session(session);
        
        for (const c of companies) {
          const normalizedName = c.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const inserted = insertedCompanies.find(doc => doc.normalizedName === normalizedName);
          
          if (inserted && (c.hrName || c.hrPhone || c.hrEmail || c.linkedinProfile)) {
            newHrContacts.push({
              company_id: inserted._id,
              name: c.hrName,
              mobile: c.hrPhone,
              email: c.hrEmail,
              linkedin_url: c.linkedinProfile
            });
          }
        }

        if (newHrContacts.length > 0) {
          await HrContact.insertMany(newHrContacts, { session });
        }
      }
    }

    if (insertedCompanies.length > 0) {
      try {
        const syncResult = await googleSheetService.appendCompaniesToSheet(insertedCompanies as any[], branchInfo.name);
        if (syncResult.success) {
          const companyIds = insertedCompanies.map(c => c._id);
          await Company.updateMany(
            { _id: { $in: companyIds } },
            { $set: { syncStatus: 'synced', lastSynced: new Date() } },
            { session }
          );
        } else {
          throw new Error('Google Sheets sync reported failure.');
        }
      } catch (syncError) {
        console.error('Immediate bulk sync failed:', syncError);
        throw new Error('Google Sheets Bulk Sync Failed: Rollback initiated');
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, importedCount: insertedCompanies.length });
  } catch (error) {
    console.error('Bulk import error:', error);
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    const errorMessage = error instanceof Error && error.message.includes('Google Sheet') 
      ? error.message 
      : 'Failed to bulk import companies';
    res.status(500).json({ error: errorMessage });
  } finally {
    await releaseLock(lockKey);
  }
});

router.patch('/companies/:id/mark-delete', async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, { pending_delete: true }, { new: true });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark company for deletion' });
  }
});

router.post('/branch/:branch_id/sync-deletions', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const branchId = new mongoose.Types.ObjectId(req.params.branch_id);
    const branch = await Branch.findById(branchId).session(session);
    if (!branch) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Branch not found' });
    }

    const companiesToDelete = await Company.find({
      assignedBranch: branch.name,
      pending_delete: true
    }).session(session);

    if (companiesToDelete.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'No marked companies to delete' });
    }

    const companyIdsToDelete = companiesToDelete.map(c => c._id.toString());

    if (companiesToDelete.length > 0) {
      const settings = await Settings.findOne();
      if (!settings) throw new Error('Settings not found');

      const sheetTab = branch.sheet_tab_ref || branch.name;

      const now = new Date();
      const currentYear = now.getFullYear();
      let currentAcademicYear = '';
      if (now.getMonth() < 5) {
        currentAcademicYear = `${currentYear - 1}-${currentYear}`;
      } else {
        currentAcademicYear = `${currentYear}-${currentYear + 1}`;
      }

      // No sheet_row_ref available anymore since we flattened and removed it
      // So GoogleSheetProvider.deleteRows won't work by row ref from DB. 
      // Need to just ignore sheet deletion or let user delete from sheet manually.
      // (Simplified sync architecture means we skip deleting from sheets automatically for now).
    }

    const historyLogs = companyIdsToDelete.map(id => ({
      company_id: id,
      field_changed: 'status',
      old_value: 'pending_delete',
      new_value: 'deleted_from_branch',
      changed_by: 'System Sync'
    }));
    await CompanyStatusHistory.insertMany(historyLogs, { session });

    await HrContact.deleteMany({ company_id: { $in: companyIdsToDelete } }, { session });
    await ContactLog.deleteMany({ company_id: { $in: companyIdsToDelete } }, { session });
    await Company.deleteMany({ _id: { $in: companyIdsToDelete } }, { session });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Sync successful', deletedCount: companyIdsToDelete.length });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Failed to sync deletions' });
  }
});
// --- HISTORY API ---
router.get('/history/assigned-by-branch', async (req, res) => {
  try {
    const results = await Company.aggregate([
      { $match: { assignedBranch: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$assignedBranch',
          branchName: { $first: '$assignedBranch' },
          companies: {
            $push: {
              _id: '$_id',
              companyName: '$companyName',
              role: '$role',
              drive_type: '$drive_type',
              status: '$status',
              confirmation_status: '$confirmation_status',
              assigned_at: '$updatedAt'
            }
          }
        }
      },
      { $sort: { branchName: 1 } }
    ]);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branch assignments history' });
  }
});

function getCurrentCycleStart(overrideDate?: string) {
  if (overrideDate && process.env.NODE_ENV !== 'production') {
    return new Date(overrideDate);
  }
  const now = new Date();
  const month = now.getMonth(); // 0-indexed. June is 5.
  const year = now.getFullYear();
  if (month >= 5) { // June or after
    return new Date(year, 5, 1);
  } else {
    return new Date(year - 1, 5, 1);
  }
}

async function getScanStats(fromDate?: Date, toDate?: Date) {
  const companyQuery: any = {};
  if (fromDate || toDate) {
    companyQuery.createdAt = {};
    if (fromDate) companyQuery.createdAt.$gte = fromDate;
    if (toDate) companyQuery.createdAt.$lte = toDate;
  }

  const totalScanned = await Company.countDocuments(companyQuery);
  const scannedCompanies = await Company.find(companyQuery).lean();

  let internship = 0;
  let fullTime = 0;
  let startup = 0;

  scannedCompanies.forEach(c => {
    if (c.internshipAvailable) internship++;
    if (c.fresherHiring) fullTime++;
    if (['Seed', 'Series A', 'Series B'].includes(c.fundingStage || '')) startup++;
  });

  const historyQuery: any = { field_changed: 'review_status' };
  if (fromDate || toDate) {
    historyQuery.changed_at = {};
    if (fromDate) historyQuery.changed_at.$gte = fromDate;
    if (toDate) historyQuery.changed_at.$lte = toDate;
  }

  const statusChanges = await CompanyStatusHistory.find(historyQuery).lean();
  let totalReviewed = 0;
  let totalApproved = 0;

  statusChanges.forEach(h => {
    if (h.new_value === 'approved') {
      totalReviewed++;
      totalApproved++;
    }
  });

  const rejectedHistoryQuery: any = { field_changed: 'status', new_value: 'REJECTED' };
  if (fromDate || toDate) {
    rejectedHistoryQuery.changed_at = {};
    if (fromDate) rejectedHistoryQuery.changed_at.$gte = fromDate;
    if (toDate) rejectedHistoryQuery.changed_at.$lte = toDate;
  }
  const rejectedChanges = await CompanyStatusHistory.find(rejectedHistoryQuery).lean();
  totalReviewed += rejectedChanges.length;

  return {
    totalScanned,
    totalReviewed,
    totalApproved,
    breakdown: { internship, fullTime, startup }
  };
}

router.get('/history/scan-stats', async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;
    const stats = await getScanStats(from, to);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scan stats' });
  }
});

router.get('/history/current-scan-stats', async (req, res) => {
  try {
    const fromDate = getCurrentCycleStart(req.query.override_cycle_start as string);
    const stats = await getScanStats(fromDate);
    res.json({ current_cycle_start: fromDate, ...stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current scan stats' });
  }
});

// --- SOURCES ---
router.get('/sources', async (req, res) => {
  try {
    const sources = await Source.find();
    res.json(sources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

router.post('/sources', async (req, res) => {
  try {
    const source = new Source(req.body);
    await source.save();
    res.json(source);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create source' });
  }
});

router.put('/sources/:id/toggle', async (req, res) => {
  try {
    const source = await Source.findById(req.params.id);
    if (!source) return res.status(404).json({ error: 'Source not found' });

    source.isEnabled = !source.isEnabled;
    await source.save();
    res.json(source);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle source' });
  }
});

router.delete('/sources/:id', async (req, res) => {
  try {
    const source = await Source.findByIdAndDelete(req.params.id);
    if (!source) return res.status(404).json({ error: 'Source not found' });
    res.json({ message: 'Source deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete source' });
  }
});

// Helper for dynamic academic year calculation
function getAcademicYears(overrideYear?: string) {
  let current: string;
  if (overrideYear && process.env.NODE_ENV !== 'production') {
    current = overrideYear;
  } else {
    const now = new Date();
    const year = now.getFullYear();
    if (now.getMonth() < 6) { // Jan - June
      current = `${year - 1}-${year}`;
    } else { // July - Dec
      current = `${year}-${year + 1}`;
    }
  }
  const [start, end] = current.split('-');
  const last = `${parseInt(start) - 1}-${parseInt(end) - 1}`;
  return { current, last };
}

function aggregateCompanyGroups(companies: any[]) {
  const total = companies.length;
  const drive_types: Record<string, number> = {};
  const roles: Record<string, number> = {};

  companies.forEach(c => {
    // Standardize empty/null cases
    let dt = (c.drive_type || 'Unknown').trim();
    if (dt.toLowerCase() === 'pool') dt = 'Pool';
    if (dt.toLowerCase() === 'in-campus' || dt.toLowerCase() === 'incampus') dt = 'In-Campus';

    drive_types[dt] = (drive_types[dt] || 0) + 1;

    let r = (c.role || 'General Application').trim();
    roles[r] = (roles[r] || 0) + 1;
  });

  return { total, drive_types, roles, companies };
}

router.post('/target-companies/import', async (req, res) => {
  try {
    const companies = req.body;
    if (!Array.isArray(companies)) {
      return res.status(400).json({ error: 'Payload must be an array' });
    }

    // Clear out target companies matching the academic years provided in the payload
    const years = new Set(companies.map(c => c.academic_year).filter(Boolean));
    for (const year of years) {
      await TargetCompany.deleteMany({ academic_year: year });
    }

    await TargetCompany.insertMany(companies);
    res.json({ message: 'Target companies imported successfully', count: companies.length });
  } catch (error) {
    console.error('Import target companies error:', error);
    res.status(500).json({ error: 'Failed to import target companies' });
  }
});

router.get('/dashboard/target-companies', async (req, res) => {
  try {
    const { current } = getAcademicYears(req.query.override_year as string);
    const companies = await TargetCompany.find({ academic_year: current }).lean();

    // Normalize data shape to match company response
    const normalizedCompanies = companies.map(c => ({
      ...c,
      companyName: c.company_name
    }));

    res.json({ academic_year: current, ...aggregateCompanyGroups(normalizedCompanies) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch target companies' });
  }
});

router.get('/dashboard/confirmed-last-year', async (req, res) => {
  try {
    const { last } = getAcademicYears(req.query.override_year as string);
    const companies = await Company.find({
      confirmation_status: 'confirmed',
      academic_year: last
    }).lean();
    res.json({ academic_year: last, ...aggregateCompanyGroups(companies) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch confirmed companies for last year' });
  }
});

router.get('/dashboard/summary', async (req, res) => {
  try {
    const { current, last } = getAcademicYears(req.query.override_year as string);
    const branchId = req.query.branchId as string;

    let branchName = '';
    if (branchId) {
      const branch = await Branch.findById(branchId);
      if (branch) branchName = branch.name;
    }

    // Base query for current year active companies
    const currentYearBaseQuery = {
      $or: [
        { academic_year: current },
        { academic_year: null },
        { academic_year: '' },
        { academic_year: { $exists: false } }
      ]
    };

    // If branchName is provided, we filter confirmed and contact today counts for that branch.
    // If not, we count globally (e.g. for admin)
    const confirmedQuery: any = {
      ...currentYearBaseQuery,
      confirmation_status: 'confirmed'
    };
    if (branchName) {
      confirmedQuery.assignedBranch = branchName;
    }

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    const contactTodayQuery: any = {
      ...currentYearBaseQuery,
      confirmation_status: { $ne: 'confirmed' },
      nextFollowupDate: { $lte: endOfToday }
    };
    if (branchName) {
      contactTodayQuery.assignedBranch = branchName;
    }

    const brochureJnfQuery: any = {
      ...currentYearBaseQuery,
      contact_outcome: 'brochure_jnf',
      emailDeliveryStatus: { $ne: 'sent' }
    };
    if (branchName) {
      brochureJnfQuery.assignedBranch = branchName;
    }

    const brochureSentQuery: any = {
      ...currentYearBaseQuery,
      emailDeliveryStatus: 'sent'
    };
    if (branchName) {
      brochureSentQuery.assignedBranch = branchName;
    }

    const [pendingReview, confirmedThisYear, contactToday, previousCompanyCount, brochureJnfCount, brochureSentCount] = await Promise.all([
      Company.countDocuments({ data_source: 'scanned', review_status: 'scanned' }),
      Company.countDocuments(confirmedQuery),
      Company.countDocuments(contactTodayQuery),
      PreviousCompany.countDocuments({ academicYear: last }),
      Company.countDocuments(brochureJnfQuery),
      Company.countDocuments(brochureSentQuery)
    ]);

    res.json({
      pending_review_count: pendingReview,
      contact_today_count: contactToday,
      brochure_jnf_requests_count: brochureJnfCount,
      brochure_sent_count: brochureSentCount,
      confirmed_this_year: {
        academic_year: current,
        total: confirmedThisYear
      },
      confirmed_last_year: {
        academic_year: last,
        total: previousCompanyCount
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

router.get('/dashboard/recent-activity', async (req, res) => {
  try {
    const branchId = req.query.branchId as string;
    
    // Get start of today (local time handling via simple Date comparison)
    // To ensure we capture anything from 'today' in the server timezone
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const query: any = {
      contact_date: { $gte: startOfToday }
    };
    
    if (branchId) {
      query.branch_id = branchId;
    }

    const logs = await ContactLog.find(query)
      .populate('company_id', 'companyName assignedBranch emailDeliveryStatus')
      .populate('branch_id', 'name')
      .sort({ contact_date: -1 })
      .lean();

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});
router.get('/dashboard/brochure-jnf-requests', async (req, res) => {
  try {
    const branchId = req.query.branchId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    let branchName = '';
    if (branchId) {
      const branch = await Branch.findById(branchId);
      if (branch) branchName = branch.name;
    }

    const { current } = getAcademicYears();
    const currentYearBaseQuery = {
      $or: [
        { academic_year: current },
        { academic_year: null },
        { academic_year: '' },
        { academic_year: { $exists: false } }
      ]
    };

    const query: any = {
      ...currentYearBaseQuery,
      contact_outcome: 'brochure_jnf',
      emailDeliveryStatus: { $ne: 'sent' }
    };

    if (branchName) {
      query.assignedBranch = branchName;
    }

    const [companies, total] = await Promise.all([
      Company.find(query)
        .sort({ emailStatusUpdatedAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Company.countDocuments(query)
    ]);

    const companyIds = companies.map(c => c._id).filter(Boolean);
    const hrContacts = companyIds.length > 0
      ? await HrContact.find({ company_id: { $in: companyIds } }).lean()
      : [];
    const hrMap = new Map(hrContacts.map(h => [h.company_id.toString(), h]));

    const enriched = companies.map((c: any) => ({
      _id: c._id,
      company_name: c.companyName || c.company_name || 'Unknown',
      drive_type: c.drive_type || null,
      role: c.role || null,
      package: c.package || null,
      expected_month: c.expected_month || null,
      expected_year: c.expected_year || null,
      assignedBranch: c.assignedBranch || null,
      isPreviousCompany: false,
      emailDeliveryStatus: c.emailDeliveryStatus || null,
      emailFailureReason: c.emailFailureReason || null,
      emailStatusUpdatedAt: c.emailStatusUpdatedAt || null,
      hr: hrMap.get(c._id?.toString()) ? {
        name: hrMap.get(c._id.toString())?.name,
        email: hrMap.get(c._id.toString())?.email,
        mobile: hrMap.get(c._id.toString())?.mobile,
      } : null
    }));

    res.json({ companies: enriched, total, page, per_page: limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brochure jnf requests' });
  }
});

router.get('/dashboard/brochure-sent-companies', async (req, res) => {
  try {
    const branchId = req.query.branchId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    let branchName = '';
    if (branchId) {
      const branch = await Branch.findById(branchId);
      if (branch) branchName = branch.name;
    }

    const { current } = getAcademicYears();
    const currentYearBaseQuery = {
      $or: [
        { academic_year: current },
        { academic_year: null },
        { academic_year: '' },
        { academic_year: { $exists: false } }
      ]
    };

    const query: any = {
      ...currentYearBaseQuery,
      emailDeliveryStatus: 'sent'
    };

    if (branchName) {
      query.assignedBranch = branchName;
    }

    const [companies, total] = await Promise.all([
      Company.find(query)
        .sort({ emailStatusUpdatedAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Company.countDocuments(query)
    ]);

    const companyIds = companies.map(c => c._id).filter(Boolean);
    const hrContacts = companyIds.length > 0
      ? await HrContact.find({ company_id: { $in: companyIds } }).lean()
      : [];
    const hrMap = new Map(hrContacts.map(h => [h.company_id.toString(), h]));

    const enriched = companies.map((c: any) => ({
      _id: c._id,
      company_name: c.companyName || c.company_name || 'Unknown',
      drive_type: c.drive_type || null,
      role: c.role || null,
      package: c.package || null,
      expected_month: c.expected_month || null,
      expected_year: c.expected_year || null,
      assignedBranch: c.assignedBranch || null,
      isPreviousCompany: false,
      emailDeliveryStatus: c.emailDeliveryStatus || null,
      emailFailureReason: c.emailFailureReason || null,
      emailStatusUpdatedAt: c.emailStatusUpdatedAt || null,
      hr: hrMap.get(c._id?.toString()) ? {
        name: hrMap.get(c._id.toString())?.name,
        email: hrMap.get(c._id.toString())?.email,
        mobile: hrMap.get(c._id.toString())?.mobile,
      } : null
    }));

    res.json({ companies: enriched, total, page, per_page: limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brochure sent companies' });
  }
});

router.get('/dashboard/confirmed-companies', async (req, res) => {
  try {
    const year = req.query.year as string;
    const branchId = req.query.branchId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const { current, last } = getAcademicYears();
    const isCurrentYear = year === current;
    const isLastYear = year === last;

    let branchName = '';
    if (branchId) {
      const branch = await Branch.findById(branchId);
      if (branch) branchName = branch.name;
    }

    let companies: any[] = [];
    let total = 0;

    if (isLastYear) {
      // Fetch Previous Companies
      [companies, total] = await Promise.all([
        PreviousCompany.find({ academicYear: year })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        PreviousCompany.countDocuments({ academicYear: year })
      ]);

      const enriched = companies.map(c => ({
        _id: c._id,
        company_name: c.companyName || 'Unknown',
        drive_type: null,
        role: null,
        package: null,
        expected_month: null,
        expected_year: null,
        assignedBranch: c.contactedByBranchName || null,
        isPreviousCompany: true,
        hr: {
          name: c.hrName || undefined,
          email: c.hrEmail || undefined,
          mobile: c.hrPhone || undefined,
        }
      }));

      return res.json({ companies: enriched, total, page, per_page: limit, pages: Math.ceil(total / limit) });
    }

    // Otherwise, current year
    const query: any = {
      confirmation_status: 'confirmed',
      $or: [
        { academic_year: year },
        { academic_year: null },
        { academic_year: '' },
        { academic_year: { $exists: false } }
      ]
    };

    if (branchName) {
      query.assignedBranch = branchName;
    }

    [companies, total] = await Promise.all([
      Company.find(query)
        .sort({ expected_year: -1, expected_month: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Company.countDocuments(query)
    ]);

    // Join HR contacts for current year companies
    const companyIds = companies.map(c => c._id).filter(Boolean);
    const hrContacts = companyIds.length > 0
      ? await HrContact.find({ company_id: { $in: companyIds } }).lean()
      : [];
    const hrMap = new Map(hrContacts.map(h => [h.company_id.toString(), h]));

    const enriched = companies.map(c => ({
      _id: c._id,
      company_name: c.companyName || c.company_name || 'Unknown',
      drive_type: c.drive_type || null,
      role: c.role || null,
      package: c.package || null,
      expected_month: c.expected_month || null,
      expected_year: c.expected_year || null,
      assignedBranch: c.assignedBranch || null,
      isPreviousCompany: false,
      hr: hrMap.get(c._id?.toString()) ? {
        name: hrMap.get(c._id.toString())?.name,
        email: hrMap.get(c._id.toString())?.email,
        mobile: hrMap.get(c._id.toString())?.mobile,
      } : null
    }));

    res.json({ companies: enriched, total, page, per_page: limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch confirmed companies list' });
  }
});

// --- COMPANIES ---
router.get('/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'Not configured in .env';

    let totalSynced = settings.totalSynced;
    const { branchName } = req.query;
    if (branchName && typeof branchName === 'string') {
      totalSynced = await Company.countDocuments({ assignedBranch: branchName, syncStatus: 'synced' });
    }

    res.json({ ...settings.toJSON(), totalSynced, serviceAccountEmail });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(req.body);
    } else {
      settings.currentAcademicYearSheetId = req.body.currentAcademicYearSheetId;
      settings.mtechCurrentAcademicYearSheetId = req.body.mtechCurrentAcademicYearSheetId;
      settings.pastAcademicYearSheetId = req.body.pastAcademicYearSheetId;
    }
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

router.post('/settings/upload-logo', uploadLogo.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    // The image is uploaded to cloudinary, multer-storage-cloudinary gives us the path which is the URL
    const logoUrl = (req.file as any).path;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({ portalLogoUrl: logoUrl });
    } else {
      settings.portalLogoUrl = logoUrl;
    }
    await settings.save();

    res.status(200).json({ success: true, url: logoUrl });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error during upload' });
  }
});

router.get('/settings/google-sheet/service-account', (req, res) => {
  res.json({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'Not configured in .env' });
});

router.post('/settings/google-sheet/test', async (req, res) => {
  const { sheetId } = req.body;
  if (!sheetId) {
    return res.status(400).json({ error: 'sheetId is required' });
  }

  const result = await googleSheetService.testConnection(sheetId);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true, message: 'Connection successful' });
});

// --- SCAN HISTORY ---
router.get('/history', async (req, res) => {
  try {
    const history = await ScanHistory.find().sort({ date: -1 }).limit(50).lean();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scan history' });
  }
});

router.get('/history/:id', async (req, res) => {
  try {
    const history = await ScanHistory.findById(req.params.id).lean();
    if (!history) return res.status(404).json({ error: 'History not found' });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history record' });
  }
});

router.delete('/history/:id', async (req, res) => {
  try {
    const history = await ScanHistory.findByIdAndDelete(req.params.id);
    if (!history) return res.status(404).json({ error: 'History not found' });
    res.json({ message: 'History record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete history record' });
  }
});

router.get('/history/:id/raw', async (req, res) => {
  try {
    const raw = await RawDiscovery.find({ scanHistoryId: req.params.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(raw);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch raw discoveries' });
  }
});

router.post('/history/raw/:id/validate', async (req, res) => {
  try {
    const rawDoc = await RawDiscovery.findById(req.params.id);
    if (!rawDoc) return res.status(404).json({ error: 'Raw discovery not found' });

    if (rawDoc.status === 'VALIDATED' || rawDoc.status === 'DUPLICATE') {
      return res.status(400).json({ error: 'Already processed' });
    }

    const pipeline = new AgentPipeline();
    const result = await pipeline.processDiscoveredCompany({
      companyName: rawDoc.companyName,
      website: rawDoc.website || '',
      description: rawDoc.description || '',
      source: rawDoc.source,
      sourceUrl: rawDoc.sourceUrl,
      careersUrl: rawDoc.careersUrl || '',
      salaryText: rawDoc.salaryText || ''
    }, rawDoc.scanHistoryId.toString(), rawDoc._id as unknown as string, true);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to manually validate raw company' });
  }
});

// --- API KEY MANAGEMENT ROUTES ---
router.get('/branches/:branch_id/api-keys', apiKeyController.getApiKeys);
router.post('/branches/:branch_id/api-keys/validate', apiKeyController.validateAndSaveKey);
router.delete('/branches/:branch_id/api-keys/:key_id', apiKeyController.disableApiKey);
router.post('/branches/:branch_id/api-keys/:key_id/replace', apiKeyController.replaceApiKey);
router.get('/branches/:branch_id/notifications', apiKeyController.getNotifications);
router.post('/branches/:branch_id/notifications/:id/dismiss', apiKeyController.dismissNotification);

// --- HR VALIDATION ROUTES ---
router.post('/companies/:company_id/find-hr', hrValidationController.findHrContact);
router.post('/companies/:company_id/hr-contacts/commit', hrValidationController.commitHrContact);
router.post('/companies/:company_id/hr-contacts/approve-pending', hrValidationController.approvePendingContact);
router.post('/companies/:company_id/hr-contacts/discard-pending', hrValidationController.discardPendingContact);
router.patch('/companies/:company_id/hr-contacts/:contact_id/verify', hrValidationController.verifyHrContact);
router.patch('/companies/:company_id/hr-contacts/:contact_id/flag', protect, hrValidationController.flagHrContact);
router.delete('/companies/:company_id/hr-contacts/:contact_id', hrValidationController.deleteHrContact);
router.post('/companies/:company_id/acknowledge-hr-update', hrValidationController.acknowledgeHrUpdate);

// Startup migration for legacy scanned companies
(async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('open', resolve));
    }

    // 1. Set data_source = 'scanned' where data_source is missing
    const res1 = await Company.updateMany(
      { data_source: { $exists: false } } as any,
      { $set: { data_source: 'scanned' } }
    );
    if (res1.modifiedCount > 0) {
      console.log(`[Migration] Set data_source='scanned' for ${res1.modifiedCount} legacy companies.`);
    }

    // 2. Set review_status = 'scanned' where missing and status is not APPROVED
    const res2 = await Company.updateMany(
      { review_status: { $exists: false }, status: { $ne: 'APPROVED' } } as any,
      { $set: { review_status: 'scanned' } }
    );
    if (res2.modifiedCount > 0) {
      console.log(`[Migration] Set review_status='scanned' for ${res2.modifiedCount} legacy pending companies.`);
    }

    // 3. Set review_status = 'approved' where missing and status is APPROVED
    const res3 = await Company.updateMany(
      { review_status: { $exists: false }, status: 'APPROVED' } as any,
      { $set: { review_status: 'approved' } }
    );
    if (res3.modifiedCount > 0) {
      console.log(`[Migration] Set review_status='approved' for ${res3.modifiedCount} legacy approved companies.`);
    }
  } catch (err) {
    console.error('[Migration] Failed to run legacy company migration:', err);
  }
})();



// --- MANUAL EMAIL TRACKING ---
import { sendFailureAlertToGroup } from '../services/whatsapp.service';

router.patch('/companies/:id/email-status', protect, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { status, reason, customReason } = req.body;
    
    if (!['sent', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const finalReason = status === 'failed' ? (reason === 'Custom' ? customReason : reason) : undefined;
    
    const company = await Company.findByIdAndUpdate(id, {
      emailDeliveryStatus: status,
      emailFailureReason: finalReason,
      emailStatusUpdatedAt: new Date(),
      emailStatusUpdatedBy: req.user?.name || req.user?.email || 'Unknown User'
    }, { new: true });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (status === 'failed') {
      let hrEmail = company.hrEmail || company.talentAcquisitionEmail || company.founderEmail || 'N/A';
      
      const hrContact = await HrContact.findOne({ company_id: company._id, is_verified: true }) || 
                        await HrContact.findOne({ company_id: company._id });
      if (hrContact && hrContact.email) {
        hrEmail = hrContact.email;
      }

      let pocName = company.assignedBranch || req.user?.name || req.user?.email || 'Unknown User';
      const lastLog = await ContactLog.findOne({ company_id: company._id }).sort({ contact_date: -1 });
      if (lastLog && lastLog.created_by && lastLog.created_by !== 'Admin') {
        pocName = lastLog.created_by;
      }
      
      // Fire and forget
      sendFailureAlertToGroup(company.companyName, hrEmail, finalReason || 'Unknown Error', pocName)
        .catch(console.error);
    }

    res.json(company);
  } catch (error) {
    console.error('Error updating email status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
