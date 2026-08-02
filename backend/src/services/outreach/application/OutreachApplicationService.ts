import { ICompanyRepository } from '../../company/repositories/ICompanyRepository';
import { IBranchRepository } from '../../core/repositories/IBranchRepository';
import { IHrContactRepository } from '../../hr/repositories/IHrContactRepository';
import { ITransactionManager } from '../../core/uow/ITransactionManager';
import { acquireLock, releaseLock } from '../../../utils/lock';
import CompanyStatusHistory from '../../../models/CompanyStatusHistory';
import { CompanyStatus } from '../../../models/Company';

export class OutreachApplicationService {
  constructor(
    private companyRepo: ICompanyRepository,
    private branchRepo: IBranchRepository,
    private hrContactRepo: IHrContactRepository,
    private uow: ITransactionManager
  ) {}

  async verifyCompany(companyId: string): Promise<any> {
    return this.uow.runInTransaction(async (session) => {
      const company = await this.companyRepo.findById(companyId, session);
      if (!company) throw new Error('Company not found');

      company.is_verified_by_admin = true;
      await this.companyRepo.save(company, session);
      return company;
    });
  }

  async assignCompany(companyId: string, branchId: string, assignedBy: string): Promise<any> {
    return this.uow.runInTransaction(async (session) => {
      const company = await this.companyRepo.findById(companyId, session);
      if (!company) throw new Error('Company not found');

      const branch = await this.branchRepo.findById(branchId, session);
      if (!branch) throw new Error('Branch not found');

      const oldBranchId = company.assignedBranch || null;

      company.assignedBranch = branch.name;
      company.syncStatus = 'pending';
      await this.companyRepo.save(company, session);

      await CompanyStatusHistory.create([{
        company_id: companyId,
        field_changed: 'branch_assignment',
        old_value: oldBranchId ? oldBranchId : 'None',
        new_value: branch.name,
        changed_by: assignedBy || 'System'
      }], { session });

      return company;
    });
  }

  async overrideAssign(companyId: string, payload: any): Promise<any> {
    const { branch_id, program, extractedData, tpoType, assignedTPO } = payload;
    
    return this.uow.runInTransaction(async (session) => {
      const company = await this.companyRepo.findById(companyId, session);
      if (!company) throw new Error('Company not found');

      let branch;
      if (tpoType && assignedTPO) {
        company.tpoType = tpoType;
        company.assignedTPO = assignedTPO;
        if (company.assignedBranch === 'Pending Assignment') {
          company.assignedBranch = 'TPO';
        }
        company.syncStatus = 'pending';
      } else if (branch_id) {
        branch = await this.branchRepo.findById(branch_id, session);
        if (!branch) throw new Error('Branch not found');

        const lockKey = `sync_lock_${branch.name}`;
        const locked = await acquireLock(lockKey, 30);
        if (!locked) {
          throw new Error('Branch is currently locked for sync. Please try again later.');
        }

        company.assignedBranch = branch.name;
        company.syncStatus = 'pending';
      }

      if (program) {
        company.program = program;
      }

      await this.companyRepo.save(company, session);

      if (extractedData && (extractedData.hrName || extractedData.hrEmail || extractedData.hrPhone)) {
        const existingHr = await this.hrContactRepo.findByCompanyId(companyId, session);
        if (existingHr) {
          if (extractedData.hrName) existingHr.name = extractedData.hrName;
          if (extractedData.hrEmail) existingHr.email = extractedData.hrEmail;
          if (extractedData.hrPhone) existingHr.mobile = extractedData.hrPhone;
          if (extractedData.linkedinProfile) existingHr.linkedin_url = extractedData.linkedinProfile;
          await this.hrContactRepo.save(existingHr, session);
        } else {
          await this.hrContactRepo.create([{
            company_id: companyId,
            name: extractedData.hrName || 'HR Contact',
            email: extractedData.hrEmail,
            mobile: extractedData.hrPhone,
            linkedin_url: extractedData.linkedinProfile
          }], session);
        }
      }

      if (branch) {
        await releaseLock(`sync_lock_${branch.name}`);
      }

      return company;
    });
  }

  async reviewCompany(companyId: string, action: string, reviewedBy: string): Promise<any> {
    return this.uow.runInTransaction(async (session) => {
      const company = await this.companyRepo.findById(companyId, session);
      if (!company) throw new Error('Company not found');

      if (action === 'approve') {
        const oldReviewStatus = company.review_status || 'scanned';
        company.status = CompanyStatus.APPROVED;
        company.review_status = 'approved';
        company.reviewed_by = reviewedBy;
        company.reviewed_at = new Date();
        
        await this.companyRepo.save(company, session);

        await CompanyStatusHistory.create([{
          company_id: company._id,
          field_changed: 'review_status',
          old_value: oldReviewStatus,
          new_value: 'approved',
          changed_by: reviewedBy
        }], { session });

        return { message: 'approved', company };
      } else if (action === 'reject') {
        const oldReviewStatus = company.review_status || 'scanned';

        await CompanyStatusHistory.create([{
          company_id: company._id,
          field_changed: 'review_status',
          old_value: oldReviewStatus,
          new_value: 'deleted_via_reject',
          changed_by: reviewedBy
        }], { session });

        // A true DDD approach would mark it deleted, but matching current behavior:
        await this.companyRepo.deleteById(companyId, session);
        return { message: 'Company rejected and deleted successfully' };
      } else {
        throw new Error('Invalid action. Must be approve or reject.');
      }
    });
  }
}
