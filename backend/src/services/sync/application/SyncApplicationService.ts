import { IExternalSnapshotRepository } from '../../aggregation/repositories/IExternalSnapshotRepository';
import { SyncEngineService } from '../domain/SyncEngineService';
import { IEventBus } from '../../core/events/IEventBus';

export class SyncApplicationService {
  constructor(
    private snapshotRepo: IExternalSnapshotRepository,
    private syncEngine: SyncEngineService,
    private eventBus: IEventBus
  ) {}

  /**
   * Processes new data from the external platform for a given company.
   * If differences are detected, updates the local snapshot and publishes an event.
   */
  async processExternalData(normalizedName: string, externalData: any): Promise<void> {
    const currentSnapshot = await this.snapshotRepo.findByNormalizedName(normalizedName);
    
    const hasDifferences = this.syncEngine.hasDifferences(currentSnapshot, externalData);

    if (hasDifferences) {
      externalData.normalizedName = normalizedName; // Ensure primary key is present
      externalData.lastFetchedAt = new Date();
      
      await this.snapshotRepo.save(externalData);

      this.eventBus.publish('ExternalSnapshotUpdated', {
        normalizedName,
        timestamp: externalData.lastFetchedAt
      });
    } else if (currentSnapshot) {
      // Just update the lastFetchedAt timestamp if no material differences
      currentSnapshot.lastFetchedAt = new Date();
      await this.snapshotRepo.save(currentSnapshot);
    }
  }
}
