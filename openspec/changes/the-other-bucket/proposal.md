## Why

To ensure that every user always has a catch-all "Miscellaneous" or "Other" category in their starred repositories, preventing misclassification and improving user trust in the categorization system. This addresses the issue where rare or uncategorizable repositories are forced into ill-fitting categories, leading to confusion or hallucinated groupings.

## What Changes

- Always reserve one of the 32 available category slots for a "Miscellaneous" or "Other" bucket.
- Prevent the AI from using all slots for specific categories, ensuring at least one is always available for uncategorizable repos.
- Update category assignment logic to default to "Other" for any repo that does not fit existing categories.
- UI and documentation updates to reflect the reserved "Other" bucket.

## Capabilities

### New Capabilities
- `reserved-other-bucket`: Ensures a dedicated "Other" category is always present and used appropriately for uncategorizable repositories.

### Modified Capabilities


## Impact

- Category assignment logic in AI and backend
- User interface for category display and selection
- Documentation and onboarding materials
