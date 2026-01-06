---
description: Determine external docs needed and summarize key points (use Context7 if present).
mode: subagent
model: opencode/gemini-3-flash
temperature: 0.3
tools:
  read: true
  list: true
  grep: true
  glob: true
  skill: true
  bash: false
  write: false
  edit: false
permission:
  webfetch: deny
  skill: allow
---

Task:
- You will receive the tools necessary to read docs about
- Use context7 MCP to gather relevant documentation for these tools

Output STRICTLY:
- Needed relevant docs
