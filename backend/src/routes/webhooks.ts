import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { MongoExternalSnapshotRepository } from '../services/aggregation/repositories/MongoExternalSnapshotRepository';
import { connection as redisClient } from '../config/redis';

const router = Router();
const snapshotRepo = new MongoExternalSnapshotRepository();

// HMAC Signature Verification Middleware
const verifyWebhookSignature = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['x-signature'];
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) {
    console.error('Webhook secret not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!signature) {
    return res.status(401).json({ error: 'Missing X-Signature header' });
  }

  // To properly verify HMAC, we need the raw body. 
  // For Express, assuming body-parser is used, we might need a custom raw body middleware.
  // Assuming req.body is already parsed into JSON here, we stringify it back (which can be risky if keys change order).
  // Ideally, the main app should configure `express.json({ verify: (req, res, buf) => req.rawBody = buf })`.
  // For this implementation, we will use JSON.stringify as a basic fallback.
  const payload = (req as any).rawBody ? (req as any).rawBody.toString() : JSON.stringify(req.body);
  
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');

  if (signature !== digest) {
    console.error('Webhook signature mismatch');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
};

router.post('/external-platform/company-updated', verifyWebhookSignature, async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;

    if (event !== 'company.updated' && event !== 'company.created') {
      return res.status(400).json({ error: 'Unsupported event type' });
    }

    if (!data || !data.externalCompanyId) {
      return res.status(400).json({ error: 'Missing externalCompanyId in data payload' });
    }

    const { externalCompanyId, name, slug, driveStatus, currentYear, ...otherFields } = data;

    // Prepare snapshot data
    const snapshotData = {
      companyServiceId: externalCompanyId,
      companyName: name || data.companyName,
      normalizedName: slug || (name ? name.toLowerCase().replace(/[^a-z0-9]/g, '') : undefined),
      driveStatus,
      currentYear,
      rawExternalData: otherFields,
      lastFetchedAt: new Date()
    };

    if (!snapshotData.normalizedName) {
      return res.status(400).json({ error: 'Cannot determine normalizedName/slug' });
    }

    // Upsert the snapshot in local database
    await snapshotRepo.upsertByExternalId(externalCompanyId, snapshotData);

    // Invalidate any potential Redis cache if we were using it for aggregation
    const cacheKey = `ext_insight_${snapshotData.normalizedName}`;
    await redisClient.del(cacheKey);

    return res.status(200).json({ success: true, message: 'Snapshot updated successfully' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Internal server error during webhook processing' });
  }
});

export default router;
