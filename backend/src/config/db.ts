import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string, {
      // Connection pool: allow up to 50 concurrent connections
      maxPoolSize: 50,
      minPoolSize: 10,
      // Fail fast if Atlas is unreachable rather than hanging (increased to 30s as 5s is too short for some networks)
      serverSelectionTimeoutMS: 30000,
      // Close idle connections after 45s to save resources
      socketTimeoutMS: 45000,
      // Compress data over the wire (reduces latency on slower connections)
      compressors: ['zlib'],
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};
