import { Request, Response } from 'express';
import { ExtractionService } from '../services/hr/application/ExtractionService';
import { OpenRouterAdapter } from '../services/infrastructure/api-adapters/OpenRouterAdapter';

const llmProvider = new OpenRouterAdapter();
const extractionService = new ExtractionService(llmProvider);

export const extractionController = {
  extractInfo: async (req: Request, res: Response) => {
    try {
      if ((req as any).user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const parsedData = await extractionService.extractInfo(req.body.text);
      res.json({ success: true, data: parsedData });
    } catch (error: any) {
      console.error('Extraction failed:', error.message);
      res.status(error.message === 'Text is required for extraction' || error.message.includes('API Key') ? 400 : 500).json({ 
        error: error.message === 'LLM API Key is not configured' ? error.message : 'Failed to extract information from text' 
      });
    }
  }
};
