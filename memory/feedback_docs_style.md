---
name: feedback-docs-style
description: For end-of-studies report files under /docs, the user prefers short, plain-prose sections without bullet lists or dashes.
metadata:
  type: feedback
---

When writing or rewriting files inside `docs/` (the end-of-studies report for OmniLearn), keep sections **short** (roughly half the length of a typical draft) and use **continuous prose paragraphs**. Avoid bullet lists (`-`, `*`) and avoid em-dash-introduced fragments at the start of lines. Tables and code blocks are fine when they carry technical reference material; the constraint targets narrative sections (introduction, conclusion, annexe intros, etc.).

**Why:** The user explicitly rejected longer, bullet-heavy drafts twice in a row — first asking to "make it simple and make it the half", then asking to remove the `-` style bullets from the general conclusion. They prefer the academic-report style of flowing paragraphs over engineering-style bullet points.

**How to apply:** Default to paragraphs for any narrative `docs/*.md` file. Only use lists where the content is genuinely tabular/enumerative (env vars, route tables, glossary). When in doubt, write prose and let the user ask for a list if they want one.
