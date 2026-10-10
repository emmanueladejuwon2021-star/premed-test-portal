import mongoose from "mongoose";

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || "mongodb://localhost:27017/premedtestportal";

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 15000,
      bufferCommands: true,
      dbName: 'premedtestportal',
      maxPoolSize: 50,
      socketTimeoutMS: 45000,
    };

    console.log('[INFO] Connecting to MongoDB...');
    cached.promise = mongoose.connect(MONGODB_URI, opts).then(async (mongoose) => {
      console.log(`[INFO] MongoDB Connected: ${mongoose.connection.host}`);
      
      // Ensure we drop the old unique index model left over on "courses" to allow duplicate course codes across various assessments
      try {
        if (mongoose.connection && mongoose.connection.db) {
          await mongoose.connection.db.collection('courses').dropIndex('code_1');
          console.log('[INFO] Unique index "code_1" on courses collection dropped successfully.');
        }
      } catch (idxError: any) {
        console.log('[INFO] Stale code_1 unique index droplet skipped or previously dropped:', idxError.message);
      }

      return mongoose;
    }).catch(err => {
      console.error(`[ERROR] MongoDB connection promise caught:`, err);
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error("[ERROR] connectDB threw error.");
    throw error;
  }
};
