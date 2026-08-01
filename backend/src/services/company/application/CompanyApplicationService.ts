import { ICompanyRepository } from '../repositories/ICompanyRepository';
import { IHrContactRepository } from '../../hr/repositories/IHrContactRepository';
import { ITransactionManager } from '../../core/uow/ITransactionManager';
import { CompanyDomainService } from '../domain/CompanyDomainService';
import { IEventBus } from '../../core/events/IEventBus';
import { CompanyStatus } from '../../../models/Company'; // Reusing enum for backward comp

export class CompanyApplicationService {
  constructor(
    private companyRepo: ICompanyRepository,
    private hrContactRepo: IHrContactRepository,
    private uow: ITransactionManager,
    private domainService: CompanyDomainService,
    private eventBus: IEventBus
  ) {}

  async addManualCompany(payload: any): Promise<void> {
    const { companyName, website, hrName, hrPhone, hrEmail, linkedinProfile, assignedBranchId, program, is_verified_by_admin, primary_contact_flagged } = payload;
    
    if (!companyName) throw new Error('Company name is required');

    const normalizedName = this.domainService.normalizeName(companyName);

    await this.uow.runInTransaction(async (session) => {
      let company = await this.companyRepo.findByNormalizedName(normalizedName, undefined, session);

      if (company) {
        if (is_verified_by_admin !== undefined) {
          company.is_verified_by_admin = is_verified_by_admin;
          company.primary_contact_verified = is_verified_by_admin;
          if (is_verified_by_admin) company.primary_contact_flagged = false;
        }
        if (primary_contact_flagged !== undefined) {
          company.primary_contact_flagged = primary_contact_flagged;
          if (primary_contact_flagged) {
            company.primary_contact_verified = false;
            company.is_verified_by_admin = false;
          }
        }
        if (assignedBranchId) company.assignedBranchId = assignedBranchId;
        if (program) company.program = program;
        
        await this.companyRepo.save(company, session);

        let hrContact = await this.hrContactRepo.findByCompanyId(company._id.toString(), session);
        if (hrContact) {
          hrContact.name = hrName || hrContact.name;
          hrContact.mobile = hrPhone || hrContact.mobile;
          hrContact.email = hrEmail || hrContact.email;
          hrContact.linkedin_url = linkedinProfile || hrContact.linkedin_url;
          hrContact.is_incorrect = primary_contact_flagged || false;
          await this.hrContactRepo.save(hrContact, session);
        } else if (hrName || hrPhone || hrEmail || linkedinProfile) {
          await this.hrContactRepo.create([{
            company_id: company._id,
            name: hrName,
            mobile: hrPhone,
            email: hrEmail,
            linkedin_url: linkedinProfile,
            is_incorrect: primary_contact_flagged || false
          }], session);
        }

        this.eventBus.publish('CompanyManuallyUpdated', { companyId: company._id });
      } else {
        company = await this.companyRepo.create({
          companyName,
          normalizedName,
          website,
          syncStatus: 'pending',
          status: CompanyStatus.APPROVED,
          placementScore: 0,
          confidenceScore: 100,
          aiConfidence: 100,
          source: {
            platform: 'MANUAL_ADMIN',
            sourceUrl: 'MANUAL_ADMIN',
            discoveredAt: new Date()
          },
          discoveryHistory: [],
          startupSignals: [],
          confirmation_status: 'not_confirmed',
          contact_status: 'not_contacted',
          assignedBranch: 'Pending Assignment',
          assignedBranchId,
          program,
          is_verified_by_admin: is_verified_by_admin || false,
          primary_contact_verified: is_verified_by_admin || false,
          primary_contact_flagged: primary_contact_flagged || false
        }, session);

        if (hrName || hrPhone || hrEmail || linkedinProfile) {
          await this.hrContactRepo.create([{
            company_id: company._id,
            name: hrName,
            mobile: hrPhone,
            email: hrEmail,
            linkedin_url: linkedinProfile,
            is_incorrect: primary_contact_flagged || false
          }], session);
        }
        
        this.eventBus.publish('CompanyManuallyAdded', { companyId: company._id });
      }
    });
  }
}
