---
description: Work through all sub-issues of a parent GitHub issue
---

Work through all sub-issues of GitHub issue #$1.

## Workflow Overview

You will implement all sub-issues for parent issue #$1 using a feature branch workflow:

- One feature branch for the parent issue (targets main)
- Separate PRs for each sub-issue (target the feature branch)
- Sub-issue PRs are merged into the feature branch as they are completed
- The feature branch PR closes the parent issue AND all sub-issues when merged

## Branching & Merging Strategy

```
main
 └── feature/<parent-description>  ← Feature Branch PR (closes #$1)
      ├── feature/<sub-issue-1>    ← Sub-issue PR #1 → merged into feature branch
      ├── feature/<sub-issue-2>    ← Sub-issue PR #2 → merged into feature branch
      └── feature/<sub-issue-3>    ← Sub-issue PR #3 → merged into feature branch
```

**Key Points:**

- Each sub-issue PR targets the feature branch (NOT main)
- Sub-issue PRs are merged into the feature branch after creation
- The feature branch PR targets main and includes links to all sub-issue PRs
- When the feature branch PR is merged to main, it automatically closes:
  - The parent issue (#$1)
  - All sub-issues (via their merged PRs)

## Step 1: Gather Information

Use the `@github-ops` subagent (which uses `github_*` MCP tools) to:

1. Fetch parent issue #$1 details (title, description, requirements)
2. Fetch ALL sub-issues linked to this parent issue
3. For each sub-issue, determine if it:
   - Is already closed → skip
   - Has an open/merged PR associated → skip
   - Is open with no PR → needs implementation

**IMPORTANT: Sort sub-issues by issue number in ascending order (e.g., #10, #11, #12).
Implement them in this order regardless of how they appear in the API response.**

Create a todo list of sub-issues that need implementation, ordered by issue number.

## Step 2: Set Up Feature Branch

1. Ensure you're on `main` and it's up to date: `git checkout main && git pull origin main`
2. Create the parent feature branch with a descriptive name based on the parent issue:
   - Format: `feature/<short-description>` (e.g., `feature/deck-management-api`)
   - Example: For "Build Deck Management API", use `feature/deck-management-api`
3. Push the feature branch to origin: `git push -u origin <branch-name>`
4. Create a **Draft PR** from this feature branch to `main`:
   - Title: Parent issue title
   - Body: Initial placeholder (will be updated in Step 4)
   - Mark as Draft since sub-issues aren't done yet

## Step 3: Implement Each Sub-Issue (In Order)

**Process sub-issues sequentially in ascending issue number order.**

For each sub-issue that needs implementation:

### 3a. Create Sub-Issue Branch

1. Ensure you're on the feature branch: `git checkout <feature-branch>`
2. Pull latest: `git pull origin <feature-branch>`
3. Create a branch for this sub-issue:
   - Format: `feature/<short-description>` based on sub-issue title
   - Example: `feature/get-decks-endpoint`

### 3b. Implement the Feature

1. Read the sub-issue requirements carefully
2. Implement the feature following project conventions (see AGENTS.md)
3. Make meaningful commits as you work

### 3c. Create Sub-Issue PR

1. Push the branch: `git push -u origin <sub-issue-branch>`
2. Create a PR:
   - **Base branch**: The parent feature branch (NOT main)
   - **Title**: Sub-issue title
   - **Body**: Use this format:

     ```
     Closes #<sub-issue-number>

     **Parent Issue:** #$1
     **Feature Branch PR:** #<feature-branch-pr-number>

     ## Summary
     <brief description of changes>

     ## Changes
     - <bullet points of key changes>
     ```
3. If implementation failed or is incomplete:
   - Create as **Draft PR**
   - Document what failed/remains in the PR description

### 3d. Merge Sub-Issue PR into Feature Branch

1. Merge the sub-issue PR into the feature branch using GitHub:
   - Use `gh pr merge <sub-issue-pr-number> --squash` (or `--merge` for full history)
   - This closes the sub-issue PR and keeps the association
2. Return to the feature branch: `git checkout <feature-branch>`
3. Pull the merged changes: `git pull origin <feature-branch>`
4. Mark sub-issue as complete in your todo list
5. Proceed to next sub-issue (in numerical order)

## Step 4: Finalize Feature Branch PR

After all sub-issues are processed:

### 4a. Update Feature Branch PR Description

Update the parent PR description with links to all sub-issue PRs at the top:

```markdown
Closes #$1

## Sub-Issue PRs

- [x] #<pr-1> - <sub-issue-1-title> (Closes #<sub-issue-1-number>)
- [x] #<pr-2> - <sub-issue-2-title> (Closes #<sub-issue-2-number>)
- [x] #<pr-3> - <sub-issue-3-title> (Closes #<sub-issue-3-number>)

## Summary

This PR implements all sub-issues for #$1:

<brief overall summary of the feature>

## Changes

<high-level bullet points of all changes across sub-issues>
```

**Note:** The `[x]` checkboxes indicate merged PRs. Use `[ ]` for any that are still open/draft.

### 4b. Set PR Status

- If ALL sub-issues succeeded: Mark PR as "Ready for Review" using `gh pr ready <pr-number>`
- If ANY sub-issues failed: Keep as Draft, list failures in description

### 4c. Report Summary

Report to the user:

- Link to the parent feature branch PR
- List of sub-issue PRs with their status (merged/draft/failed)
- Any issues that were skipped (already done)
- Any failures with error details

## Issue Closing Behavior

When the feature branch PR is merged to main:

1. **Parent issue #$1** closes automatically (via `Closes #$1` in PR description)
2. **All sub-issues** close automatically because:
   - Each sub-issue PR had `Closes #<sub-issue-number>` in its description
   - Those PRs were merged into the feature branch
   - When the feature branch merges to main, the closure propagates

## Important Notes

- **Process sub-issues in ascending numerical order (#10 before #11 before #12)**
- **Merge sub-issue PRs into the feature branch** - don't just merge locally
- Always run `pnpm lint` and `pnpm type-check` before committing
- Follow conventional commit messages: `feat:`, `fix:`, `docs:`, etc.
- Reference issue numbers in commits: `feat: add GET /decks endpoint (#8)`
- If a sub-issue is blocked or unclear, create a Draft PR with questions in the description
- The parent PR description MUST list all sub-issue PRs at the top for easy navigation
