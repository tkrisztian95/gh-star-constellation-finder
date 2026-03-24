import type { Repo, GitHubList, AnalysisResult, Suggestion } from "../types.js";
import { rerouteOrphanRepos } from "../ai/consolidator.js";

export interface AnalyzedRepo {
  repo: Repo;
  analysis: AnalysisResult;
}

export interface ReroutedRepo {
  repoName: string;
  category: string;
  targetList: string | null;
}

export interface SuggestionResult {
  suggestions: Suggestion[];
  count: number;
  reroutedRepos: ReroutedRepo[];
}

export async function generateSuggestions(
  analyzedRepos: AnalyzedRepo[],
  existingLists: GitHubList[],
  rerouteOrphanReposFn: typeof rerouteOrphanRepos = rerouteOrphanRepos,
): Promise<SuggestionResult> {
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
        type: "move-to-list",
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
          type: "move-to-list",
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
          type: "create-list",
          targetListId: placeholderId,
          targetListName: analysis.category,
          analysis,
          isPendingCreate: true,
        });
      }
    }
  }

  // --- Single-member pending list re-routing ---

  // Count members per pending list ID
  const pendingListMemberCount = new Map<string, number>();
  for (const s of suggestions) {
    if (s.isPendingCreate && s.targetListId) {
      pendingListMemberCount.set(
        s.targetListId,
        (pendingListMemberCount.get(s.targetListId) ?? 0) + 1,
      );
    }
  }

  // Collect singleton pending list IDs (only one suggestion references them)
  const singletonListIds = new Set<string>();
  for (const [id, count] of pendingListMemberCount) {
    if (count === 1) singletonListIds.add(id);
  }

  if (singletonListIds.size === 0) {
    return { suggestions, count: suggestions.length, reroutedRepos: [] };
  }

  // Collect orphan categories for the AI call
  const orphans: { category: string }[] = [];
  for (const s of suggestions) {
    if (
      s.type === "create-list" &&
      s.isPendingCreate &&
      s.targetListId &&
      singletonListIds.has(s.targetListId)
    ) {
      orphans.push({ category: s.targetListName });
    }
  }

  // Available targets: existing list names + pending lists with >= 2 members
  const availableTargets: string[] = existingLists.map((l) => l.name);
  for (const s of suggestions) {
    if (
      s.type === "create-list" &&
      s.isPendingCreate &&
      s.targetListId &&
      !singletonListIds.has(s.targetListId)
    ) {
      availableTargets.push(s.targetListName);
    }
  }

  const rerouteMap = await rerouteOrphanReposFn(orphans, availableTargets);

  // Build lookup maps for re-routing
  const pendingListNameToId = new Map<string, string>();
  for (const s of suggestions) {
    if (
      s.type === "create-list" &&
      s.isPendingCreate &&
      s.targetListId &&
      !singletonListIds.has(s.targetListId)
    ) {
      pendingListNameToId.set(s.targetListName.toLowerCase().trim(), s.targetListId);
    }
  }

  // Patch suggestions: replace or drop singleton entries
  const patchedSuggestions: Suggestion[] = [];
  const reroutedRepos: ReroutedRepo[] = [];

  for (const s of suggestions) {
    if (!s.isPendingCreate || !s.targetListId || !singletonListIds.has(s.targetListId)) {
      patchedSuggestions.push(s);
      continue;
    }

    // Singleton create-list entry
    const targetListName = rerouteMap.get(s.targetListName) ?? null;
    reroutedRepos.push({
      repoName: s.repo.name,
      category: s.targetListName,
      targetList: targetListName,
    });

    if (!targetListName) continue; // drop

    const existingTarget = existingListsByName.get(targetListName.toLowerCase().trim());
    if (existingTarget) {
      patchedSuggestions.push({
        ...s,
        type: "move-to-list",
        targetListId: existingTarget.id,
        targetListName: existingTarget.name,
        isPendingCreate: false,
      });
    } else {
      const pendingTargetId = pendingListNameToId.get(targetListName.toLowerCase().trim());
      if (pendingTargetId) {
        patchedSuggestions.push({
          ...s,
          type: "move-to-list",
          targetListId: pendingTargetId,
          targetListName,
          isPendingCreate: true,
        });
      }
    }
  }

  return { suggestions: patchedSuggestions, count: patchedSuggestions.length, reroutedRepos };
}
