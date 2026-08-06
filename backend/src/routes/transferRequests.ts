import { Router } from 'express';
import mongoose from 'mongoose';
import Company from '../models/Company';
import CompanyTransferRequest from '../models/CompanyTransferRequest';
import Branch from '../models/Branch';
import HrContact from '../models/HrContact';
import { protect } from '../middleware/auth';
import { googleSheetService } from '../services/google/GoogleSheetProvider';

const router = Router();
router.use(protect);

// @route   POST /api/transfer-requests
// @desc    Create a new transfer request
router.post('/', async (req: any, res) => {
  try {
    const { companyId, providedHRDetails, fromOwnerType, fromOwnerId, toOwnerType, toOwnerId } = req.body;

    if (!companyId || !fromOwnerType || !fromOwnerId || !toOwnerType || !toOwnerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if there is already a pending request for this company by this user/branch
    const existing = await CompanyTransferRequest.findOne({
      companyId,
      toOwnerId,
      status: 'pending'
    });

    if (existing) {
      return res.status(400).json({ error: 'You already have a pending transfer request for this company.' });
    }

    const request = new CompanyTransferRequest({
      companyId,
      companyName: company.companyName,
      fromOwnerType,
      fromOwnerId,
      toOwnerType,
      toOwnerId,
      requestedBy: req.user._id,
      providedHRDetails,
      status: 'pending'
    });

    await request.save();

    res.status(201).json({ success: true, request });
  } catch (error) {
    console.error('Create transfer request error:', error);
    res.status(500).json({ error: 'Failed to create transfer request' });
  }
});

// @route   GET /api/transfer-requests/incoming
// @desc    Get pending incoming requests for the current user's branch or TPO
router.get('/incoming', async (req: any, res) => {
  try {
    const { branchId, tpoId } = req.query; // Send from frontend based on what portal they are in

    const query: any = { status: 'pending' };
    if (branchId) {
      // Find branch name
      const branch = await Branch.findById(branchId);
      if (branch) {
        query.fromOwnerId = branch.name;
        query.fromOwnerType = 'branch';
      }
    } else if (tpoId) {
      query.fromOwnerId = tpoId;
      query.fromOwnerType = 'tpo';
    } else {
      return res.status(400).json({ error: 'Must provide branchId or tpoId' });
    }

    const requests = await CompanyTransferRequest.find(query)
      .populate('requestedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Get incoming transfer requests error:', error);
    res.status(500).json({ error: 'Failed to fetch incoming transfer requests' });
  }
});

// @route   GET /api/transfer-requests/outgoing
// @desc    Get outgoing requests for the current user's branch or TPO
router.get('/outgoing', async (req: any, res) => {
  try {
    const { branchId, tpoId } = req.query;

    const query: any = {};
    if (branchId) {
      const branch = await Branch.findById(branchId);
      if (branch) {
        query.toOwnerId = branch.name;
        query.toOwnerType = 'branch';
      }
    } else if (tpoId) {
      query.toOwnerId = tpoId;
      query.toOwnerType = 'tpo';
    } else {
      return res.status(400).json({ error: 'Must provide branchId or tpoId' });
    }

    const requests = await CompanyTransferRequest.find(query)
      .populate('requestedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Get outgoing transfer requests error:', error);
    res.status(500).json({ error: 'Failed to fetch outgoing transfer requests' });
  }
});

// @route   POST /api/transfer-requests/:id/approve
// @desc    Approve a transfer request
router.post('/:id/approve', async (req: any, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const request = await CompanyTransferRequest.findById(req.params.id).session(session);
    if (!request) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Request is already processed' });
    }

    const company = await Company.findById(request.companyId).session(session);
    if (!company) {
      request.status = 'rejected';
      await request.save({ session });
      await session.commitTransaction();
      session.endSession();
      return res.status(404).json({ error: 'The company for this request no longer exists. Request has been auto-rejected.' });
    }

    // 1. Update Company Ownership
    if (request.toOwnerType === 'branch') {
      company.assignedBranch = request.toOwnerId;
      company.assignedTPO = undefined;
      company.tpoType = undefined;
    } else {
      company.assignedTPO = request.toOwnerId;
      company.tpoType = request.toOwnerId.includes('Faculty') ? 'Faculty' : 'Staff'; // Simplified deduction
      company.assignedBranch = 'TPO';
    }
    
    // Set sync status to pending so the new owner needs to sync it
    company.syncStatus = 'pending';
    await company.save({ session });

    // 2. Handle HR Contacts Merging
    if (request.providedHRDetails && (request.providedHRDetails.hrName || request.providedHRDetails.hrEmail || request.providedHRDetails.hrPhone)) {
      const provided = request.providedHRDetails;
      
      const hrContact = await HrContact.findOne({ company_id: company._id }).session(session);
      
      if (!hrContact) {
        // Create new
        await HrContact.create([{
          company_id: company._id,
          name: provided.hrName || 'HR Contact',
          email: provided.hrEmail,
          mobile: provided.hrPhone,
          linkedin_url: provided.linkedinProfile
        }], { session });
      } else {
        // Check if it matches existing primary or additional contacts
        let isMatch = false;
        
        const normalizeStr = (s?: string) => s ? s.toLowerCase().trim() : '';
        
        const providedEmail = normalizeStr(provided.hrEmail);
        const providedPhone = normalizeStr(provided.hrPhone);
        
        const primaryEmail = normalizeStr(hrContact.email);
        const primaryPhone = normalizeStr(hrContact.mobile);
        
        if ((providedEmail && primaryEmail.includes(providedEmail)) || 
            (providedPhone && primaryPhone.includes(providedPhone))) {
          isMatch = true;
        } else {
          // Check additional contacts on Company model
          if (company.additionalContacts && company.additionalContacts.length > 0) {
            for (const ac of company.additionalContacts) {
              const acEmail = normalizeStr(ac.hrEmail);
              const acPhone = normalizeStr(ac.hrPhone);
              if ((providedEmail && acEmail.includes(providedEmail)) || 
                  (providedPhone && acPhone.includes(providedPhone))) {
                isMatch = true;
                break;
              }
            }
          }
        }
        
        if (!isMatch) {
          // Add as additional contact on Company model
          if (!company.additionalContacts) {
            company.additionalContacts = [];
          }
          company.additionalContacts.push({
            hrName: provided.hrName || 'Additional HR',
            hrEmail: provided.hrEmail || '',
            hrPhone: provided.hrPhone || '',
            sourceSheet: 'Transfer Request',
            academicYear: new Date().getFullYear().toString()
          });
          await company.save({ session });
        }
      }
    }

    // 3. Mark request as approved
    request.status = 'approved';
    await request.save({ session });

    // Reject all other pending requests for this company
    await CompanyTransferRequest.updateMany(
      { companyId: company._id, _id: { $ne: request._id }, status: 'pending' },
      { $set: { status: 'rejected' } },
      { session }
    );

    // 4. Synchronize Google Sheets Atomically
    const oldProgram = request.fromOwnerId.startsWith('M.Tech') ? 'M.Tech' : 'B.Tech';
    const deleted = await googleSheetService.deleteCompanyFromSheet(company._id.toString(), company.companyName, request.fromOwnerId, oldProgram);
    if (!deleted) {
      console.warn(`Failed to delete company ${company._id} from ${request.fromOwnerId}'s sheet. Proceeding with sync attempt.`);
    }

    if (request.toOwnerType === 'branch') {
      company.program = request.toOwnerId.startsWith('M.Tech') ? 'M.Tech' : 'B.Tech';
    }

    const appendRes = await googleSheetService.appendCompaniesToSheet([company as any], request.toOwnerId);
    if (!appendRes.success) {
      throw new Error(`Failed to append company ${company._id} to ${request.toOwnerId}'s sheet`);
    }

    // Since sheet update succeeded, mark it as synced in the DB
    company.syncStatus = 'synced';
    company.lastSynced = new Date();
    await company.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: 'Transfer request approved' });
  } catch (error) {
    console.error('Approve transfer request error:', error);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Failed to approve transfer request' });
  }
});

// @route   POST /api/transfer-requests/:id/reject
// @desc    Reject a transfer request
router.post('/:id/reject', async (req: any, res) => {
  try {
    const request = await CompanyTransferRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is already processed' });
    }

    request.status = 'rejected';
    await request.save();

    res.json({ success: true, message: 'Transfer request rejected' });
  } catch (error) {
    console.error('Reject transfer request error:', error);
    res.status(500).json({ error: 'Failed to reject transfer request' });
  }
});

export default router;
