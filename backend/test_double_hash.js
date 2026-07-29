const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function test() {
  await mongoose.connect('mongodb+srv://rahulyadavdakshana_db_user:XGwtLRtBXkVd4ixV@cluster0.zw9ieds.mongodb.net/TPR-Data');
  
  const UserSchema = new mongoose.Schema({
    email: { type: String, required: true },
    password: { type: String, required: true },
    status: { type: String, default: 'pending' }
  });

  UserSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    console.log("Hashing password in pre-save hook!");
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  });

  // Use the existing model if already registered, else create it
  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  // 1. Create a user
  const user = new User({ email: 'test_double_hash@gmail.com', password: 'password123' });
  await user.save();
  console.log("After create:", user.password);

  // 2. Fetch the user and update status
  const fetchedUser = await User.findOne({ email: 'test_double_hash@gmail.com' });
  fetchedUser.status = 'approved';
  await fetchedUser.save();
  console.log("After approve (save):", fetchedUser.password);

  // Clean up
  await User.deleteOne({ email: 'test_double_hash@gmail.com' });
  process.exit(0);
}

test();
