export interface ICompanyRepository {
  findById(id: string, session?: any): Promise<any | null>;
  findByNormalizedName(normalizedName: string, branchId?: string, session?: any): Promise<any | null>;
  save(company: any, session?: any): Promise<void>;
  create(companyData: any, session?: any): Promise<any>;
  getAllNormalizedNames(): Promise<string[]>;
  getBranchOverview(query: any, skip: number, limit: number): Promise<any[]>;
  countBranchOverview(query: any): Promise<number>;
  deleteById(id: string, session?: any): Promise<void>;
}
