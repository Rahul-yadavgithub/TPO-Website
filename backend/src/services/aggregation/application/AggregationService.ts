import { ICompanyRepository } from '../../company/repositories/ICompanyRepository';
import { IExternalSnapshotRepository } from '../repositories/IExternalSnapshotRepository';

export class AggregationService {
  constructor(
    private companyRepo: ICompanyRepository,
    private snapshotRepo: IExternalSnapshotRepository
  ) {}

  /**
   * Fetches the local company and merges it with its external snapshot if it exists.
   * Priority: Local TPR data > External Snapshot data for overlapping fields.
   */
  async getCompanyProfile(id: string): Promise<any | null> {
    const localCompany = await this.companyRepo.findById(id);
    if (!localCompany) {
      return null;
    }

    const snapshot = await this.snapshotRepo.findByNormalizedName(localCompany.normalizedName);
    if (!snapshot) {
      // Ensure we return something identical to toObject() behavior of mongoose
      // Note: The repository should ideally use .lean() which returns a plain object
      return localCompany;
    }

    // Merge logic: Start with snapshot, override with local company data
    // This ensures local overrides and internal fields are preserved, while filling in gaps from the external snapshot
    const merged = { ...snapshot, ...localCompany };
    
    // We shouldn't overwrite the _id or timestamps of the local company with the snapshot's
    merged._id = localCompany._id;
    merged.createdAt = localCompany.createdAt;
    merged.updatedAt = localCompany.updatedAt;

    // Optional: strip internal snapshot fields like lastFetchedAt if not needed by frontend,
    // though to maintain 100% backward compatibility, we just add fields, not remove them.

    return merged;
  }

  async getExternalInsights(companyId: string): Promise<any | null> {
    const localCompany = await this.companyRepo.findById(companyId);
    if (!localCompany) {
      return null;
    }

    const companyName = localCompany.companyName;
    let pastYearData = null;

    // We can lazily import PreviousCompany here or pass a repo, 
    // but for quick integration, importing model directly is ok since it's an aggregation layer.
    const PreviousCompany = (await import('../../../models/PreviousCompany')).default;

    // 1. Fetch Past Year Data from local PreviousCompany DB
    const prevCompany = await PreviousCompany.findOne({
      companyName: new RegExp(`^${companyName}$`, 'i')
    });

    if (prevCompany && prevCompany.extraData) {
      pastYearData = {
        ctc: prevCompany.extraData['Package'] || 'Not Specified',
        eligibleBranches: prevCompany.extraData['Eligible Branches'] 
          ? prevCompany.extraData['Eligible Branches'].split(',').map((b: string) => b.trim()) 
          : []
      };
    }

    // 2. Fetch Current Year Data from LOCAL ExternalSnapshot DB
    let currentYearData = null;
    let driveStatus = null;
    let rawExternalData = null;

    const snapshot = await this.snapshotRepo.findByNormalizedName(localCompany.normalizedName);
    
    if (snapshot) {
      currentYearData = snapshot.currentYear;
      driveStatus = snapshot.driveStatus;
      rawExternalData = snapshot.rawExternalData;
    }

    return {
      companyName,
      driveStatus: driveStatus || 'Not Scheduled',
      currentYear: currentYearData,
      rawExternalData,
      pastYear: pastYearData
    };
  }
}
