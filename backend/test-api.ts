import jwt from 'jsonwebtoken';
import axios from 'axios';
import mongoose from 'mongoose';
import User from './src/models/User';

async function test() {
  await mongoose.connect('mongodb+srv://rahulyadavdakshana_db_user:XGwtLRtBXkVd4ixV@cluster0.zw9ieds.mongodb.net/TPR-Data');
  const adminUser = await User.findOne({ role: 'admin' });
  const token = jwt.sign({ id: adminUser!._id }, 'fb3b8a34d8e578a1bc40289d3c5f216da1117532d84784a956d354b2382c49c2', { expiresIn: '1d' });
  
  try {
    const res = await axios.get('http://localhost:5000/api/companies/branch-overview?page=1&limit=10&search=', {
      headers: { Cookie: `tpr_token=${token}` }
    });
    console.log("Success! Companies count:", res.data.data.length);
  } catch (error: any) {
    console.error("HTTP Error:", error.response?.status, error.response?.data);
  }
  mongoose.disconnect();
}
test();
