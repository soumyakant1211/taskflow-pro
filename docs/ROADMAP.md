# Roadmap

## Application (system under test)

| Version | Status | Scope |
|---|---|---|
| **v1.0** | ✅ released | Auth + RBAC, projects, Kanban board, tasks, comments, dashboard, admin, audit log, Swagger |
| v1.1 | planned | Refresh tokens, forgot/reset password by email, file attachments on tasks |
| v2.0 | planned | Real-time board (WebSockets), notifications and @mentions, sprints and burndown |

New app features get new automation stories in the tracker as they ship.

## Automation

All automation work is tracked as stories in the **automation tracker**: one epic per tech stack, ordered into sprints. Start with the `QA` foundation epic, then Playwright, then the other stacks in whatever order your target jobs need.

## Phase 2: AI application + AI testing

After the core automation epics, build a separate small AI app (a RAG chatbot over project docs: Next.js + Vercel AI SDK + pgvector) and test it with:

- **Promptfoo**: prompt and output evals against a golden dataset, run in CI
- **DeepEval / Ragas**: faithfulness (no hallucination), answer relevancy, context precision
- **Red-teaming**: prompt injection, jailbreaks, PII leakage
- **Playwright**: streaming UI and agent tool-call checks

Key idea: LLM output is non-deterministic, so you assert on **scores and properties with thresholds**, not exact strings.
