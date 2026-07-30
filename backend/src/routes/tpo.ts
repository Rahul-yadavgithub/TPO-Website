import { Router } from 'express';
import Company from '../models/Company';
import HrContact from '../models/HrContact';
import ContactLog from '../models/ContactLog';
import PreviousCompany from '../models/PreviousCompany';
import { protect } from '../middleware/auth';
import mongoose from 'mongoose';

const router = Router();
router.use(protect);

// GET /api/tpo/:tpo_name/contact-today
router.get('/:tpo_name/contact-today', async (req: any, res) => {
  try {
    const { tpo_name } = req.params;
    const tpoNameStr = decodeURIComponent(tpo_name);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const companies = await Company.aggregate([
      {
        $match: {
          assignedTPO: tpoNameStr,
          confirmation_status: { $ne: 'confirmed' },
          $or: [
            { contact_status: 'not_contacted' },
            { 
              contact_status: 'contacted', 
              contact_outcome: 'call_again', 
              nextFollowupDate: { $lte: endOfToday } 
            }
          ]
        }
      },
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
      },
      { $sort: { placementScore: -1, createdAt: -1 } }
    ]);

    res.json(companies);
  } catch (error) {
    console.error('Contact today error:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// GET /api/tpo/:tpo_name/confirmed
router.get('/:tpo_name/confirmed', async (req: any, res) => {
  try {
    const { tpo_name } = req.params;
    const tpoNameStr = decodeURIComponent(tpo_name);

    const companies = await Company.aggregate([
      {
        $match: {
          assignedTPO: tpoNameStr,
          confirmation_status: 'confirmed'
        }
      },
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
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch confirmed companies' });
  }
});

// GET /api/tpo/:tpo_name/not-confirmed
router.get('/:tpo_name/not-confirmed', async (req: any, res) => {
  try {
    const { tpo_name } = req.params;
    const tpoNameStr = decodeURIComponent(tpo_name);
    const startOfTomorrow = new Date();
    startOfTomorrow.setHours(24, 0, 0, 0);

    const companies = await Company.aggregate([
      {
        $match: {
          assignedTPO: tpoNameStr,
          confirmation_status: { $ne: 'confirmed' }
        }
      },
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
      },
      { $sort: { lastContactDate: -1, createdAt: -1 } }
    ]);

    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch not confirmed companies' });
  }
});

// POST /api/tpo/:tpo_name/assign-past-company
// Directly select and assign a past company to a TPO without requesting
router.post('/:tpo_name/assign-past-company', async (req: any, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { tpo_name } = req.params;
    const { pastCompanyId, tpoType } = req.body;
    const tpoNameStr = decodeURIComponent(tpo_name);

    if (!pastCompanyId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Past company ID is required' });
    }

    const pastCompany = await PreviousCompany.findById(pastCompanyId).session(session);
    if (!pastCompany) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Past company not found' });
    }

    // Check if it is already in the current Company DB for this TPO
    const existingCompany = await Company.findOne({ 
      normalizedName: pastCompany.normalizedName,
      assignedTPO: tpoNameStr
    }).session(session);

    if (existingCompany) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Company is already in your database.' });
    }

    // Create a new Company assigned to this TPO
    const newCompany = new Company({
      companyName: pastCompany.companyName,
      normalizedName: pastCompany.normalizedName,
      assignedTPO: tpoNameStr,
      tpoType: tpoType || 'Faculty',
      status: 'APPROVED',
      placementScore: 0,
      confidenceScore: 100,
      aiConfidence: 100,
      source: {
        platform: 'PreviousYearDatabase',
        sourceUrl: 'DIRECT_SELECTION',
        discoveredAt: new Date()
      },
      discoveryHistory: [],
      startupSignals: [],
      confirmation_status: 'not_confirmed',
      contact_status: 'not_contacted',
      syncStatus: 'pending'
    });

    await newCompany.save({ session });
    
    // Update the PreviousCompany record to reflect it has been assigned
    pastCompany.assignedTPO = tpoNameStr;
    pastCompany.assignedTpoType = tpoType || 'Faculty';
    pastCompany.contactStatus = 'contacted';
    await pastCompany.save({ session });

    // Create HR Contact if exists
    if (pastCompany.hrName || pastCompany.hrEmail || pastCompany.hrPhone) {
      await HrContact.create([{
        company_id: newCompany._id,
        name: pastCompany.hrName,
        email: pastCompany.hrEmail,
        mobile: pastCompany.hrPhone,
        linkedin_url: ''
      }], { session });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, company: newCompany });
  } catch (error) {
    console.error('Assign past company error:', error);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Failed to assign past company' });
  }
});

// POST /api/tpo/:tpo_name/manual-company
// Add a manual company to the TPO
router.post('/:tpo_name/manual-company', async (req: any, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { tpo_name } = req.params;
    const tpoNameStr = decodeURIComponent(tpo_name);
    const { companyName, hrName, hrPhone, hrEmail, linkedinProfile, tpoType } = req.body;

    if (!companyName) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Company name is required' });
    }

    const normalizedName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');

    let existingCompany = await Company.findOne({ 
      normalizedName, 
      assignedTPO: tpoNameStr 
    }).session(session);

    if (existingCompany) {
      existingCompany.syncStatus = 'pending';
      await existingCompany.save({ session });
      
      let hrContact = await HrContact.findOne({ company_id: existingCompany._id }).session(session);
      if (!hrContact) {
        await HrContact.create([{
          company_id: existingCompany._id,
          name: hrName,
          email: hrEmail,
          mobile: hrPhone,
          linkedin_url: linkedinProfile
        }], { session });
      } else {
        if (hrName) hrContact.name = hrName;
        if (hrEmail) hrContact.email = hrEmail;
        if (hrPhone) hrContact.mobile = hrPhone;
        if (linkedinProfile) hrContact.linkedin_url = linkedinProfile;
        await hrContact.save({ session });
      }
    } else {
      const newCompany = new Company({
        companyName,
        normalizedName,
        assignedTPO: tpoNameStr,
        tpoType: tpoType || 'Faculty',
        status: 'APPROVED',
        placementScore: 0,
        confidenceScore: 100,
        aiConfidence: 100,
        source: {
          platform: 'Manual Entry',
          sourceUrl: 'DIRECT_SELECTION',
          discoveredAt: new Date()
        },
        discoveryHistory: [],
        startupSignals: [],
        confirmation_status: 'not_confirmed',
        contact_status: 'not_contacted',
        syncStatus: 'pending'
      });

      await newCompany.save({ session });

      await HrContact.create([{
        company_id: newCompany._id,
        name: hrName,
        email: hrEmail,
        mobile: hrPhone,
        linkedin_url: linkedinProfile
      }], { session });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true });
  } catch (error) {
    console.error('Manual company error:', error);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Failed to add company' });
  }
});

import { googleSheetService } from '../services/google/GoogleSheetProvider';

// POST /api/tpo/:tpo_name/sync
router.post('/:tpo_name/sync', async (req: any, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { tpo_name } = req.params;
    const tpoNameStr = decodeURIComponent(tpo_name);

    // Get all pending companies for this TPO
    const pendingCompanies = await Company.find({
      assignedTPO: tpoNameStr,
      syncStatus: 'pending'
    }).session(session);

    if (pendingCompanies.length === 0) {
      await session.commitTransaction();
      session.endSession();
      return res.json({ message: 'Sync successful (No pending updates)' });
    }

    // Determine target sheet tab based on first pending company (assuming a TPO only has one type)
    const tpoType = pendingCompanies[0].tpoType || 'Faculty';
    const sheetTabName = tpoType;

    const syncResult = await googleSheetService.appendCompaniesToSheet(pendingCompanies, sheetTabName);

    if (!syncResult.success) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ error: 'Google Sheets API error' });
    }

    const now = new Date();

    for (const company of pendingCompanies) {
      if (company.contact_outcome === 'rejected') {
        await Company.deleteOne({ _id: company._id }, { session });
        await HrContact.deleteMany({ company_id: company._id }, { session });
        await ContactLog.deleteMany({ company_id: company._id }, { session });
      } else {
        await Company.updateOne(
          { _id: company._id },
          { $set: { syncStatus: 'synced', lastSynced: now } },
          { session }
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Sync successful', count: pendingCompanies.length });
  } catch (error) {
    console.error('Sync error:', error);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Failed to perform sync' });
  }
});

export default router;
