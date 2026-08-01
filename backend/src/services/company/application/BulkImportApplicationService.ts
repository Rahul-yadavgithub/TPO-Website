import mongoose from 'mongoose';
import { ICompanyRepository } from '../repositories/ICompanyRepository';
import { IHrContactRepository } from '../../hr/repositories/IHrContactRepository';
import { ITransactionManager } from '../../core/uow/ITransactionManager';
import { CompanyDomainService } from '../domain/CompanyDomainService';
import { CompanyStatus } from '../../../models/Company'; // Enum

export class BulkImportApplicationService {
  constructor(
    private companyRepo: ICompanyRepository,
    private hrContactRepo: IHrContactRepository,
    private uow: ITransactionManager,
    private domainService: CompanyDomainService
  ) {}

  /**
   * Validates a batch of companies and deduplicates against the existing database.
   */
  async validateBulkCompanies(companies: any[]): Promise<{ validCount: number, duplicateCount: number, validCompanies: any[], duplicateCompanies: any[] }> {
    if (!Array.isArray(companies)) {
      throw new Error('Companies array is required');
    }

    const existingNamesArray = await this.companyRepo.getAllNormalizedNames();
    const existingNames = new Set(existingNamesArray);

    const validCompanies = [];
    const duplicateCompanies = [];

    for (const c of companies) {
      if (!c.companyName) continue;
      const normalized = this.domainService.normalizeName(c.companyName);
      if (existingNames.has(normalized)) {
        duplicateCompanies.push(c);
      } else {
        validCompanies.push(c);
        existingNames.add(normalized); // Add to set to prevent duplicates within the batch itself
      }
    }

    return {
      validCount: validCompanies.length,
      duplicateCount: duplicateCompanies.length,
      validCompanies,
      duplicateCompanies
    };
  }

  /**
   * Imports a batch of validated companies atomically.
   */
  async importBulkCompanies(companies: any[]): Promise<{ count: number }> {
    if (!Array.isArray(companies) || companies.length === 0) {
      throw new Error('Valid companies array is required');
    }

    return this.uow.runInTransaction(async (session) => {
      const companyDocs = [];
      const hrContacts = [];

      for (const c of companies) {
        if (!c.companyName) continue;

        const normalizedName = this.domainService.normalizeName(c.companyName);
        const companyId = new mongoose.Types.ObjectId();

        companyDocs.push({
          _id: companyId,
          companyName: c.companyName,
          normalizedName,
          syncStatus: 'pending',
          status: CompanyStatus.APPROVED,
          placementScore: 0,
          confidenceScore: 100,
          aiConfidence: 100,
          source: {
            platform: 'BULK_ADMIN',
            sourceUrl: 'BULK_ADMIN',
            discoveredAt: new Date()
          },
          discoveryHistory: [],
          startupSignals: [],
          confirmation_status: 'not_confirmed',
          contact_status: 'not_contacted'
        });

        if (c.hrName || c.hrPhone || c.hrEmail || c.linkedinProfile) {
          hrContacts.push({
            company_id: companyId,
            name: c.hrName || '',
            mobile: c.hrPhone || '',
            email: c.hrEmail || '',
            linkedin_url: c.linkedinProfile || '',
            is_incorrect: false
          });
        }
      }

      if (companyDocs.length > 0) {
        await this.companyRepo.create(companyDocs, session);
      }

      if (hrContacts.length > 0) {
        await this.hrContactRepo.create(hrContacts, session);
      }

      return { count: companyDocs.length };
    });
  }
}
