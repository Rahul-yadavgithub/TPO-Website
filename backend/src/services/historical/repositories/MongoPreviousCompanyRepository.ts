import { IPreviousCompanyRepository } from './IPreviousCompanyRepository';
import PreviousCompany from '../../../models/PreviousCompany';

export class MongoPreviousCompanyRepository implements IPreviousCompanyRepository {
  async getDistinctSections(): Promise<string[]> {
    return PreviousCompany.distinct('section');
  }

  async countByStatus(status: string | string[], branchId?: string, isNotBranch?: boolean): Promise<number> {
    const query: any = {};
    
    if (Array.isArray(status)) {
      query.contactStatus = { $in: status };
    } else {
      query.contactStatus = status;
    }

    if (branchId) {
      if (isNotBranch) {
        query.contactedByBranchId = { $ne: branchId };
      } else {
        query.contactedByBranchId = branchId;
      }
    }

    return PreviousCompany.countDocuments(query);
  }

  async countRequestedByOthers(branchId: string): Promise<number> {
    return this.countByStatus(['requested', 'contacted'], branchId, true);
  }
}
