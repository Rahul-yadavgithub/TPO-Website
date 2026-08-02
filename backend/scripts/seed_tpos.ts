import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TPOPerson from '../src/models/TPOPerson';

dotenv.config();

const TPO_FACULTY = ["Dr. Somesh Kr. Sharma", "Dr. Ray Singh Meena", "Dr. Swaraj Chowdhury", "Dr. Jiwanjot Singh", "Dr. Sreeram TS"];
const TPO_STAFF = ["Chandradev Raj Singh", "Atul Negi"];

async function seedTPOs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');

    for (const name of TPO_FACULTY) {
      const exists = await TPOPerson.findOne({ name, type: 'Faculty' });
      if (!exists) {
        await TPOPerson.create({ name, type: 'Faculty', designation: 'Faculty Coordinator', status: 'active' });
        console.log(`Added Faculty TPO: ${name}`);
      }
    }

    for (const name of TPO_STAFF) {
      const exists = await TPOPerson.findOne({ name, type: 'Staff' });
      if (!exists) {
        await TPOPerson.create({ name, type: 'Staff', designation: 'Staff Member', status: 'active' });
        console.log(`Added Staff TPO: ${name}`);
      }
    }

    console.log('TPO Seeding Complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding TPOs:', error);
    process.exit(1);
  }
}

seedTPOs();
