import type { Repo, GitHubList, AnalysisResult, Suggestion } from '../types.js';

export interface AnalyzedRepo {
  repo: Repo;
  analysis: AnalysisResult;
}

export interface SuggestionResult {
  suggestions: Suggestion[];
  count: number;
}

export function generateSuggestions(
  analyzedRepos: AnalyzedRepo[],
  existingLists: GitHubList[]
): SuggestionResult {
  const suggestions: Suggestion[] = [];

  // Map of lowercased list name -> list (for matching existing lists)
  const existingListsByName = new Map<string, GitHubList>();
  for (const list of existingLists) {
    existingListsByName.set(list.name.toLowerCase().trim(), list);
  }

  // Map of lowercased category -> pending new list ID (placeholder)
  const pendingNewLists = new Map<string, string>();

  for (const { repo, analysis } of analyzedRepos) {
    const normalizedCategory = analysis.category.toLowerCase().trim();
    const existingList = existingListsByName.get(normalizedCategory);

    if (existingList) {
      // Skip if already in the matching list
      if (repo.listIds.includes(existingList.id)) {
        continue;
      }

      suggestions.push({
        repo,
        type: 'move-to-list',
        targetListId: existingList.id,
        targetListName: existingList.name,
        analysis,
      });
    } else {
      // No matching existing list
      const pendingId = pendingNewLists.get(normalizedCategory);

      if (pendingId) {
        // Already have a pending create-list for this category — just move
        suggestions.push({
          repo,
          type: 'move-to-list',
          targetListId: pendingId,
          targetListName: analysis.category,
          analysis,
          isPendingCreate: true,
        });
      } else {
        // First repo for this category — emit create-list
        const placeholderId = `pending:${normalizedCategory}`;
        pendingNewLists.set(normalizedCategory, placeholderId);

        suggestions.push({
          repo,
          type: 'create-list',
          targetListId: placeholderId,
          targetListName: analysis.category,
          analysis,
          isPendingCreate: true,
        });
      }
    }
  }

  return { suggestions, count: suggestions.length };
}
