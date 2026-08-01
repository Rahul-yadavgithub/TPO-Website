export interface IExternalSnapshotRepository {
  findByNormalizedName(normalizedName: string): Promise<any | null>;
  save(snapshot: any): Promise<void>;
  upsertByExternalId(id: string, snapshot: any): Promise<void>;
}
