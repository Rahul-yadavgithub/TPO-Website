import Company from '../models/Company';
import HrContact from '../models/HrContact';
import { ApiKeyRotatorService } from './api-key-rotator.service';
import {
  PlatformAdapter,
  ApolloAdapter,
  HunterAdapter,
  SnovAdapter,
  LushaAdapter,
  HRResult
} from './adapters';

const ADAPTERS: Record<string, PlatformAdapter> = {
  apollo: new ApolloAdapter(),
  hunter: new HunterAdapter(),
  snov: new SnovAdapter(),
  lusha: new LushaAdapter()
};

const TARGET_TITLES = [
  "HR",
  "Human Resources",
  "Recruiter",
  "Technical Recruiter",
  "Talent Acquisition",
  "Talent Acquisition Specialist",
  "Talent Acquisition Partner",
  "Talent Acquisition Manager",
  "Hiring Manager",
  "People Operations",
  "People Partner",
  "HR Manager",
  "HR Executive",
  "HR Business Partner",
  "Staffing Specialist",
  "Campus Recruiter"
];

function getRoleRank(title: string): number {
  if (!title) return 99;
  const t = title.toLowerCase();
  if (t.includes('talent acquisition')) return 1;
  if (t.includes('recruiter') || t.includes('staffing')) return 2;
  if (t.includes('hr') || t.includes('human resources')) return 3;
  if (t.includes('people operations') || t.includes('people partner')) return 4;
  if (t.includes('hiring manager')) return 5;
  return 99;
}

function getSeniorityRank(title: string): number {
  if (!title) return 99;
  const t = title.toLowerCase();
  if (t.includes('chief') || t.includes('vp') || t.includes('vice president')) return 1;
  if (t.includes('director') || t.includes('head')) return 2;
  if (t.includes('manager') || t.includes('lead')) return 3;
  if (t.includes('senior') || t.includes('sr')) return 4;
  return 5;
}

export const EnrichmentService = {
  /**
   * Executes the full HR waterfall rotation and saves the best contact to the DB.
   * Returns true if a contact was found, false otherwise.
   */
  executeFindHr: async (companyId: string, branchIdStr: string, companyName: string, previewOnly: boolean = false, saveAsPending: boolean = false): Promise<boolean | HRResult> => {
    const platformsToTry = ['apollo', 'hunter', 'snov', 'lusha'];
    let bestContact: HRResult | null = null;
    let allFoundContacts: HRResult[] = [];

    for (const platform of platformsToTry) {
      const adapter = ADAPTERS[platform];
      if (!adapter) continue;

      const keyData = await ApiKeyRotatorService.getNextAvailableKey(branchIdStr, platform);
      if (!keyData) continue;

      try {
        const results = await adapter.findHR(keyData.value, companyName, TARGET_TITLES);
        
        if (results && results.length > 0) {
          allFoundContacts = [...allFoundContacts, ...results];
          
          await ApiKeyRotatorService.recordUsage(
            keyData.keyRecord._id.toString(),
            companyId,
            'find_hr',
            'success',
            undefined
          );

          break; 
        } else {
          await ApiKeyRotatorService.recordUsage(
            keyData.keyRecord._id.toString(),
            companyId,
            'find_hr',
            'no_result',
            undefined
          );
        }
      } catch (error: any) {
        console.error(`Adapter error for ${platform}:`, error.message);
        
        let status: 'success' | 'rate_limited' | 'invalid_key' | 'no_result' = 'no_result';
        if (error.message.includes('429')) status = 'rate_limited';
        if (error.message.includes('403') || error.message.includes('401')) status = 'invalid_key';

        await ApiKeyRotatorService.recordUsage(
          keyData.keyRecord._id.toString(),
          companyId,
          'find_hr',
          status,
          undefined
        );
      }
    }

    if (allFoundContacts.length > 0) {
      allFoundContacts.sort((a, b) => {
        // 1. Location Priority (India first)
        const isAIndia = a.location?.toLowerCase().includes('india') || false;
        const isBIndia = b.location?.toLowerCase().includes('india') || false;
        if (isAIndia && !isBIndia) return -1;
        if (!isAIndia && isBIndia) return 1;

        // 2. Role Priority
        const rankA = getRoleRank(a.job_title || '');
        const rankB = getRoleRank(b.job_title || '');
        if (rankA !== rankB) return rankA - rankB;

        // 3. Seniority Priority
        const senA = getSeniorityRank(a.job_title || '');
        const senB = getSeniorityRank(b.job_title || '');
        return senA - senB;
      });

      bestContact = allFoundContacts[0];

      // Auto-discover LinkedIn Profile if missing or to ensure accuracy
      if (bestContact.name) {
        try {
          const { LinkedinSearchAgent } = require('./agents/LinkedinSearchAgent');
          const searchAgent = new LinkedinSearchAgent();
          const foundUrl = await searchAgent.findProfile(bestContact.name, companyName);
          if (foundUrl) {
            bestContact.linkedin_url = foundUrl;
          }
        } catch (error) {
          console.error('[EnrichmentService] Failed to auto-discover LinkedIn profile:', error);
        }
      }

      if (previewOnly) {
        return bestContact; // Return the raw data for preview
      }

      if (saveAsPending) {
        const existingContact = await HrContact.findOne({ company_id: companyId });
        
        let isDifferent = true;
        if (existingContact) {
          isDifferent = (
            (existingContact.name || '').trim() !== (bestContact.name || '').trim() ||
            (existingContact.email || '').trim() !== (bestContact.email || '').trim() ||
            (existingContact.mobile || '').trim() !== (bestContact.phone || '').trim() ||
            (existingContact.designation || '').trim() !== (bestContact.job_title || '').trim() ||
            (existingContact.linkedin_url || '').trim() !== (bestContact.linkedin_url || '').trim()
          );
        }

        if (existingContact && !isDifferent) {
          await HrContact.findOneAndUpdate(
            { company_id: companyId },
            {
              last_checked_at: new Date(),
              last_check_status: 'no_changes'
            }
          );
        } else {
          await HrContact.findOneAndUpdate(
            { company_id: companyId },
            {
              pending_update: {
                name: bestContact.name,
                email: bestContact.email,
                mobile: bestContact.phone,
                designation: bestContact.job_title,
                linkedin_url: bestContact.linkedin_url,
                replaced_at: new Date()
              },
              last_checked_at: new Date(),
              last_check_status: 'update_found'
            },
            { upsert: true, new: true }
          );
        }
      } else {
        const existingContact = await HrContact.findOne({ company_id: companyId });
        let isDifferent = true;
        if (existingContact) {
          isDifferent = (
            (existingContact.name || '').trim() !== (bestContact.name || '').trim() ||
            (existingContact.email || '').trim() !== (bestContact.email || '').trim() ||
            (existingContact.mobile || '').trim() !== (bestContact.phone || '').trim() ||
            (existingContact.designation || '').trim() !== (bestContact.job_title || '').trim() ||
            (existingContact.linkedin_url || '').trim() !== (bestContact.linkedin_url || '').trim()
          );
        }

        if (existingContact && !isDifferent) {
          await HrContact.findOneAndUpdate(
            { company_id: companyId },
            {
              last_checked_at: new Date(),
              last_check_status: 'no_changes'
            }
          );
        } else {
          // Add history item if there's existing data
          let historyItem = null;
          if (existingContact && (existingContact.name || existingContact.email || existingContact.mobile || existingContact.designation)) {
            historyItem = {
              name: existingContact.name,
              email: existingContact.email,
              mobile: existingContact.mobile,
              designation: existingContact.designation,
              linkedin_url: existingContact.linkedin_url,
              replaced_at: new Date()
            };
          }

          const updateData: any = {
            name: bestContact.name,
            email: bestContact.email,
            mobile: bestContact.phone,
            designation: bestContact.job_title,
            linkedin_url: bestContact.linkedin_url,
            is_auto_updated: true,
            auto_updated_at: new Date(),
            last_checked_at: new Date(),
            last_check_status: 'update_found'
          };

          if (historyItem) {
            updateData.$push = { history: historyItem };
          }

          await HrContact.findOneAndUpdate(
            { company_id: companyId },
            updateData,
            { upsert: true, new: true }
          );
        }
      }

      return true;
    }

    // No contacts found
    await HrContact.findOneAndUpdate(
      { company_id: companyId },
      {
        last_checked_at: new Date(),
        last_check_status: 'no_changes'
      },
      { upsert: true }
    );

    return false;
  }
};
