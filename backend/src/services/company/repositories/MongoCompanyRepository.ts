import { ICompanyRepository } from './ICompanyRepository';
import Company from '../../../models/Company';

export class MongoCompanyRepository implements ICompanyRepository {
  async findById(id: string, session?: any): Promise<any | null> {
    const query = Company.findById(id);
    if (session) {
      query.session(session);
      return query.exec(); // Return full mongoose doc if using session for transaction
    }
    return query.lean().exec();
  }

  async findByNormalizedName(normalizedName: string, branchId?: string, session?: any): Promise<any | null> {
    const query: any = { normalizedName };
    if (branchId) {
      query.assignedBranchId = branchId;
    }
    const req = Company.findOne(query);
    if (session) {
      req.session(session);
    }
    // For backward compatibility in our current refactoring, we return the document when a session is used so we can call save() on it.
    if (session) {
      return req.exec();
    }
    return req.lean().exec();
  }

  async save(company: any, session?: any): Promise<void> {
    const options = session ? { session } : undefined;
    await company.save(options);
  }

  async create(companyData: any, session?: any): Promise<any> {
    const options = session ? { session } : undefined;
    // create can take an array, so if it's an array we pass it directly
    const data = Array.isArray(companyData) ? companyData : [companyData];
    const companies = await Company.create(data, options);
    return Array.isArray(companyData) ? companies : companies[0];
  }

  async getAllNormalizedNames(): Promise<string[]> {
    const companies = await Company.find().select('normalizedName').lean().exec();
    return companies.map((c: any) => c.normalizedName);
  }

  async getBranchOverview(query: any, skip: number, limit: number): Promise<any[]> {
    return Company.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'hrcontacts',
          localField: '_id',
          foreignField: 'company_id',
          as: 'hr_contacts'
        }
      },
      {
        $lookup: {
          from: 'contactlogs',
          localField: '_id',
          foreignField: 'company_id',
          as: 'contact_logs'
        }
      }
    ]);
  }

  async countBranchOverview(query: any): Promise<number> {
    return Company.countDocuments(query);
  }

  async deleteById(id: string, session?: any): Promise<void> {
    const query = Company.findByIdAndDelete(id);
    if (session) query.session(session);
    await query.exec();
  }
}
