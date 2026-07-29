const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function fix() {
  try {
    await mongoose.connect('mongodb+srv://rahulyadavdakshana_db_user:XGwtLRtBXkVd4ixV@cluster0.zw9ieds.mongodb.net/TPR-Data');
    
    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      password: String,
      course: String,
      branchId: mongoose.Schema.Types.ObjectId
    }, { strict: false, collection: 'users' }));
    
    const Branch = mongoose.model('Branch', new mongoose.Schema({
      name: String
    }, { strict: false, collection: 'branches' }));
    
    const cseBranch = await Branch.findOne({ name: 'CSE' });
    if (!cseBranch) throw new Error("CSE branch not found");
    
    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash('12345678', salt);
    
    const res = await User.updateOne(
      { email: 'pk@gmail.com' },
      { 
        $set: { 
          password: newPassword,
          course: 'M.Tech',
          branchId: cseBranch._id
        } 
      }
    );
    
    console.log("Updated user pk@gmail.com:", res);
    
    // Cleanup bad branch
    await Branch.deleteOne({ name: 'M.Tech CSE' });
    console.log("Deleted bad M.Tech CSE branch.");
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

fix();
