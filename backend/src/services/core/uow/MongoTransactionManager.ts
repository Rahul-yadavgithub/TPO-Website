import mongoose from 'mongoose';
import { ITransactionManager } from './ITransactionManager';

export class MongoTransactionManager implements ITransactionManager {
  async runInTransaction<T>(callback: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
