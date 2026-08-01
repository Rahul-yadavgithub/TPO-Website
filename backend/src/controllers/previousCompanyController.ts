import { Request, Response } from 'express';
import { PreviousCompanyService } from '../services/historical/application/PreviousCompanyService';
import { MongoPreviousCompanyRepository } from '../services/historical/repositories/MongoPreviousCompanyRepository';
import { MongoSettingsRepository } from '../services/core/repositories/MongoSettingsRepository';

const previousCompanyRepo = new MongoPreviousCompanyRepository();
const settingsRepo = new MongoSettingsRepository();
const previousCompanyService = new PreviousCompanyService(previousCompanyRepo, settingsRepo);

export const previousCompanyController = {
  getSections: async (req: Request, res: Response) => {
    try {
      const sections = await previousCompanyService.getSections();
      res.json({ success: true, data: sections });
    } catch (error) {
      console.error('getSections error:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  getStatusCounts: async (req: Request, res: Response) => {
    try {
      const branchId = req.query.branchId as string;
      const counts = await previousCompanyService.getStatusCounts(branchId);
      res.json({ success: true, data: counts });
    } catch (error) {
      console.error('getStatusCounts error:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
};
