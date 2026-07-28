import express from 'express';
import User from '../models/User';
import PreviousCompanyContactRequest from '../models/PreviousCompanyContactRequest';
import PreviousCompany from '../models/PreviousCompany';
import { protect, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(protect);

// Check if user is admin middleware
const adminOnly = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'communication_tpr')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as an admin' });
  }
};

router.use(adminOnly);

// @route   GET /api/admin/requests
// @desc    Get all pending TPR registrations and contact requests
router.get('/requests', async (req, res) => {
  try {
    const pendingTPRs = await User.find({ status: 'pending' }).populate('branchId', 'name').select('-password');
    const pendingContacts = await PreviousCompanyContactRequest.find({ status: 'pending' })
      .populate('branchId', 'name')
      .populate('requestedBy', 'name email');

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

export default router;
