import { graphql } from "@octokit/graphql";
import type { Suggestion, GitHubList } from "../types.js";
import type { ReviewDecision } from "../components/ReviewScreen.js";
import {
  CREATE_LIST_MUTATION,
  ADD_REPOS_TO_LIST_MUTATION,
  DELETE_USER_LIST_MUTATION,
  UPDATE_USER_LIST_MUTATION,
} from "../graphql/mutations.js";

export interface MutationResult {
  suggestion: Suggestion;
  status: "success" | "failed";
  message: string;
}

interface CreateListResponse {
  createUserList: {
    list: { id: string; name: string };
  };
}

interface AddReposResponse {
  updateUserListsForItem: {
    lists: Array<{ id: string; name: string }>;
  };
}

interface UpdateListResponse {
  updateUserList: {
    list: { id: string; name: string };
  };
}

export async function deleteAllLists(
  lists: GitHubList[],
  graphqlWithAuth: typeof graphql,
): Promise<void> {
  await Promise.all(
    lists.map((list) => graphqlWithAuth(DELETE_USER_LIST_MUTATION, { listId: list.id })),
  );
}

export async function applyAcceptedSuggestions(
  suggestions: Suggestion[],
  decisions: Map<number, ReviewDecision>,
  graphqlWithAuth: typeof graphql,
  onProgress: (result: MutationResult) => void,
): Promise<MutationResult[]> {
  const results: MutationResult[] = [];

  // Map pending placeholder IDs to real created list IDs
  const resolvedListIds = new Map<string, string>();

  // --- Pass 1: process rename-list suggestions first (task 6.3) ---
  for (let i = 0; i < suggestions.length; i++) {
    const suggestion = suggestions[i];
    if (suggestion.type !== "rename-list") continue;

    const decision = decisions.get(i);

    if (decision === "accepted") {
      try {
        await graphqlWithAuth<UpdateListResponse>(UPDATE_USER_LIST_MUTATION, {
          listId: suggestion.listId,
          name: suggestion.newName,
          description: "",
        });
        // Rename accepted: moves targeting 'rename:<listId>' use the same listId
        resolvedListIds.set(`rename:${suggestion.listId}`, suggestion.listId);
        const result: MutationResult = {
          suggestion,
          status: "success",
          message: `Renamed list "${suggestion.oldName}" → "${suggestion.newName}"`,
        };
        results.push(result);
        onProgress(result);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        // On rename failure, fall back to creating a new list
        resolvedListIds.set(`rename:${suggestion.listId}`, "");
        const result: MutationResult = {
          suggestion,
          status: "failed",
          message: msg,
        };
        results.push(result);
        onProgress(result);
      }
    } else {
      // Rename rejected: create a new list with the proposed name instead
      try {
        const response = await graphqlWithAuth<CreateListResponse>(CREATE_LIST_MUTATION, {
          name: suggestion.newName,
          description: "",
        });
        const newListId = response.createUserList.list.id;
        resolvedListIds.set(`rename:${suggestion.listId}`, newListId);
        const result: MutationResult = {
          suggestion,
          status: "success",
          message: `Rename rejected — created new list "${suggestion.newName}" instead`,
        };
        results.push(result);
        onProgress(result);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        resolvedListIds.set(`rename:${suggestion.listId}`, "");
        const result: MutationResult = {
          suggestion,
          status: "failed",
          message: `Rename rejected and fallback create-list failed: ${msg}`,
        };
        results.push(result);
        onProgress(result);
      }
    }
  }

  // --- Pass 2: process create-list and move-to-list in order ---
  for (let i = 0; i < suggestions.length; i++) {
    if (decisions.get(i) !== "accepted") continue;

    const suggestion = suggestions[i];

    if (suggestion.type === "rename-list" || suggestion.type === "delete-list") continue;

    if (suggestion.type === "create-list") {
      try {
        const response = await graphqlWithAuth<CreateListResponse>(CREATE_LIST_MUTATION, {
          name: suggestion.targetListName,
          description: "",
        });
        const newListId = response.createUserList.list.id;

        // Store the real ID for pending moves
        if (suggestion.targetListId) {
          resolvedListIds.set(suggestion.targetListId, newListId);
        }

        // Also add the repo to the newly created list
        await graphqlWithAuth<AddReposResponse>(ADD_REPOS_TO_LIST_MUTATION, {
          itemId: suggestion.repo.id,
          listIds: [newListId],
        });

        const result: MutationResult = {
          suggestion,
          status: "success",
          message: `Created list "${suggestion.targetListName}" and added ${suggestion.repo.owner}/${suggestion.repo.name}`,
        };
        results.push(result);
        onProgress(result);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        const result: MutationResult = {
          suggestion,
          status: "failed",
          message: msg,
        };
        results.push(result);
        onProgress(result);
      }
    } else {
      // move-to-list
      let targetId = suggestion.targetListId ?? "";

      // Resolve pending placeholder to real ID if available
      if (targetId.startsWith("pending:") || targetId.startsWith("rename:")) {
        const resolved = resolvedListIds.get(targetId);
        if (resolved) {
          targetId = resolved;
        } else {
          const reason = targetId.startsWith("rename:")
            ? `Target list rename for "${suggestion.targetListName}" failed`
            : `Target list "${suggestion.targetListName}" was not created (create-list not accepted)`;
          const result: MutationResult = {
            suggestion,
            status: "failed",
            message: reason,
          };
          results.push(result);
          onProgress(result);
          continue;
        }
      }

      try {
        await graphqlWithAuth<AddReposResponse>(ADD_REPOS_TO_LIST_MUTATION, {
          itemId: suggestion.repo.id,
          listIds: [targetId],
        });

        const result: MutationResult = {
          suggestion,
          status: "success",
          message: `Moved ${suggestion.repo.owner}/${suggestion.repo.name} to "${suggestion.targetListName}"`,
        };
        results.push(result);
        onProgress(result);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        const result: MutationResult = {
          suggestion,
          status: "failed",
          message: msg,
        };
        results.push(result);
        onProgress(result);
      }
    }
  }

  return results;
}
