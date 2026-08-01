import { Request, Response } from 'express';
import { OutreachApplicationService } from '../services/outreach/application/OutreachApplicationService';
import { MongoCompanyRepository } from '../services/company/repositories/MongoCompanyRepository';
import { MongoBranchRepository } from '../services/core/repositories/MongoBranchRepository';
import { MongoHrContactRepository } from '../services/hr/repositories/MongoHrContactRepository';
import { MongoTransactionManager } from '../services/core/uow/MongoTransactionManager';
import Company from '../models/Company'; // Reusing aggregate logic temporarily

const companyRepo = new MongoCompanyRepository();
const branchRepo = new MongoBranchRepository();
const hrContactRepo = new MongoHrContactRepository();
const uow = new MongoTransactionManager();

const outreachService = new OutreachApplicationService(companyRepo, branchRepo, hrContactRepo, uow);

export const outreachController = {
  reviewCompany: async (req: Request, res: Response) => {
    try {
      const result = await outreachService.reviewCompany(req.params.id as string, req.body.action, req.body.reviewed_by);
      res.json(result.company ? result.company : { message: result.message });
    } catch (error: any) {
      console.error('Review company error:', error);
      res.status(error.message === 'Company not found' ? 404 : (error.message.includes('Invalid action') ? 400 : 500)).json({ 
        error: error.message 
      });
    }
  },

  verifyCompany: async (req: Request, res: Response) => {
    try {
      if ((req as any).user?.role !== 'admin' && (req as any).user?.role !== 'communication_tpr') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const company = await outreachService.verifyCompany(req.params.id as string);
      res.json({ success: true, company });
    } catch (error: any) {
      console.error('Verify company error:', error);
      res.status(error.message === 'Company not found' ? 404 : 500).json({ 
        error: error.message === 'Company not found' ? 'Company not found' : 'Failed to verify company' 
      });
    }
  },

  assignCompany: async (req: Request, res: Response) => {
    try {
      const company = await outreachService.assignCompany(req.params.id as string, req.body.branch_id, req.body.assigned_by);
      res.json(company);
    } catch (error: any) {
      console.error('Reassign branch error:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({ 
        error: error.message.includes('not found') ? error.message : 'Failed to reassign branch' 
      });
    }
  },

  overrideAssign: async (req: Request, res: Response) => {
    try {
      const company = await outreachService.overrideAssign(req.params.id as string, req.body);
      
      // The original code did a full aggregate query to return company + hr_contacts.
      // We will do that here to preserve exact JSON backward compatibility.
      const fullCompany = await Company.aggregate([
        { $match: { _id: company._id } },
        { $lookup: { from: 'hrcontacts', localField: '_id', foreignField: 'company_id', as: 'hr_contacts' } }
      ]);
      
      res.json({ success: true, company: fullCompany[0] });
    } catch (error: any) {
      console.error('Override Assign error:', error);
      if (error.message.includes('currently locked')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(error.message.includes('not found') ? 404 : 500).json({ 
        error: error.message.includes('not found') ? error.message : 'Failed to override and assign company' 
      });
    }
  }
};
