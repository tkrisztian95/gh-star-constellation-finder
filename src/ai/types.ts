import { z } from 'zod';

export const responseSchema = z.object({
  category: z.string(),
  killerFeature: z.string(),
  dataQuality: z.enum(['full', 'sparse']).optional(),
});

export function parseAnalysisResponse(content: string, fallback = 'analysis-failed'): AnalysisResult {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : content;
  try {
    return responseSchema.parse(JSON.parse(jsonStr));
  } catch {
    try {
      const raw = JSON.parse(jsonStr) as Record<string, unknown>;
      const category = typeof raw['category'] === 'string' ? raw['category'] : '';
      const killerFeature = typeof raw['killerFeature'] === 'string' ? raw['killerFeature'] : '';
      if (category) return { category, killerFeature };
    } catch {
      // not valid JSON at all
    }
    return { category: content.trim() || fallback, killerFeature: '' };
  }
}

export interface RepoInput {
  name: string;
  owner: string;
  description: string;
  language: string | null;
  topics: string[];
  readme: string;
  isArchived: boolean;
  existingListNames?: string[];
}

export interface AnalysisResult {
  category: string;
  killerFeature: string;
  dataQuality?: 'full' | 'sparse';
}

export interface Analyzer {
  analyze(input: RepoInput): Promise<AnalysisResult>;
}
