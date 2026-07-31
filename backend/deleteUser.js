const mongoose = require('mongoose');

const uri = 'mongodb+srv://rahulyadavdakshana_db_user:XGwtLRtBXkVd4ixV@cluster0.zw9ieds.mongodb.net/TPR-Data';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection;
  
  const users = await db.collection('users').find({ email: /25mcs002/i }).toArray();
  console.log("Found users:", users);
  
  if (users.length > 0) {
    const result = await db.collection('users').deleteMany({ email: /25mcs002/i });
    console.log("Deleted:", result);
  } else {
    console.log("No users found matching 25mcs002");
  }
  
  await mongoose.disconnect();
}
run().catch(console.dir);
