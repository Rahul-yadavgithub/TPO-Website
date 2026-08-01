export interface IBranchRepository {
  findById(id: string, session?: any): Promise<any | null>;
  findByName(name: string, session?: any): Promise<any | null>;
}
