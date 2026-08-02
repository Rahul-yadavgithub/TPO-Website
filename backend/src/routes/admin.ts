import express from 'express';
import User from '../models/User';
import Company from '../models/Company';
import PreviousCompanyContactRequest from '../models/PreviousCompanyContactRequest';
import PreviousCompany from '../models/PreviousCompany';
import TPOPerson from '../models/TPOPerson';
import mongoose from 'mongoose';
import { protect, AuthRequest, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(protect);
router.use(authorizeRoles('admin', 'communication_tpr'));

// @route   GET /api/admin/requests
// @desc    Get all pending TPR registrations and contact requests
router.get('/requests', async (req, res) => {
  try {
    const pendingTPRs = await User.find({ status: 'pending' }).populate('branchId', 'name').select('-password');
    const pendingContacts = await PreviousCompanyContactRequest.find({ status: 'pending' })
      .populate('branchId', 'name')
      .populate('requestedBy', 'name email')
      .populate('companyId');

    res.status(200).json({
      success: true,
      data: {
        tprs: pendingTPRs,
        contacts: pendingContacts
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/admin/approve-tpr/:id
// @desc    Approve a pending TPR
router.post('/approve-tpr/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    user.status = 'approved';
    await user.save();

    res.status(200).json({ success: true, message: 'TPR Approved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/admin/active-tprs/:branchId
// @desc    Get active TPRs for a specific branch
router.get('/active-tprs/:branchId', async (req, res) => {
  try {
    const tprs = await User.find({
      role: 'tpr',
      branchId: req.params.branchId,
      status: 'approved'
    }).select('name email rollNumber');
    
    res.status(200).json({ success: true, data: tprs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/admin/replace-tpr/:newUserId
// @desc    Approve a new TPR and hand over work from an old TPR
router.post('/replace-tpr/:newUserId', async (req, res) => {
  try {
    const { replaceUserId } = req.body;
    if (!replaceUserId) {
      return res.status(400).json({ success: false, message: 'Old TPR ID is required for replacement' });
    }

    const newUser = await User.findById(req.params.newUserId);
    const oldUser = await User.findById(replaceUserId);

    if (!newUser || !oldUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 1. Transfer active companies
    await Company.updateMany(
      { assignedBranchId: newUser.branchId, contactOwner: oldUser.name },
      { $set: { contactOwner: newUser.name } }
    );

    // 2. Transfer previous company contact requests (pending & approved)
    await PreviousCompanyContactRequest.updateMany(
      { requestedBy: oldUser._id, status: { $in: ['pending', 'approved'] } },
      { $set: { requestedBy: newUser._id } }
    );

    // 3. Approve new user, replace old user
    newUser.status = 'approved';
    await newUser.save();

    oldUser.status = 'replaced';
    await oldUser.save();

    res.status(200).json({ success: true, message: 'TPR Replaced & Work Handed Over Successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});
// @route   POST /api/admin/reject-tpr/:id
// @desc    Reject a pending TPR
router.post('/reject-tpr/:id', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    user.status = 'rejected';
    user.rejectionReason = reason;
    await user.save();

    res.status(200).json({ success: true, message: 'TPR Rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});


// @route   POST /api/admin/approve-contact/:id
// @desc    Approve a company contact request and automatically fetch HR details
router.post('/approve-contact/:id', async (req, res) => {
  try {
    const request = await PreviousCompanyContactRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Request is already approved' });
    }

    // Fetch the company from PreviousCompany database
    const company = await PreviousCompany.findById(request.companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Source company not found in database' });
    }

    // Inject HR details into the request
    request.adminProvidedContact = {
      name: company.hrName || '',
      email: company.hrEmail || '',
      phone: company.hrPhone || '',
      notes: company.notes || ''
    };
    
    request.status = 'approved';
    await request.save();

    // Update the PreviousCompany record to show it is now fully contacted/approved
    company.contactStatus = 'contacted';
    await company.save();

    res.status(200).json({ success: true, message: 'Contact Request Approved & Sent to TPR' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});
// @route   POST /api/admin/reject-contact/:id
// @desc    Reject a company contact request
router.post('/reject-contact/:id', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const request = await PreviousCompanyContactRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Request is already approved' });
    }

    request.status = 'rejected';
    request.rejectionReason = reason;
    await request.save();

    // Reset the PreviousCompany record so it can be requested by someone else
    const company = await PreviousCompany.findById(request.companyId);
    if (company) {
      company.contactStatus = 'not_contacted';
      company.contactedByBranchId = undefined;
      company.contactedByBranchName = undefined;
      await company.save();
    }

    res.status(200).json({ success: true, message: 'Contact Request Rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});


// @route   GET /api/admin/tprs
// @desc    Get all registered TPRs (except main admin)
router.get('/tprs', async (req, res) => {
  try {
    const tprs = await User.find({ email: { $ne: 'tpo@nith.ac.in' } })
      .populate('branchId', 'name')
      .select('-password');
    res.status(200).json({ success: true, data: tprs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/admin/upgrade-tpr/:id
// @desc    Upgrade a TPR to admin role
router.post('/upgrade-tpr/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'User is already an admin' });
    }

    user.role = 'admin';
    await user.save();

    res.status(200).json({ success: true, message: 'User upgraded to Admin successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/admin/revoke-admin/:id
// @desc    Revoke admin role from a TPR
router.post('/revoke-admin/:id', async (req, res) => {
  try {
    // Prevent the main admin from being revoked
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.email === 'tpo@nith.ac.in') {
      return res.status(403).json({ success: false, message: 'Cannot revoke main admin' });
    }

    if (user.role !== 'admin') {
      return res.status(400).json({ success: false, message: 'User is not an admin' });
    }

    user.role = 'tpr';
    await user.save();

    res.status(200).json({ success: true, message: 'Admin access revoked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   DELETE /api/admin/tprs/:id
// @desc    Completely delete a TPR from the platform
router.delete('/tprs/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.email === 'tpo@nith.ac.in') {
      return res.status(403).json({ success: false, message: 'Cannot delete main admin' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// --- TPO Management ---

// @route   GET /api/admin/tpos
// @desc    Get all TPOs
router.get('/tpos', async (req, res) => {
  try {
    const tpos = await TPOPerson.find().sort({ type: 1, name: 1 });
    res.status(200).json({ success: true, data: tpos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/admin/tpos
// @desc    Add a new TPO
router.post('/tpos', async (req, res) => {
  try {
    const { name, designation, type } = req.body;
    if (!name || !designation || !type) {
      return res.status(400).json({ success: false, message: 'Name, designation, and type are required' });
    }
    
    const existing = await TPOPerson.findOne({ name, type });
    if (existing) {
      return res.status(400).json({ success: false, message: 'TPO already exists' });
    }
    const newTPO = await TPOPerson.create({ name, designation, type });
    res.status(201).json({ success: true, data: newTPO });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/admin/replace-tpo/:newTpoId
// @desc    Replace an old TPO with a new one and reassign companies
router.post('/replace-tpo/:newTpoId', async (req, res) => {
  try {
    const { replaceTpoId } = req.body;
    if (!replaceTpoId) {
      return res.status(400).json({ success: false, message: 'Old TPO ID is required for replacement' });
    }

    
    const newTpo = await TPOPerson.findById(req.params.newTpoId);
    const oldTpo = await TPOPerson.findById(replaceTpoId);

    if (!newTpo || !oldTpo) {
      return res.status(404).json({ success: false, message: 'TPO not found' });
    }

    // Transfer active companies assigned to the old TPO to the new TPO
    await Company.updateMany(
      { assignedTPO: oldTpo.name },
      { $set: { assignedTPO: newTpo.name } }
    );

    // Update PreviousCompany records as well
    await PreviousCompany.updateMany(
      { assignedTPO: oldTpo.name },
      { $set: { assignedTPO: newTpo.name } }
    );

    oldTpo.status = 'replaced';
    oldTpo.replacedBy = newTpo._id;
    await oldTpo.save();

    res.status(200).json({ success: true, message: 'TPO Replaced & Companies Handed Over Successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   DELETE /api/admin/tpos/:id
// @desc    Delete a TPO
router.delete('/tpos/:id', async (req, res) => {
  try {
    
    const tpo = await TPOPerson.findById(req.params.id);
    if (!tpo) {
      return res.status(404).json({ success: false, message: 'TPO not found' });
    }
    
    // Check if companies are assigned to this TPO
    const companiesAssigned = await Company.countDocuments({ assignedTPO: tpo.name });
    if (companiesAssigned > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete TPO with assigned companies. Please replace or reassign them first.' });
    }

    await TPOPerson.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'TPO deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
