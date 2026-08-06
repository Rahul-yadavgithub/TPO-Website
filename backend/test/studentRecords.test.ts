import express from 'express';
import request from 'supertest';
import nock from 'nock';
import { describe, it, expect, afterEach, jest } from '@jest/globals';
import studentRecordsRouter from '../src/routes/studentRecords';
import Company from '../src/models/Company';

jest.mock('../src/models/Company');
jest.mock('../src/middleware/auth', () => ({
  authorizeRoles: () => (req: any, res: any, next: any) => next()
}));

const app = express();
app.use(express.json());
app.use('/api/student-records', studentRecordsRouter);

describe('Student Records SWS Integration', () => {
  afterEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  it('should gracefully handle SWS being down and return success with pending sync', async () => {
    const mockCompany: any = {
      _id: '507f1f77bcf86cd799439011',
      companyName: 'Test Corp',
      is_student_manage: true,
      swsDriveId: null,
      save: jest.fn().mockResolvedValue(true as never)
    };

    (Company.findById as jest.Mock).mockResolvedValue(mockCompany as never);

    // Stub SWS to be down (e.g. 500 or timeout)
    nock('http://localhost:3002')
      .post('/sws/v1/drives')
      .reply(500, { error: 'Internal Server Error' });

    const response = await request(app)
      .post('/api/student-records/507f1f77bcf86cd799439011/issue-form');

    expect(response.status).toBe(200); // Because it succeeds in CPA
    expect(response.body).toEqual({
      success: true,
      swsDriveId: '507f1f77bcf86cd799439011',
      syncStatus: 'pending'
    });

    // Verify company.sws_sync was set to pending
    expect(mockCompany.sws_sync).toBe('pending');
    expect(mockCompany.save).toHaveBeenCalled();
  });
});
