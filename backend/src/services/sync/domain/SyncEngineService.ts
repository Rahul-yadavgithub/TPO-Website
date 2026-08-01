export class SyncEngineService {
  /**
   * Compares the current local snapshot with the newly fetched external data.
   * Returns true if there are differences that warrant an update.
   */
  public hasDifferences(currentSnapshot: any, externalData: any): boolean {
    if (!currentSnapshot && externalData) return true;
    if (currentSnapshot && !externalData) return false;

    // Core fields to check for differences
    const fieldsToCheck = [
      'companyName',
      'website',
      'description',
      'category',
      'foundedYear',
      'teamSize',
      'fundingStage',
      'hiringType',
      'salaryBand',
      'stipendBand',
      'placementScore',
      'confidenceScore'
    ];

    for (const field of fieldsToCheck) {
      if (currentSnapshot[field] !== externalData[field]) {
        return true;
      }
    }

    // Check array differences (e.g., startupSignals)
    const currentSignals = currentSnapshot.startupSignals || [];
    const newSignals = externalData.startupSignals || [];
    if (currentSignals.length !== newSignals.length) return true;
    
    for (let i = 0; i < currentSignals.length; i++) {
      if (currentSignals[i] !== newSignals[i]) return true;
    }

    return false;
  }
}
