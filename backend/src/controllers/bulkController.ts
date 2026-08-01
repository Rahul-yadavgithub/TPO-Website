import { Request, Response } from 'express';
import { BulkImportApplicationService } from '../services/company/application/BulkImportApplicationService';
import { MongoCompanyRepository } from '../services/company/repositories/MongoCompanyRepository';
import { MongoHrContactRepository } from '../services/hr/repositories/MongoHrContactRepository';
import { MongoTransactionManager } from '../services/core/uow/MongoTransactionManager';
import { CompanyDomainService } from '../services/company/domain/CompanyDomainService';

const companyRepo = new MongoCompanyRepository();
const hrContactRepo = new MongoHrContactRepository();
const uow = new MongoTransactionManager();
const domainService = new CompanyDomainService();
const bulkImportService = new BulkImportApplicationService(companyRepo, hrContactRepo, uow, domainService);

export const bulkController = {
  validateCompanies: async (req: Request, res: Response) => {
    try {
      // Admin check is now handled by middleware

      const result = await bulkImportService.validateBulkCompanies(req.body.companies);
      res.json(result);
    } catch (error: any) {
      console.error('Bulk validate error:', error);
      res.status(error.message === 'Companies array is required' ? 400 : 500).json({ 
        error: error.message === 'Companies array is required' ? error.message : 'Failed to validate companies' 
      });
    }
  },

  importCompanies: async (req: Request, res: Response) => {
    try {
      // Admin check is now handled by middleware

      const result = await bulkImportService.importBulkCompanies(req.body.companies);
      res.json({ success: true, count: result.count });
    } catch (error: any) {
      console.error('Bulk import error:', error);
      res.status(error.message === 'Valid companies array is required' ? 400 : 500).json({ 
        error: error.message === 'Valid companies array is required' ? error.message : 'Failed to import companies' 
      });
    }
  }
};
