## 1A. Prompt Engineering & Framework Rationale

- [x] 1A.1 Update all prompt templates (buildSystemPrompt, buildConsolidationPrompt, etc.) to:
	- Explicitly instruct the AI to always reserve one slot for "Other" or "Miscellaneous"
	- State in instructions and category rules that no more than 31 specific categories can be used
	- Require that uncategorizable repos are always assigned to "Other"
	- Add an example output where "Other" is present
	- Use TIDD-EC/CARE principles for clarity, compliance, and testability


## 1. Category Logic & AI Prompt

- [x] 1.1 Update category assignment logic (generateSuggestions) to always reserve one slot for "Other" or "Miscellaneous" and ensure it is counted in the 32-slot limit
- [x] 1.2 Ensure AI never uses all 32 slots for specific categories; always include "Other" as a fallback
- [x] 1.3 Update buildSystemPrompt and all prompt templates to explicitly instruct the AI to always reserve one slot for "Other" or "Miscellaneous", never use all 32 slots for specific categories, and assign uncategorizable repos to "Other". The prompt must clearly state this rule in the instructions and category rules sections.
- [x] 1.4 Default uncategorizable repositories to the "Other" bucket

## 2. User Interface, Review & Phase Logic

- [x] 2.1 Update UI to always display the "Other" bucket and provide a tooltip or help text explaining its purpose
- [x] 2.2 Prevent the "Other" bucket from being deleted or renamed away in review/apply phases
- [x] 2.3 Ensure phase transitions (analysis, review, apply) check for the presence of the "Other" bucket and add it if missing
- [x] 2.4 Update documentation and onboarding materials to reflect the reserved slot

## 3. Testing & Validation

- [x] 3.1 Write tests to verify the "Other" bucket is always present after categorization
- [x] 3.2 Test that uncategorizable repos are assigned to "Other"
- [x] 3.3 Test that the "Other" bucket cannot be deleted or renamed
- [ ] 3.4 Validate UI and documentation changes with users or stakeholders
