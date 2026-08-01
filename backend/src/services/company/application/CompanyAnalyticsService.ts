import { ICompanyRepository } from '../repositories/ICompanyRepository';

export class CompanyAnalyticsService {
  constructor(private companyRepo: ICompanyRepository) {}

  async getBranchOverview(params: any): Promise<{ data: any[], total: number, page: number, pages: number }> {
    const page = parseInt(params.page as string) || 1;
    const limit = parseInt(params.limit as string) || 20;
    const skip = (page - 1) * limit;

    const query: any = { assignedBranch: { $exists: true, $ne: null } };
    
    if (params.search) {
      query.companyName = { $regex: params.search, $options: 'i' };
    }
    if (params.branch) {
      query.assignedBranch = params.branch;
    }
    if (params.program) {
      query.program = params.program;
    }
    if (params.is_verified) {
      query.is_verified_by_admin = params.is_verified === 'true';
    }
    if (params.contact_outcome === 'call_today') {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      query.confirmation_status = { $ne: 'confirmed' };
      query.$or = [
        { contact_status: 'not_contacted' },
        { 
          contact_status: 'contacted', 
          contact_outcome: 'call_again', 
          nextFollowupDate: { $lte: endOfToday } 
        }
      ];
    } else if (params.contact_outcome === 'custom') {
      if (params.custom_outcome) {
        query.contact_outcome = { $regex: params.custom_outcome, $options: 'i' };
      } else {
        query.contact_outcome = { $nin: ['call_again', 'brochure_jnf', 'tpo_talk', 'rejected', 'accepted', null, ''] };
      }
    } else if (params.contact_outcome) {
      query.contact_outcome = params.contact_outcome;
    }

    const [data, total] = await Promise.all([
      this.companyRepo.getBranchOverview(query, skip, limit),
      this.companyRepo.countBranchOverview(query)
    ]);

    return {
      data,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }
}
