import { Request, Response } from 'express';
import { AggregationService } from '../services/aggregation/application/AggregationService';
import { MongoCompanyRepository } from '../services/company/repositories/MongoCompanyRepository';
import { MongoExternalSnapshotRepository } from '../services/aggregation/repositories/MongoExternalSnapshotRepository';

import { CompanyApplicationService } from '../services/company/application/CompanyApplicationService';
import { MongoHrContactRepository } from '../services/hr/repositories/MongoHrContactRepository';
import { MongoTransactionManager } from '../services/core/uow/MongoTransactionManager';
import { CompanyDomainService } from '../services/company/domain/CompanyDomainService';
import { eventBus } from '../services/core/events/EventEmitterBus';
import axios from 'axios';
import { connection as redisClient } from '../config/redis';
import PreviousCompany from '../models/PreviousCompany';
import Company from '../models/Company';

const companyRepo = new MongoCompanyRepository();
const hrContactRepo = new MongoHrContactRepository();
const snapshotRepo = new MongoExternalSnapshotRepository();
const uow = new MongoTransactionManager();
const domainService = new CompanyDomainService();
const aggregationService = new AggregationService(companyRepo, snapshotRepo);
const companyApplicationService = new CompanyApplicationService(companyRepo, hrContactRepo, uow, domainService, eventBus);

export const companyController = {
  getCompanyById: async (req: Request, res: Response) => {
    try {
      const companyId = req.params.id as string;
      
      const mergedProfile = await aggregationService.getCompanyProfile(companyId);

      if (!mergedProfile) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Return identical response format as before (plain object)
      res.json(mergedProfile);
    } catch (error) {
      console.error('getCompanyById error:', error);
      res.status(500).json({ error: 'Failed to fetch company details' });
    }
  },

  addManualCompany: async (req: Request, res: Response) => {
    try {
      if ((req as any).user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      await companyApplicationService.addManualCompany(req.body);
      res.json({ success: true, message: 'Company processed successfully' });
    } catch (error: any) {
      console.error('Manual company error:', error);
      res.status(error.message === 'Company name is required' ? 400 : 500).json({ 
        error: error.message || 'Server Error' 
      });
    }
  },

  getExternalInsights: async (req: Request, res: Response) => {
    try {
      const companyId = req.params.id as string;
      const insights = await aggregationService.getExternalInsights(companyId);
      
      if (!insights) {
        return res.status(404).json({ error: 'Company not found' });
      }

      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('getExternalInsights error:', error);
      res.status(500).json({ error: 'Failed to fetch external insights' });
    }
  }
};
