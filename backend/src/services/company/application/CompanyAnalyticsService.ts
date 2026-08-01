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
    if (params.call_today === 'true') {
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
