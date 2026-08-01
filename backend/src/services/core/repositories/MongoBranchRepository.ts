import { IBranchRepository } from './IBranchRepository';
import Branch from '../../../models/Branch';

export class MongoBranchRepository implements IBranchRepository {
  async findById(id: string, session?: any): Promise<any | null> {
    const query = Branch.findById(id);
    if (session) query.session(session);
    return query.exec();
  }

  async findByName(name: string, session?: any): Promise<any | null> {
    const query = Branch.findOne({ name });
    if (session) query.session(session);
    return query.exec();
  }
}
