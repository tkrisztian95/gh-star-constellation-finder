## Context

Currently, the AI categorization system for starred repositories can use all 32 available slots for specific categories, which sometimes leads to rare or uncategorizable repositories being forced into ill-fitting groups or hallucinated categories. This can confuse users and reduce trust in the system. There is no enforced "Other" or "Miscellaneous" bucket, so the experience is inconsistent.

## Goals / Non-Goals

**Goals:**
- Always reserve one of the 32 category slots for an "Other" or "Miscellaneous" bucket.
- Ensure the AI never uses all slots for specific categories, leaving one for uncategorizable repos.
- Update logic and UI to reflect this reserved bucket.

**Non-Goals:**
- Changing the total number of available slots (remains 32).
- Redesigning the entire categorization algorithm.
- Modifying unrelated features or categories.

## Decisions

- The "Other" bucket will always be present, regardless of user data.
- Category assignment logic will default to "Other" for any repo that does not fit existing categories.
- The UI will visually distinguish the "Other" bucket and explain its purpose.
- Documentation will be updated to clarify the reserved slot.

## Risks / Trade-offs

- [Risk] Users may be confused by the reserved slot if not clearly explained → Mitigation: Add UI tooltips and documentation.
- [Risk] Some users may want to use all 32 slots for specific categories → Mitigation: Provide rationale in docs and allow feedback.
- [Risk] Edge cases where all repos fit categories, making "Other" seem redundant → Mitigation: Still reserve the slot for consistency and future-proofing.
