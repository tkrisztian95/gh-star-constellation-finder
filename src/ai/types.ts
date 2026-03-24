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
