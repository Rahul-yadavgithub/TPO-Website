import { IHrContactRepository } from './IHrContactRepository';
import HrContact from '../../../models/HrContact';

export class MongoHrContactRepository implements IHrContactRepository {
  async findByCompanyId(companyId: string, session?: any): Promise<any | null> {
    const query = HrContact.findOne({ company_id: companyId });
    if (session) {
      query.session(session);
    }
    // Note: returning a Mongoose document here because we call .save() on it in the current manual-company logic.
    // In a pure DDD approach, this should return a Domain Model, but for backward compatibility and incremental refactoring,
    // returning the mongoose document is acceptable for now.
    return query.exec();
  }

  async save(hrContact: any, session?: any): Promise<void> {
    const options = session ? { session } : undefined;
    await hrContact.save(options);
  }

  async create(hrContacts: any[], session?: any): Promise<void> {
    const options = session ? { session } : undefined;
    await HrContact.create(hrContacts, options);
  }
}
