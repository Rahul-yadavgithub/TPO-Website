export interface IPreviousCompanyRepository {
  getDistinctSections(): Promise<string[]>;
  countByStatus(status: string | string[], branchId?: string, isNotBranch?: boolean): Promise<number>;
  countRequestedByOthers(branchId: string): Promise<number>;
}
