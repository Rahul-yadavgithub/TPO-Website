import { IExternalSnapshotRepository } from './IExternalSnapshotRepository';
import ExternalSnapshot from '../../../models/ExternalSnapshot';

export class MongoExternalSnapshotRepository implements IExternalSnapshotRepository {
  async findByNormalizedName(normalizedName: string): Promise<any | null> {
    return ExternalSnapshot.findOne({ normalizedName }).lean().exec();
  }

  async save(snapshot: any): Promise<void> {
    await ExternalSnapshot.findOneAndUpdate(
      { normalizedName: snapshot.normalizedName },
      { $set: snapshot },
      { upsert: true, new: true }
    ).exec();
  }

  async upsertByExternalId(id: string, snapshot: any): Promise<void> {
    await ExternalSnapshot.findOneAndUpdate(
      { companyServiceId: id },
      { $set: snapshot },
      { upsert: true, new: true }
    ).exec();
  }
}
