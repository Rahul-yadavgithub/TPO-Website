import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config({ path: '/home/rahul-yadav/Documents/JobFinder/Last-TPO/backend/.env' });

const uri = process.env.MONGODB_URI;

const UserSchema = new mongoose.Schema({
  email: String,
}, { timestamps: true, strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function run() {
  await mongoose.connect(uri!);
  
  const targetEmail = '23bcs001@gmail.com';
  let res = await User.deleteOne({ email: targetEmail });
  
  if (res.deletedCount > 0) {
    console.log(`Successfully deleted user with email: ${targetEmail}`);
  } else {
    // Try to find any user containing 23bcs001
    const users = await User.find({ email: /23bcs001/i });
    if (users.length > 0) {
      console.log(`Found similar users: ${users.map((u: any) => u.email).join(', ')}`);
      for (const u of users) {
        await User.deleteOne({ _id: u._id });
        console.log(`Deleted user: ${u.email}`);
      }
    } else {
      console.log(`No user found matching 23bcs001`);
    }
  }
  
  await mongoose.disconnect();
}
run();
