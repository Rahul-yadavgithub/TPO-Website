export interface IHrContactRepository {
  findByCompanyId(companyId: string, session?: any): Promise<any | null>;
  save(hrContact: any, session?: any): Promise<void>;
  create(hrContacts: any[], session?: any): Promise<void>;
}
