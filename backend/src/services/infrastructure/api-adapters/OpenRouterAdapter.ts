import axios from 'axios';
import { ILLMProvider } from './ILLMProvider';

export class OpenRouterAdapter implements ILLMProvider {
  private apiUrl: string;
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiUrl = process.env.LLM_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
    this.apiKey = process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY || '';
    this.model = process.env.LLM_MODEL || process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-72b-instruct';
  }

  async extractCompanyInfo(text: string) {
    if (!this.apiKey) {
      throw new Error('LLM API Key is not configured');
    }

    const prompt = `
You are an AI data extractor. Extract the following information from the provided raw text.
Raw Text: "${text}"

Tasks:
1. Extract Company Name (companyName)
2. Extract HR Contact Name (hrName)
3. Extract HR Email (hrEmail)
4. Extract HR Phone/Mobile (hrPhone)
5. Extract LinkedIn Profile URL for the HR or Company (linkedinProfile)

If any field is missing, return an empty string "" for that field.
Return ONLY a valid JSON object matching this structure without any markdown tags:
{
  "companyName": "",
  "hrName": "",
  "hrEmail": "",
  "hrPhone": "",
  "linkedinProfile": ""
}
    `;

    const response = await axios.post(
      this.apiUrl,
      {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content from LLM');

    const cleanContent = content.trim().replace(/^```json/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleanContent);
  }
}
