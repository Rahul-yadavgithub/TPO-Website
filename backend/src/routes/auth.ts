import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User';
import Branch from '../models/Branch';
import { protect, AuthRequest } from '../middleware/auth';
import { sendRecoveryEmail } from '../services/email.service';

const router = express.Router();

// Generate JWT token
const signToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/register
// @desc    Register a user
router.post('/register', async (req, res) => {
  try {
    const { name, rollNumber, email, password, branchName } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    let branch = await Branch.findOne({ name: branchName });
    if (!branch) {
      branch = await Branch.create({ name: branchName, category: 'Circuital' });
    }

    // Creating user - defaults to pending for Admin approval
    const user = await User.create({
      name,
      rollNumber,
      email,
      password,
      branchId: branch._id,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! You can now log in.',
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user & get token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;


    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ 
        success: false, 
        message: `Account registration rejected. Reason: ${user.rejectionReason || 'No reason provided by admin'}` 
      });
    }
    if (user.status === 'pending') {
      return res.status(403).json({ success: false, message: 'Account is pending approval' });
    }

    const token = signToken(user._id.toString());

    res.cookie('tpr_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        commToken: token // Also returning it in response in case frontend needs it for localStorage
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/auth/check-role/:email
// @desc    Check user role before login (for conditional UI)
router.get('/check-role/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({
      success: true,
      role: user.role,
      status: user.status
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/auth/branches
// @desc    Get all branches for registration dropdown
router.get('/branches', async (req, res) => {
  try {
    const branches = await Branch.find().select('name _id');
    const formattedBranches = branches.map(b => ({
      id: b._id,
      name: b.name,
      code: b.name
    }));
    res.status(200).json({ success: true, data: formattedBranches });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/auth/logout
// @desc    Clear cookie
router.post('/logout', (req, res) => {
  res.cookie('tpr_token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.status(200).json({ success: true, data: {} });
});

// @route   GET /api/auth/portal-settings
// @desc    Get public portal settings (like logo)
router.get('/portal-settings', async (req, res) => {
  try {
    const settings = await mongoose.model('Settings').findOne().select('portalLogoUrl');
    res.status(200).json({ success: true, data: settings || {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
router.get('/me', protect, async (req: AuthRequest, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('branchId', 'name category');
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   PUT /api/auth/update-password
// @desc    Update user password
router.put('/update-password', protect, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Find user and explicitly select password field
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid current password' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'This email is not registered in the TPR Portal.'
      });
    }

    const secret = process.env.JWT_SECRET + user.password;
    const token = jwt.sign({ id: user._id, email: user.email }, secret, { expiresIn: '1h' });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?id=${user._id}&token=${token}`;

    await sendRecoveryEmail(user.email, resetLink);

    res.status(200).json({ success: true, message: 'If the email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using token
router.post('/reset-password', async (req, res) => {
  try {
    const { id, token, newPassword } = req.body;

    if (!id || !token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    const secret = process.env.JWT_SECRET + user.password;
    try {
      jwt.verify(token, secret);
    } catch (err) {
      console.error('JWT Verification failed:', err);
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
