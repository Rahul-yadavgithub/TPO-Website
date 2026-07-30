import express from 'express';
import PreviousCompany from '../models/PreviousCompany';
import PreviousCompanyContactRequest from '../models/PreviousCompanyContactRequest';
import { DuplicatePreviousCompany } from '../models/DuplicatePreviousCompany';
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
    const { q, status, branchId } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Query string is required' });
    }

    const applyStatusFilter = (queryObj: any) => {
      if (status === 'not_contacted') {
        queryObj.contactStatus = 'not_contacted';
      } else if (status === 'my_requests') {
        queryObj.contactStatus = { $in: ['requested', 'contacted'] };
        if (branchId) queryObj.contactedByBranchId = branchId;
      } else if (status === 'others_requests') {
        queryObj.contactStatus = { $in: ['requested', 'contacted'] };
        if (branchId) queryObj.contactedByBranchId = { $ne: branchId };
      } else if (status) {
        queryObj.contactStatus = status;
      }
    };

    let query: any = { $text: { $search: q as string } };
    applyStatusFilter(query);


    const attachExistsInCurrentYear = async (companies: any[]) => {
      if (status === 'my_requests' && branchId && companies.length > 0) {
        const normalizedNames = companies.map(c => c.normalizedName);
        const existingCurrentCompanies = await Company.find({
          assignedBranchId: branchId as string,
          normalizedName: { $in: normalizedNames }
        }).select('normalizedName');
        const existingSet = new Set(existingCurrentCompanies.map(c => c.normalizedName));
        return companies.map(c => ({
          ...c.toObject(),
          existsInCurrentYear: existingSet.has(c.normalizedName)
        }));
      }
      return companies.map(c => c.toObject());
    };

    const companies = await PreviousCompany.find(query).limit(10);
    
    // If no text index matches, fallback to regex
    if (companies.length === 0) {
      let regexQuery: any = { companyName: { $regex: q as string, $options: 'i' } };
      applyStatusFilter(regexQuery);
      
      const regexCompanies = await PreviousCompany.find(regexQuery).limit(10);
      const finalRegexCompanies = await attachExistsInCurrentYear(regexCompanies);
      return res.status(200).json({ success: true, data: finalRegexCompanies });
    }

    const finalCompanies = await attachExistsInCurrentYear(companies);
    res.status(200).json({ success: true, data: finalCompanies });
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
      
      const subTab = req.query.subTab as string;
      if (branchId && (subTab === 'new' || subTab === 'existing')) {
        const branch = await mongoose.model('Branch').findById(branchId);
        if (branch) {
          const currentCompanies = await Company.find({ assignedBranch: branch.name }).select('normalizedName');
          const existingNames = currentCompanies.map(c => c.normalizedName);
          
          if (subTab === 'existing') {
            query.normalizedName = { $in: existingNames };
          } else if (subTab === 'new') {
            query.normalizedName = { $nin: existingNames };
          }
        }
      }
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

// @route   GET /api/previous-companies/all-tpo
// @desc    Get all previous companies for TPO portal without restriction
router.get('/all-tpo', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const section = req.query.section as string;
    const q = req.query.q as string;
    const filterByVerified = req.query.verified === 'true';

    let query: any = {};
    if (section) query.section = section;
    if (q) {
      query.$text = { $search: q };
    }
    if (filterByVerified) {
      query.primary_contact_verified = true;
    }

    const total = await PreviousCompany.countDocuments(query);
    const companies = await PreviousCompany.find(query)
      .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: companies,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Fetch all for TPO error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/previous-companies/all
// @desc    Get paginated list of all previous companies (Admin view)
router.get('/all', async (req: any, res) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'communication_tpr') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    let query: any = {};
    if (req.query.q) {
       query.$text = { $search: req.query.q as string };
    }
    if (req.query.section && req.query.section !== 'All') {
      query.section = req.query.section;
    }
    if (req.query.verified === 'true') {
      query.is_verified_by_admin = true;
    } else if (req.query.verified === 'false') {
      query.is_verified_by_admin = { $ne: true };
    }
    if (req.query.branch && req.query.branch !== 'All') {
      query.contactedByBranchName = req.query.branch;
    }

    let companies = [];
    let total = 0;

    if (req.query.q) {
      // First try text search
      companies = await PreviousCompany.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });
      total = await PreviousCompany.countDocuments(query);
      
      // Fallback to regex if text search yields 0 results
      if (companies.length === 0) {
        let regexQuery: any = { ...query, companyName: { $regex: req.query.q as string, $options: 'i' } };
        delete regexQuery.$text;
        companies = await PreviousCompany.find(regexQuery).skip(skip).limit(limit).sort({ createdAt: -1 });
        total = await PreviousCompany.countDocuments(regexQuery);
      }
    } else {
      companies = await PreviousCompany.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });
      total = await PreviousCompany.countDocuments(query);
    }

    res.status(200).json({
      success: true,
      data: companies,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('All list error:', error);
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
      if (previousCompany.contactedByBranchId && previousCompany.contactedByBranchId.toString() !== branchId) {
        return res.status(409).json({ success: false, message: `This company is already ${previousCompany.contactStatus} by the ${previousCompany.contactedByBranchName} branch. Please do not duplicate outreach.` });
      }
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
      if (activeCompany.assignedTPO) {
        return res.status(409).json({ success: false, message: `This company is already being called by TPO ${activeCompany.tpoType || 'Staff'}: ${activeCompany.assignedTPO}.` });
      }
      if (activeCompany.assignedBranchId && activeCompany.assignedBranchId.toString() !== branchId) {
        return res.status(409).json({ success: false, message: `This company is already active and contacted by the ${activeCompany.assignedBranch} department. Please do not duplicate outreach.` });
      }
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
    previousCompany.contactedByTprEmail = req.user.email;
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
    const { branchId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      // It's likely a TPO name, and TPOs bypass the request system.
      return res.status(200).json({ success: true, data: [] });
    }
    const requests = await PreviousCompanyContactRequest.find({ branchId })
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
    const { companyName, academicYear, hrName, hrPhone, hrEmail, section, extraData, is_verified_by_admin, targetSection, primary_contact_flagged } = req.body;
    if (!companyName || !academicYear) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Company name and academic year are required' });
    }

    const normalizedName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let company = await PreviousCompany.findOne({ normalizedName }).session(session);

    if (company) {
      // Upsert: Update existing company
      if (targetSection && targetSection !== 'Primary') {
        // Update a specific additional contact
        if (company.additionalContacts) {
          const contactIndex = company.additionalContacts.findIndex((c: any) => c.sourceSheet === targetSection);
          if (contactIndex !== -1) {
            company.additionalContacts[contactIndex].hrName = hrName || company.additionalContacts[contactIndex].hrName;
            company.additionalContacts[contactIndex].hrPhone = hrPhone || company.additionalContacts[contactIndex].hrPhone;
            company.additionalContacts[contactIndex].hrEmail = hrEmail || company.additionalContacts[contactIndex].hrEmail;
          }
        }
      } else {
        // Update primary contact
        company.hrName = hrName || company.hrName;
        company.hrPhone = hrPhone || company.hrPhone;
        company.hrEmail = hrEmail || company.hrEmail;
        company.section = section || company.section;
        if (primary_contact_flagged !== undefined) {
          company.primary_contact_flagged = primary_contact_flagged;
          if (primary_contact_flagged) company.primary_contact_verified = false;
        }
        if (is_verified_by_admin !== undefined) {
          company.primary_contact_verified = is_verified_by_admin;
          if (is_verified_by_admin) company.primary_contact_flagged = false;
        }
      }
      
      if (academicYear) company.academicYear = academicYear;
      if (is_verified_by_admin !== undefined) company.is_verified_by_admin = is_verified_by_admin;
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
        extraData: extraData || {},
        is_verified_by_admin: is_verified_by_admin || false,
        primary_contact_verified: is_verified_by_admin || false,
        primary_contact_flagged: primary_contact_flagged || false
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

// @route   PATCH /api/previous-companies/:id/update-contact-status
// @desc    Update only the verified/flagged status of a specific contact without syncing
router.patch('/:id/update-contact-status', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { contactId, isVerified, isFlagged } = req.body;

    const previousCompany = await PreviousCompany.findById(id);
    if (!previousCompany) {
      return res.status(404).json({ success: false, message: 'Previous company not found' });
    }

    if (contactId === 'primary') {
      if (isVerified !== undefined) previousCompany.primary_contact_verified = isVerified;
      if (isFlagged !== undefined) previousCompany.primary_contact_flagged = isFlagged;
    } else if (contactId.startsWith('additional-')) {
      const idx = parseInt(contactId.split('-')[1]);
      if (previousCompany.additionalContacts && previousCompany.additionalContacts[idx]) {
        if (isVerified !== undefined) previousCompany.additionalContacts[idx].isVerified = isVerified;
        if (isFlagged !== undefined) previousCompany.additionalContacts[idx].isFlagged = isFlagged;
      }
    } else if (contactId.startsWith('extra-')) {
      const idxStr = contactId.split('-')[1];
      if (previousCompany.extraData) {
        if (isVerified !== undefined) previousCompany.extraData[`OTHER HR VERIFIED ${idxStr}`.trim()] = isVerified.toString();
        if (isFlagged !== undefined) previousCompany.extraData[`OTHER HR FLAGGED ${idxStr}`.trim()] = isFlagged.toString();
        previousCompany.markModified('extraData');
      }
    }

    let anyVerified = false;
    if (previousCompany.primary_contact_verified) anyVerified = true;
    if (previousCompany.additionalContacts && previousCompany.additionalContacts.some((c: any) => c.isVerified)) anyVerified = true;
    if (previousCompany.extraData) {
      const isAnyExtraVerified = Object.keys(previousCompany.extraData).some(key => key.includes('VERIFIED') && previousCompany.extraData![key] === 'true');
      if (isAnyExtraVerified) anyVerified = true;
    }
    
    // Auto-sync company level verification status
    previousCompany.is_verified_by_admin = anyVerified;

    previousCompany.updatedByTprName = req.user.name;
    await previousCompany.save();

    res.json({ success: true, message: 'Contact status updated successfully' });
  } catch (error) {
    console.error('Update contact status error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   PATCH /api/previous-companies/:id/contact-info
// @desc    Update contact info of an approved previous company and add to current year
router.patch('/:id/contact-info', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { hrName, hrEmail, hrPhone, branchId, isVerified, isFlagged } = req.body;

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
    previousCompany.updatedByTprName = req.user.name;
    
    if (isVerified) {
      previousCompany.primary_contact_verified = true;
      previousCompany.primary_contact_flagged = false;
    }
    if (isFlagged) {
      previousCompany.primary_contact_flagged = true;
      previousCompany.primary_contact_verified = false;
    }

    // We no longer just update contactStatus and sync. 
    // Since it's confirmed, we completely remove it from the past year sheet and DB!
    try {
      const settings = await Settings.findOne();
      if (settings && settings.pastAcademicYearSheetId) {
        // Delete from Google Sheet
        await googleSheetService.deletePreviousCompanyFromSheet(previousCompany.toObject(), settings.pastAcademicYearSheetId);
      }
    } catch (e) {
      console.error('Failed to delete previous company from past year sheet:', e);
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
        lastContactStatus: 'not_contacted',
        totalDrivesConducted: 0,
        syncStatus: 'pending',
        primary_contact_verified: isVerified || false,
        primary_contact_flagged: isFlagged || false
      });
      await currentCompany.save();

      const hrContact = new HrContact({
        company_id: currentCompany._id,
        name: hrName,
        mobile: hrPhone,
        email: hrEmail,
        is_incorrect: isFlagged || false
      });
      await hrContact.save();
    } else {
      // Company exists in this branch's DB, so REPLACE the contact info
      currentCompany.hrEmail = hrEmail;
      currentCompany.syncStatus = 'pending';
      if (isVerified) {
        currentCompany.primary_contact_verified = true;
        currentCompany.primary_contact_flagged = false;
      }
      if (isFlagged) {
        currentCompany.primary_contact_flagged = true;
        currentCompany.primary_contact_verified = false;
      }
      await currentCompany.save();

      let hrContact = await HrContact.findOne({ company_id: currentCompany._id });
      if (!hrContact) {
        hrContact = new HrContact({ company_id: currentCompany._id });
      }
      hrContact.name = hrName;
      hrContact.mobile = hrPhone;
      hrContact.email = hrEmail;
      hrContact.is_incorrect = isFlagged || false;
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

    // Finally, completely delete the previous company record from the DB
    await PreviousCompany.findByIdAndDelete(previousCompany._id);

    res.status(200).json({ success: true, message: 'Contact info updated successfully. Company removed from previous year and migrated to current year.', data: previousCompany });
  } catch (error) {
    console.error('Update contact info error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/previous-companies/bulk-validate
// @desc    Admin only: Validate bulk previous company upload and aggregate duplicates
router.post('/bulk-validate', async (req: any, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const { companies } = req.body;
    if (!Array.isArray(companies)) return res.status(400).json({ error: 'Companies array is required' });

    const existingCompanies = await PreviousCompany.find().select('normalizedName academicYear').lean();
    const existingSet = new Set(existingCompanies.map((c: any) => `${c.normalizedName}-${c.academicYear}`));

    const validCompaniesMap = new Map<string, any>();
    const duplicateCompanies = [];

    for (const c of companies) {
      if (!c.companyName || !c.academicYear) continue;
      const normalized = c.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const key = `${normalized}-${c.academicYear}`;
      
      if (existingSet.has(key)) {
        // Already in DB. It's technically a duplicate, but we can treat it as a "to-merge" update later.
        duplicateCompanies.push(c);
      } else {
        if (validCompaniesMap.has(key)) {
          // It's a duplicate WITHIN the uploaded sheet itself.
          const existing = validCompaniesMap.get(key);
          if (!existing.additionalContacts) existing.additionalContacts = [];
          existing.additionalContacts.push({
            hrName: c.hrName || '',
            hrPhone: c.hrPhone || '',
            hrEmail: c.hrEmail || '',
            sourceSheet: c.section || 'Uncategorized',
            academicYear: c.academicYear
          });
        } else {
          validCompaniesMap.set(key, { ...c, additionalContacts: [] });
        }
      }
    }

    const validCompanies = Array.from(validCompaniesMap.values());

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

    // Ensure the DuplicatePreviousCompany collection exists before starting a transaction
    // MongoDB multi-document transactions cannot implicitly create collections.
    await DuplicatePreviousCompany.createCollection().catch(() => {});

    const insertedDocs = [];
    
    for (const c of companies) {
      const normalizedName = c.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      let existingCompany = await PreviousCompany.findOne({ normalizedName, academicYear: c.academicYear }).session(session);
      
      if (existingCompany) {
        // Intercept as a pending duplicate instead of auto-merging
        const duplicate = new DuplicatePreviousCompany({
          originalCompanyId: existingCompany._id,
          companyName: c.companyName,
          normalizedName: normalizedName,
          academicYear: c.academicYear,
          hrName: c.hrName || '',
          hrPhone: c.hrPhone || '',
          hrEmail: c.hrEmail || '',
          section: c.section || 'Uncategorized',
          extraData: c.extraData || {},
          status: 'pending'
        });
        await duplicate.save({ session });
        // We do NOT add it to insertedDocs because it is not verified yet.
      } else {
        // Create new
        const companyDoc = new PreviousCompany({
          companyName: c.companyName,
          normalizedName: normalizedName,
          academicYear: c.academicYear,
          hrName: c.hrName || '',
          hrPhone: c.hrPhone || '',
          hrEmail: c.hrEmail || '',
          section: c.section || 'Uncategorized',
          extraData: c.extraData || {},
          additionalContacts: c.additionalContacts || []
        });
        await companyDoc.save({ session });
        insertedDocs.push(companyDoc);
      }
    }

    // Commit the database transaction first so we don't hold locks during external API calls
    await session.commitTransaction();
    session.endSession();

    // Auto-sync to Google Sheet if configured (outside transaction)
    if (insertedDocs.length > 0) {
      try {
        const settings = await Settings.findOne();
        if (settings && settings.pastAcademicYearSheetId) {
          const syncResult = await googleSheetService.appendPreviousCompaniesToSheet(insertedDocs as any[], settings.pastAcademicYearSheetId);
          if (syncResult.success) {
            const insertedIds = insertedDocs.map(d => d._id);
            await PreviousCompany.updateMany(
              { _id: { $in: insertedIds } },
              { $set: { syncStatus: 'synced', lastSynced: new Date() } }
            );
          } else {
            console.warn('Google Sheets sync reported failure. Cron job will retry later.');
          }
        }
      } catch (syncError) {
        console.error('Immediate bulk sync failed for previous companies. Cron job will retry later.', syncError);
      }
    }

    res.json({ success: true, count: insertedDocs.length });
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

// @route   GET /api/previous-companies/duplicates
// @desc    Admin only: Get paginated list of pending duplicates
router.get('/duplicates', async (req: any, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const q = req.query.q as string;
    const skip = (page - 1) * limit;

    let query: any = { status: 'pending' };
    if (q && q.length >= 2) {
      query.companyName = { $regex: q, $options: 'i' };
    }
    
    // We want to populate originalCompanyId to show side-by-side
    const duplicates = await DuplicatePreviousCompany.find(query)
      .populate('originalCompanyId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await DuplicatePreviousCompany.countDocuments(query);

    res.json({
      duplicates,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Fetch duplicates error:', error);
    res.status(500).json({ error: 'Failed to fetch duplicates' });
  }
});

// @route   POST /api/previous-companies/duplicates/:id/resolve
// @desc    Admin only: Resolve a duplicate (replace_primary, add_extra, or discard)
router.post('/duplicates/:id/resolve', async (req: any, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { action } = req.body; // 'replace_primary', 'add_extra', 'discard'
    
    const duplicate = await DuplicatePreviousCompany.findById(req.params.id).session(session);
    if (!duplicate || duplicate.status === 'resolved') {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Pending duplicate not found' });
    }

    const company = await PreviousCompany.findById(duplicate.originalCompanyId).session(session);
    if (!company) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Original company not found' });
    }

    if (action === 'replace_primary') {
      company.hrName = duplicate.hrName || company.hrName;
      company.hrPhone = duplicate.hrPhone || company.hrPhone;
      company.hrEmail = duplicate.hrEmail || company.hrEmail;
      company.section = duplicate.section || company.section;
      company.extraData = { ...company.extraData, ...(duplicate.extraData || {}) };
      company.syncStatus = 'pending';
      await company.save({ session });
    } else if (action === 'add_extra') {
      if (!company.additionalContacts) company.additionalContacts = [];
      company.additionalContacts.push({
        hrName: duplicate.hrName || '',
        hrPhone: duplicate.hrPhone || '',
        hrEmail: duplicate.hrEmail || '',
        sourceSheet: duplicate.section || 'Uncategorized',
        academicYear: duplicate.academicYear
      });
      company.syncStatus = 'pending';
      await company.save({ session });
    } else if (action !== 'discard') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Invalid action' });
    }

    duplicate.status = 'resolved';
    await duplicate.save({ session });

    // Check if there are any other pending duplicates for this company
    const remainingPendingCount = await DuplicatePreviousCompany.countDocuments({
      originalCompanyId: company._id,
      status: 'pending'
    }).session(session);

    const shouldSync = (action === 'replace_primary' || action === 'add_extra') && remainingPendingCount === 0;

    await session.commitTransaction();
    session.endSession();

    // Auto-sync to Google Sheet if changed and no remaining pending duplicates
    if (shouldSync) {
      try {
        const settings = await Settings.findOne();
        if (settings && settings.pastAcademicYearSheetId) {
          const syncResult = await googleSheetService.appendPreviousCompaniesToSheet([company as any], settings.pastAcademicYearSheetId);
          if (syncResult.success) {
            company.syncStatus = 'synced';
            company.lastSynced = new Date();
            await company.save();
          }
        }
      } catch (syncError) {
        console.error('Immediate bulk sync failed for resolved duplicate:', syncError);
      }
    }

    res.json({ success: true, message: 'Duplicate resolved successfully' });
  } catch (error) {
    console.error('Resolve duplicate error:', error);
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    res.status(500).json({ error: 'Failed to resolve duplicate' });
  }
});

// @route   PUT /api/previous-companies/:id
// @desc    Admin only: Update a previous company details and sync with Google Sheets
router.put('/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const company = await PreviousCompany.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const originalSection = company.section;
    const { companyName, hrName, hrPhone, hrEmail, section, academicYear, additionalContacts, extraData, notes, is_verified_by_admin } = req.body;

    // Check if section changed
    const sectionChanged = section && originalSection && section !== originalSection;

    // If section changed, we must first delete the row from the OLD sheet tab
    if (sectionChanged) {
      try {
        const settings = await Settings.findOne();
        if (settings && settings.pastAcademicYearSheetId) {
          await googleSheetService.deletePreviousCompanyFromSheet(company.toObject(), settings.pastAcademicYearSheetId);
        }
      } catch (err) {
        console.error('Failed to delete old row during section change:', err);
      }
    }

    // Update DB record
    if (companyName !== undefined) {
      company.companyName = companyName;
      company.normalizedName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    if (hrName !== undefined) company.hrName = hrName;
    if (hrPhone !== undefined) company.hrPhone = hrPhone;
    if (hrEmail !== undefined) company.hrEmail = hrEmail;
    if (section !== undefined) company.section = section;
    if (academicYear !== undefined) company.academicYear = academicYear;
    if (additionalContacts !== undefined) company.additionalContacts = additionalContacts;
    if (extraData !== undefined) company.extraData = extraData;
    if (notes !== undefined) company.notes = notes;
    if (is_verified_by_admin !== undefined) company.is_verified_by_admin = is_verified_by_admin;

    company.syncStatus = 'synced';
    company.lastSynced = new Date();
    await company.save();

    // Upsert into new/same sheet tab
    try {
      const settings = await Settings.findOne();
      if (settings && settings.pastAcademicYearSheetId) {
        await googleSheetService.appendPreviousCompaniesToSheet([company.toObject()], settings.pastAcademicYearSheetId);
      }
    } catch (syncError) {
      console.error('Failed to sync updated company to Google Sheets:', syncError);
      company.syncStatus = 'failed';
      await company.save();
    }

    res.json({ success: true, data: company });
  } catch (error) {
    console.error('Update previous company error:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// @route   DELETE /api/previous-companies/:id
// @desc    Admin only: Delete a previous company completely from DB and Google Sheets
router.delete('/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const company = await PreviousCompany.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Attempt to delete from Google Sheets first
    try {
      const settings = await Settings.findOne();
      if (settings && settings.pastAcademicYearSheetId) {
        await googleSheetService.deletePreviousCompanyFromSheet(company.toObject(), settings.pastAcademicYearSheetId);
      }
    } catch (sheetError) {
      console.error('Failed to delete company from Google Sheets:', sheetError);
      // We log but continue to delete from DB to prevent orphaned records
    }

    // Delete from database
    await PreviousCompany.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Delete previous company error:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

export default router;
