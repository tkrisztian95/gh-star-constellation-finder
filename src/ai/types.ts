export interface RepoInput {
  name: string;
  owner: string;
  description: string;
  language: string | null;
  topics: string[];
  readme: string;
}

export interface AnalysisResult {
  category: string;
  killerFeature: string;
}

export interface Analyzer {
  analyze(input: RepoInput): Promise<AnalysisResult>;
}
