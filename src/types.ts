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

export type ConsolidationStrategy = "keep-existing" | "recreate" | "allow-rename";

export interface CreateListSuggestion {
  type: "create-list";
  repo: Repo;
  targetListId?: string;
  targetListName: string;
  analysis: AnalysisResult;
  isPendingCreate?: boolean;
}

export interface MoveToListSuggestion {
  type: "move-to-list";
  repo: Repo;
  targetListId?: string;
  targetListName: string;
  analysis: AnalysisResult;
  isPendingCreate?: boolean;
}

export interface RenameListSuggestion {
  type: "rename-list";
  listId: string;
  oldName: string;
  newName: string;
}

export interface DeleteListSuggestion {
  type: "delete-list";
  listId: string;
  listName: string;
}

export type Suggestion =
  | CreateListSuggestion
  | MoveToListSuggestion
  | RenameListSuggestion
  | DeleteListSuggestion;
