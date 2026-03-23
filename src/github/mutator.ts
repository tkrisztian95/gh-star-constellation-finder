import { graphql } from '@octokit/graphql';
import type { Suggestion } from '../types.js';
import type { ReviewDecision } from '../components/ReviewScreen.js';
import { CREATE_LIST_MUTATION, ADD_REPOS_TO_LIST_MUTATION } from '../graphql/mutations.js';

export interface MutationResult {
  suggestion: Suggestion;
  status: 'success' | 'failed';
  message: string;
}

interface CreateListResponse {
  createUserList: {
    list: { id: string; name: string };
  };
}

interface AddReposResponse {
  addStarredRepositoriesToUserList: {
    userList: { id: string; name: string };
  };
}

export async function applyAcceptedSuggestions(
  suggestions: Suggestion[],
  decisions: Map<number, ReviewDecision>,
  graphqlWithAuth: typeof graphql,
  onProgress: (result: MutationResult) => void
): Promise<MutationResult[]> {
  const results: MutationResult[] = [];

  // Map pending placeholder IDs to real created list IDs
  const resolvedListIds = new Map<string, string>();

  // Process in order so create-list comes before move-to-list for same category
  for (let i = 0; i < suggestions.length; i++) {
    if (decisions.get(i) !== 'accepted') continue;

    const suggestion = suggestions[i];

    if (suggestion.type === 'create-list') {
      try {
        const response = await graphqlWithAuth<CreateListResponse>(
          CREATE_LIST_MUTATION,
          { name: suggestion.targetListName, description: '' }
        );
        const newListId = response.createUserList.list.id;

        // Store the real ID for pending moves
        if (suggestion.targetListId) {
          resolvedListIds.set(suggestion.targetListId, newListId);
        }

        // Also add the repo to the newly created list
        await graphqlWithAuth<AddReposResponse>(ADD_REPOS_TO_LIST_MUTATION, {
          listId: newListId,
          repositoryIds: [suggestion.repo.id],
        });

        const result: MutationResult = {
          suggestion,
          status: 'success',
          message: `Created list "${suggestion.targetListName}" and added ${suggestion.repo.owner}/${suggestion.repo.name}`,
        };
        results.push(result);
        onProgress(result);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        const result: MutationResult = {
          suggestion,
          status: 'failed',
          message: msg,
        };
        results.push(result);
        onProgress(result);
      }
    } else {
      // move-to-list
      let targetId = suggestion.targetListId ?? '';

      // Resolve pending placeholder to real ID if available
      if (targetId.startsWith('pending:')) {
        const resolved = resolvedListIds.get(targetId);
        if (resolved) {
          targetId = resolved;
        } else {
          // The create-list for this category was not accepted — skip
          const result: MutationResult = {
            suggestion,
            status: 'failed',
            message: `Target list "${suggestion.targetListName}" was not created (create-list not accepted)`,
          };
          results.push(result);
          onProgress(result);
          continue;
        }
      }

      try {
        await graphqlWithAuth<AddReposResponse>(ADD_REPOS_TO_LIST_MUTATION, {
          listId: targetId,
          repositoryIds: [suggestion.repo.id],
        });

        const result: MutationResult = {
          suggestion,
          status: 'success',
          message: `Moved ${suggestion.repo.owner}/${suggestion.repo.name} to "${suggestion.targetListName}"`,
        };
        results.push(result);
        onProgress(result);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        const result: MutationResult = {
          suggestion,
          status: 'failed',
          message: msg,
        };
        results.push(result);
        onProgress(result);
      }
    }
  }

  return results;
}
