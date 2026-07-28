import User from '../models/User';
import Branch from '../models/Branch';

export const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'tpo@nith.ac.in';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      // Find or create a branch for the admin
      let adminBranch = await Branch.findOne({ name: 'Central Admin' });
      if (!adminBranch) {
        adminBranch = await Branch.create({ name: 'Central Admin', category: 'Circuital' });
      }

      await User.create({
        name: 'Main Admin',
        rollNumber: 'ADMIN001',
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || '12345678', // Default password from env

        branchId: adminBranch._id,
        role: 'admin',
        status: 'approved',
      });
      console.log(`[Seed] Main admin seeded successfully: ${adminEmail}`);
    }
  } catch (error) {
    console.error('[Seed] Error seeding admin:', error);
  }
};
