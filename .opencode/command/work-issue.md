---
description: Work through all sub-issues of a parent GitHub issue
---

Work through all sub-issues of GitHub issue #$1.

## Workflow Overview

You will implement all sub-issues for parent issue #$1 using a feature branch workflow:

- One feature branch for the parent issue (targets main)
- Separate PRs for each sub-issue (target the feature branch)

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
   - Body: `Closes #$1\n\nThis PR implements all sub-issues for #$1.`
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
   - **Body**: `Closes #<sub-issue-number>\n\n## Summary\n<brief description of changes>`
3. If implementation failed or is incomplete:
   - Create as **Draft PR**
   - Document what failed/remains in the PR description

### 3d. Prepare for Next Sub-Issue

1. Return to the feature branch: `git checkout <feature-branch>`
2. Merge the sub-issue branch locally: `git merge <sub-issue-branch>`
3. Push updated feature branch: `git push origin <feature-branch>`
4. Mark sub-issue as complete in your todo list
5. Proceed to next sub-issue (in numerical order)

## Step 4: Finalize

After all sub-issues are processed:

1. Update the parent PR (feature branch → main):
   - If ALL sub-issues succeeded: Mark PR as "Ready for Review"
   - If ANY sub-issues failed: Keep as Draft, list failures in description

2. Report summary:
   - Which sub-issues were implemented (with PR links)
   - Which sub-issues were skipped (already done)
   - Which sub-issues failed (with Draft PR links and error details)
   - Link to the parent PR

## Important Notes

- **Process sub-issues in ascending numerical order (#10 before #11 before #12)**
- Always run `pnpm lint` and `pnpm type-check` before committing
- Follow conventional commit messages: `feat:`, `fix:`, `docs:`, etc.
- Reference issue numbers in commits: `feat: add GET /decks endpoint (#8)`
- If a sub-issue is blocked or unclear, create a Draft PR with questions in the description
- The parent PR description should list all sub-issue PRs for easy navigation
