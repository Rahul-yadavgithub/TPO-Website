import express, { Request, Response } from 'express';
import Company, { CompanyStatus } from '../models/Company';
import axios from 'axios';
import { authorizeRoles } from '../middleware/auth';
import { CompanyDomainService } from '../services/company/domain/CompanyDomainService';

const router = express.Router();
const domainService = new CompanyDomainService();

// GET /api/student-records
router.get('/', authorizeRoles('admin', 'communication_tpr'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companies = await Company.find({ is_student_manage: true })
      .sort({ createdAt: -1 })
      .select('companyName swsDriveId sws_sync createdAt status');
    res.json(companies);
  } catch (error) {
    console.error('Error fetching student record companies:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/student-records
router.post('/', authorizeRoles('admin', 'communication_tpr'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyName } = req.body;
    if (!companyName) {
      res.status(400).json({ error: 'companyName is required' });
      return;
    }

    const normalizedName = domainService.normalizeName(companyName);

    // Check if it already exists
    const existing = await Company.findOne({ normalizedName });
    if (existing) {
      if (!existing.is_student_manage) {
        // If it exists but is a normal company, we could flag it or reject
        res.status(409).json({ error: 'Company already exists in the main directory. Please use that record.' });
        return;
      }
      res.status(409).json({ error: 'Company already exists in Student Records.' });
      return;
    }

    const company = new Company({
      companyName,
      normalizedName,
      status: CompanyStatus.APPROVED,
      is_student_manage: true,
      source: {
        platform: 'STUDENT_MANAGE',
        sourceUrl: 'STUDENT_MANAGE',
        discoveredAt: new Date()
      }
    });

    await company.save();
    res.status(201).json(company);
  } catch (error) {
    console.error('Error creating student record company:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/student-records/:id/issue-form
router.post('/:id/issue-form', authorizeRoles('admin', 'communication_tpr'), async (req: Request, res: Response): Promise<void> => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company || !company.is_student_manage) {
      res.status(404).json({ error: 'Student record company not found' });
      return;
    }

    if (company.swsDriveId) {
      res.status(400).json({ error: 'Form already issued for this company' });
      return;
    }

    // Call SWS POST /sws/v1/drives
    const swsUrl = process.env.SWS_SERVICE_URL || 'http://localhost:3002';
    const swsToken = process.env.SWS_SERVICE_TOKEN;

    if (!swsToken) {
      console.warn('Missing SWS_SERVICE_TOKEN in environment');
    }

    try {
      const response = await axios.post(
        `${swsUrl}/sws/v1/drives`,
        {
          jobId: company._id.toString(),
          companyName: company.companyName
        },
        {
          headers: {
            Authorization: `Bearer ${swsToken}`
          },
          timeout: 5000
        }
      );

      // On Success
      company.swsDriveId = response.data.swsDriveId || company._id.toString();
      company.sws_sync = 'ok';
      await company.save();
      
      res.json({ success: true, swsDriveId: company.swsDriveId });
    } catch (err: any) {
      console.error('Error calling SWS:', err.message);
      // On Failure (timeout, 5xx)
      company.sws_sync = 'pending';
      await company.save();
      
      // We still return 201/200 success from CPA as requested by Phase 4 rules: "do not fail the whole request"
      // Wait, the prompt says "Modify CPA's POST... after saving... On failure, keep CPA record but set sws_sync: 'pending'".
      res.json({ success: true, swsDriveId: company._id.toString(), syncStatus: 'pending' });
    }
  } catch (error) {
    console.error('Error issuing form:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
