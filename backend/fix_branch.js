const mongoose = require('mongoose');

async function fix() {
  try {
    await mongoose.connect('mongodb+srv://rahulyadavdakshana_db_user:XGwtLRtBXkVd4ixV@cluster0.zw9ieds.mongodb.net/TPR-Data');
    
    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      branchId: mongoose.Schema.Types.ObjectId
    }, { strict: false, collection: 'users' }));
    
    const Branch = mongoose.model('Branch', new mongoose.Schema({
      name: String,
      category: String
    }, { strict: false, collection: 'branches' }));
    
    // Check if M.Tech CSE exists, if not create it
    let mtechCse = await Branch.findOne({ name: 'M.Tech CSE' });
    if (!mtechCse) {
      mtechCse = await Branch.create({ name: 'M.Tech CSE', category: 'Circuital' });
      console.log("Created M.Tech CSE branch.");
    } else {
      console.log("M.Tech CSE branch already exists.");
    }
    
    // Assign user to it
    const res = await User.updateOne(
      { email: 'pk@gmail.com' },
      { $set: { branchId: mtechCse._id } }
    );
    
    console.log("Assigned pk@gmail.com to M.Tech CSE branch:", res);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

fix();
