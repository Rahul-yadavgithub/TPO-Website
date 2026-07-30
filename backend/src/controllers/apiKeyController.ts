import { Request, Response } from 'express';
import mongoose from 'mongoose';
import BranchApiKey from '../models/BranchApiKey';
import ApiPlatform from '../models/ApiPlatform';
import BranchNotification from '../models/BranchNotification';
import { encrypt } from '../services/encryption.service';
import { 
  PlatformAdapter, 
  ApolloAdapter, 
  HunterAdapter, 
  SnovAdapter, 
  LushaAdapter, 
  SkrappAdapter, 
  GetProspectAdapter 
} from '../services/adapters';

const ADAPTERS: Record<string, PlatformAdapter> = {
  apollo: new ApolloAdapter(),
  hunter: new HunterAdapter(),
  snov: new SnovAdapter(),
  lusha: new LushaAdapter(),
  skrapp: new SkrappAdapter(),
  getprospect: new GetProspectAdapter()
};

export const apiKeyController = {
  
  // GET /api/branches/:branch_id/api-keys
  getApiKeys: async (req: Request, res: Response) => {
    try {
      const branch_id = req.params.branch_id as string;
      
      if (!mongoose.Types.ObjectId.isValid(branch_id)) {
        return res.status(200).json({ success: true, data: {} });
      }
      
      const keys = await BranchApiKey.find({ branchId: branch_id })
        .populate('platformId', 'name displayName docsUrl')
        .lean();

      // Group by platform name
      const grouped: Record<string, any[]> = {};

      for (const key of keys) {
        const platform = key.platformId as any;
        const platformName = platform?.name || 'unknown';

        if (!grouped[platformName]) {
          grouped[platformName] = [];
        }

        // Stripping highly sensitive data
        grouped[platformName].push({
          id: key._id,
          label: key.label,
          keyType: key.keyType,
          status: key.status,
          callsUsed: key.callsUsed,
          totalLimit: key.totalLimit,
          resetsMonthly: key.resetsMonthly,
          quotaResetsAt: key.quotaResetsAt,
          validatedAt: key.validatedAt,
          lastUsedAt: key.lastUsedAt,
          createdAt: key.createdAt,
          addedBy: key.addedBy,
          platformDisplayName: platform?.displayName,
          docsUrl: platform?.docsUrl
        });
      }

      res.status(200).json({ success: true, data: grouped });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // POST /api/branches/:branch_id/api-keys/validate
  validateAndSaveKey: async (req: Request, res: Response) => {
    try {
      const branch_id = req.params.branch_id as string;
      if (!mongoose.Types.ObjectId.isValid(branch_id)) {
        return res.status(400).json({ success: false, message: 'Invalid branch ID' });
      }
      const { platform_name, api_key_plaintext, label, key_type, total_limit, resets_monthly, added_by } = req.body;

      if (!platform_name || !api_key_plaintext || !label || !total_limit) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      const platform = await ApiPlatform.findOne({ name: platform_name });
      if (!platform) {
        return res.status(404).json({ success: false, message: 'Platform not supported' });
      }

      const adapter = ADAPTERS[platform_name];
      if (!adapter) {
        return res.status(500).json({ success: false, message: 'Adapter missing for platform' });
      }

      // 1. Validate the key
      const { valid, limit } = await adapter.validateKey(api_key_plaintext);

      if (!valid) {
        return res.status(400).json({ success: false, message: 'Key rejected by platform' });
      }

      // 2. Determine final quota logic
      // Detected Provider Limit → Highest Priority
      // User Provided Limit → Fallback Only
      const finalLimit = (typeof limit === 'number' && !isNaN(limit)) ? limit : Number(total_limit);

      // 3. Encrypt safely
      const { encryptedKey, iv, tag } = encrypt(api_key_plaintext);

      // 4. Save
      const newKey = await BranchApiKey.create({
        branchId: branch_id,
        platformId: platform._id,
        encryptedKey,
        keyIv: iv,
        keyTag: tag,
        label,
        keyType: key_type || 'paid',
        totalLimit: finalLimit,
        resetsMonthly: resets_monthly ?? true,
        callsUsed: 0,
        resetDay: new Date().getDate(),
        status: 'active',
        validatedAt: new Date(),
        addedBy: added_by || 'admin'
      });

      res.status(201).json({
        success: true,
        message: 'Key validated and securely stored',
        limit_detected: limit !== null ? limit : 'None (Using user provided)'
      });

    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // DELETE /api/branches/:branch_id/api-keys/:key_id
  disableApiKey: async (req: Request, res: Response) => {
    try {
      const branch_id = req.params.branch_id as string;
      const key_id = req.params.key_id as string;
      if (!mongoose.Types.ObjectId.isValid(branch_id) || !mongoose.Types.ObjectId.isValid(key_id)) {
        return res.status(400).json({ success: false, message: 'Invalid ID' });
      }
      
      const key = await BranchApiKey.findOne({ _id: key_id, branchId: branch_id });
      if (!key) return res.status(404).json({ success: false, message: 'Key not found' });

      key.status = 'disabled';
      await key.save();

      res.status(200).json({ success: true, message: 'Key disabled successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // POST /api/branches/:branch_id/api-keys/:key_id/replace
  replaceApiKey: async (req: Request, res: Response) => {
    try {
      const branch_id = req.params.branch_id as string;
      const key_id = req.params.key_id as string;
      if (!mongoose.Types.ObjectId.isValid(branch_id) || !mongoose.Types.ObjectId.isValid(key_id)) {
        return res.status(400).json({ success: false, message: 'Invalid ID' });
      }
      const { new_api_key_plaintext } = req.body;

      if (!new_api_key_plaintext) {
        return res.status(400).json({ success: false, message: 'Missing new key' });
      }

      const keyRecord = await BranchApiKey.findOne({ _id: key_id, branchId: branch_id }).populate('platformId');
      if (!keyRecord) return res.status(404).json({ success: false, message: 'Key not found' });

      const platform = keyRecord.platformId as any;
      const adapter = ADAPTERS[platform.name];
      if (!adapter) return res.status(500).json({ success: false, message: 'Adapter missing' });

      // Validate new key
      const { valid, limit } = await adapter.validateKey(new_api_key_plaintext);
      if (!valid) {
        return res.status(400).json({ success: false, message: 'New key rejected by platform' });
      }

      // If adapter returned a limit, we should update the total limit too
      if (typeof limit === 'number' && !isNaN(limit)) {
        keyRecord.totalLimit = limit;
      }

      // Encrypt and replace
      const { encryptedKey, iv, tag } = encrypt(new_api_key_plaintext);
      
      keyRecord.encryptedKey = encryptedKey;
      keyRecord.keyIv = iv;
      keyRecord.keyTag = tag;
      keyRecord.callsUsed = 0;
      keyRecord.resetDay = new Date().getDate();
      keyRecord.status = 'active';
      keyRecord.validatedAt = new Date();

      await keyRecord.save();

      res.status(200).json({ success: true, message: 'Key securely replaced' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // GET /api/branches/:branch_id/notifications
  getNotifications: async (req: Request, res: Response) => {
    try {
      const branch_id = req.params.branch_id as string;
      if (!mongoose.Types.ObjectId.isValid(branch_id)) {
        return res.status(200).json({ success: true, data: [] });
      }
      const notifications = await BranchNotification.find({ branchId: branch_id, isDismissed: false })
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, data: notifications });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // POST /api/branches/:branch_id/notifications/:id/dismiss
  dismissNotification: async (req: Request, res: Response) => {
    try {
      const branch_id = req.params.branch_id as string;
      const id = req.params.id as string;
      if (!mongoose.Types.ObjectId.isValid(branch_id) || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid ID' });
      }
      const notification = await BranchNotification.findOne({ _id: id, branchId: branch_id });
      if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

      notification.isDismissed = true;
      await notification.save();

      res.status(200).json({ success: true, message: 'Notification dismissed' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};
