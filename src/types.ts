export interface Repo {
  id: string;
  name: string;
  owner: string;
  description: string;
  language: string | null;
  stargazerCount: number;
  topics: string[];
  listIds: string[];
  isArchived: boolean;
}

export interface GitHubList {
  id: string;
  name: string;
  description: string;
  repoIds: string[];
}

export interface AnalysisResult {
  category: string;
  killerFeature: string;
}

export type SuggestionType = 'create-list' | 'move-to-list';

export interface Suggestion {
  repo: Repo;
  type: SuggestionType;
  targetListId?: string;
  targetListName: string;
  analysis: AnalysisResult;
  isPendingCreate?: boolean;
}
