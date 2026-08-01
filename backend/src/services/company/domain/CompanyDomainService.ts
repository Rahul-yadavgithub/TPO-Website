export class CompanyDomainService {
  /**
   * Generates a stable, globally comparable normalized name for a company.
   * This is the Single Source of Truth for company identity matching.
   */
  public normalizeName(name: string): string {
    if (!name) return '';
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}
