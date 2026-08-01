import { ILLMProvider } from '../../infrastructure/api-adapters/ILLMProvider';

export class ExtractionService {
  constructor(private llmProvider: ILLMProvider) {}

  async extractInfo(text: string) {
    if (!text) throw new Error('Text is required for extraction');
    return await this.llmProvider.extractCompanyInfo(text);
  }
}
