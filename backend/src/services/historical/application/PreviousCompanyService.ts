import { IPreviousCompanyRepository } from '../repositories/IPreviousCompanyRepository';
import { ISettingsRepository } from '../../core/repositories/ISettingsRepository';
import { googleSheetService } from '../../../services/google/GoogleSheetProvider';

export class PreviousCompanyService {
  constructor(
    private previousCompanyRepo: IPreviousCompanyRepository,
    private settingsRepo: ISettingsRepository
  ) {}

  async getSections(): Promise<string[]> {
    const settings = await this.settingsRepo.getSettings();
    if (settings && settings.pastAcademicYearSheetId) {
      try {
        return await googleSheetService.getPreviousCompanySections(settings.pastAcademicYearSheetId);
      } catch (error) {
        console.error('Failed to fetch sections from Google Sheets, falling back to DB:', error);
      }
    }
    
    // Fallback to distinct section values in the DB
    return this.previousCompanyRepo.getDistinctSections();
  }

  async getStatusCounts(branchId?: string): Promise<{ availableCount: number, myCount: number, othersCount: number }> {
    const availableCount = await this.previousCompanyRepo.countByStatus('not_contacted');
    
    let myCount = 0;
    let othersCount = 0;

    if (branchId) {
      myCount = await this.previousCompanyRepo.countByStatus(['requested', 'contacted'], branchId, false);
      othersCount = await this.previousCompanyRepo.countRequestedByOthers(branchId);
    } else {
      othersCount = await this.previousCompanyRepo.countByStatus(['requested', 'contacted']);
    }

    return { availableCount, myCount, othersCount };
  }
}
