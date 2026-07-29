const axios = require('axios');

async function test() {
  try {
    console.log("Registering test user...");
    const regRes = await axios.post('http://localhost:5000/api/auth/register', {
      name: "Test MTech",
      rollNumber: "25MTEST01",
      email: "testmtech@gmail.com",
      password: "password123",
      branchName: "CSE",
      course: "M.Tech"
    });
    console.log("Register response:", regRes.data);
    
    // Now we need to approve this user. We'll do it directly via mongoose.
    const mongoose = require('mongoose');
    await mongoose.connect('mongodb+srv://rahulyadavdakshana_db_user:XGwtLRtBXkVd4ixV@cluster0.zw9ieds.mongodb.net/TPR-Data');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    await User.updateOne({ email: "testmtech@gmail.com" }, { $set: { status: "approved" } });
    console.log("Approved test user via DB.");
    
    console.log("Logging in...");
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: "testmtech@gmail.com",
      password: "password123"
    });
    console.log("Login response:", loginRes.data);
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

test();
