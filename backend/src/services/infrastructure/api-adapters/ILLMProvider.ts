export interface ILLMProvider {
  extractCompanyInfo(text: string): Promise<{
    companyName: string;
    hrName: string;
    hrEmail: string;
    hrPhone: string;
    linkedinProfile: string;
  }>;
}
