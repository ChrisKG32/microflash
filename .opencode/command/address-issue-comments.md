---
description: Address review comments on sub-issue PRs for a parent GitHub issue
---

Address review comments on all sub-issue PRs for parent GitHub issue #$1.

## Workflow Overview

This command reads review comments left on sub-issue PRs that have been merged into the feature branch, then creates new PRs to address those comments:

- Reads comments from all sub-issue PRs associated with parent issue #$1
- For each sub-issue with comments, creates a new branch from the feature branch
- Implements fixes/changes based on the review comments
- Creates a new PR targeting the feature branch (NOT auto-merged - user will review)

## Branching Strategy

```
main
 └── feature/<parent-description>  ← Feature Branch PR (for #$1)
      ├── [MERGED] feature/<sub-issue-1>     ← Original sub-issue PR
      ├── [MERGED] feature/<sub-issue-2>     ← Original sub-issue PR
      ├── fix/<sub-issue-1>-review-<iteration #>     ← NEW: Addresses comments on sub-issue-1
      └── fix/<sub-issue-2>-review-<iteration #>     ← NEW: Addresses comments on sub-issue-2
```

## Step 1: Gather Information

Use the `@github-ops` subagent (which uses `github_*` MCP tools) to:

1. Fetch parent issue #$1 details
2. Fetch ALL sub-issues linked to this parent issue
3. For each sub-issue, find its associated PR (merged into the feature branch)
4. For each sub-issue PR, fetch:
   - **Inline review comments** (on the diff): Use `github_pull_request_read(method="get_review_comments", ...)`
   - **Conversation comments** (general discussion): Use `github_pull_request_read(method="get_comments", ...)` or `github_issue_read(method="get_comments", ...)`
5. Filter to only sub-issues that have unresolved/actionable comments

**IMPORTANT:**

- Skip sub-issues with no comments or only acknowledgment comments (e.g., "LGTM", "Looks good")
- Focus on comments that request changes, ask questions, or suggest improvements

Create a todo list of sub-issues with actionable comments, ordered by issue number.

## Step 2: Identify the Feature Branch

1. Find the feature branch PR associated with parent issue #$1
2. Get the feature branch name from that PR
3. Ensure you're on the feature branch and it's up to date:
   ```bash
   git checkout <feature-branch>
   git pull origin <feature-branch>
   ```

## Step 3: Address Comments for Each Sub-Issue

For each sub-issue with actionable comments:

### 3a. Create Review Fix Branch

1. Ensure you're on the feature branch: `git checkout <feature-branch>`
2. Pull latest: `git pull origin <feature-branch>`
3. Create a branch for addressing this sub-issue's comments:
   - Format: `fix/<sub-issue-short-name>-review` or `fix/<sub-issue-number>-review`
   - Example: `fix/get-decks-endpoint-review` or `fix/issue-8-review`

### 3b. Implement Fixes

1. Review all comments for this sub-issue carefully
2. For each comment:
   - Understand what change is being requested
   - Implement the fix or improvement
   - If a comment is unclear, note it in the PR description for discussion
3. Make meaningful commits referencing the review:
   - Example: `fix: address review comments on GET /decks endpoint`

### 3c. Create Review Fix PR

1. Push the branch: `git push -u origin <fix-branch>`
2. Create a PR:
   - **Base branch**: The parent feature branch (NOT main)
   - **Title**: `Address review comments: <sub-issue-title>`
   - **Body**: Use this format:

     ```markdown
     Addresses review comments from #<original-sub-issue-pr-number>

     **Parent Issue:** #$1
     **Original Sub-Issue:** #<sub-issue-number>
     **Feature Branch PR:** #<feature-branch-pr-number>

     ## Comments Addressed

     ### From @<reviewer-username>:

     > <quoted comment text>

     **Resolution:** <description of how this was addressed>

     ### From @<reviewer-username>:

     > <quoted comment text>

     **Resolution:** <description of how this was addressed>

     ## Changes

     - <bullet points of changes made>

     ## Notes

     <any questions or items needing clarification>
     ```

3. **DO NOT merge this PR** - leave it open for user review

### 3d. Proceed to Next Sub-Issue

1. Return to the feature branch: `git checkout <feature-branch>`
2. Mark this sub-issue's review as addressed in your todo list
3. Proceed to next sub-issue with comments

## Step 4: Report Summary

After processing all sub-issues with comments:

1. Report to the user:
   - Link to the parent feature branch PR
   - List of review fix PRs created (with links)
   - For each PR, summarize:
     - Which sub-issue's comments it addresses
     - How many comments were addressed
     - Any comments that need clarification
   - Sub-issues that had no actionable comments (skipped)

2. Remind the user:
   - Review fix PRs are ready for review
   - User should merge them into the feature branch after approval
   - After merging, the feature branch PR will include all fixes

## Comment Types to Address

### Actionable Comments (DO address):

- "This should use X instead of Y"
- "Can you add error handling here?"
- "This variable name is confusing, consider renaming"
- "Missing null check"
- "This could be simplified to..."
- Questions that imply a change: "Why not use async/await here?"

### Non-Actionable Comments (DO NOT create PRs for):

- "LGTM" / "Looks good to me"
- "Nice work!"
- "Thanks for the fix"
- Pure questions without implied changes: "What does this do?"
- Already resolved comments (marked as resolved in GitHub)

## Important Notes

- **DO NOT auto-merge review fix PRs** - user must review and merge
- Each review fix PR should address ALL comments from ONE sub-issue
- If a sub-issue has no actionable comments, skip it entirely
- Quote the original comments in the PR description for context
- If a comment is unclear, note it in the PR and ask for clarification
- Follow the same code style and conventions as the original implementation
