import { Request, Response } from 'express';
import { CompanyAnalyticsService } from '../services/company/application/CompanyAnalyticsService';
import { MongoCompanyRepository } from '../services/company/repositories/MongoCompanyRepository';

const companyRepo = new MongoCompanyRepository();
const analyticsService = new CompanyAnalyticsService(companyRepo);

export const analyticsController = {
  getBranchOverview: async (req: Request, res: Response) => {
    try {
      if ((req as any).user?.role !== 'admin' && (req as any).user?.role !== 'communication_tpr') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const result = await analyticsService.getBranchOverview(req.query);
      
      res.json({
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          pages: result.pages
        }
      });
    } catch (error: any) {
      console.error('Branch overview error:', error);
      res.status(500).json({ error: 'Failed to fetch branch overview companies', details: error.toString() });
    }
  }
};
