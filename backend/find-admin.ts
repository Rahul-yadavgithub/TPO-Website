import mongoose from 'mongoose';
import User from './src/models/User';

mongoose.connect('mongodb+srv://rahulyadavdakshana_db_user:XGwtLRtBXkVd4ixV@cluster0.zw9ieds.mongodb.net/TPR-Data').then(async () => {
  const users = await User.find({ role: 'admin' });
  console.log(users.map(u => ({ email: u.email })));
  mongoose.disconnect();
});
