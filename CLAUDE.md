# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

SQL grading tool for the Datab1 course, embedded in Brightspace as `<wd-datab1 aid="…">` plus one `<script>`.
v4 runs entirely in the student's browser: SQLite via sql.js (WASM) in a web worker, with no backend.
Vercel only serves static files. Talk Dutch with the user. UI copy and README are Dutch; code and comments are English.

## Commands

```bash
npm test                      # vitest (test/engine.test.ts: rewrite + grading rules against real SQLite data)
npx vitest run -t "<name>"    # single test
npm run verify                # runs all 459 model answers; must stay at 0 errors / 0 not self-approved
npm run verify -- --id 21506  # one assignment, prints its diff with the v2 MySQL output
npm run typecheck
npm run build                 # build:data (data/ -> public/data/*.sqlite) + vite lib build -> dist/
npm run dev                   # build + vite preview on :5173 (no HMR; re-run after changes)
```

Scripts are `.ts`, run directly by Node (type stripping, Node ≥ 22.18). Keep them free of enums and parameter
properties (`erasableSyntaxOnly`), and use `.ts` import extensions.

## Architecture

- `data/` is the source of truth and is committed. `schemas/*.sql` hold the SQLite scripts. `assignments.json` holds
  the model query, regexes and the original MySQL output (`expected`). `expected` is only used by `verify` and is
  stripped by `scripts/build-data.ts`. It was imported once from v2 with `scripts/import-v2.mjs`. Never import
  `008_databaas_submissions.sql`, `007_databaas_studentnrs.sql`, or the credentials in `connections`: this repo is public.
- `src/engine/`: pure logic, shared by the browser and the Node scripts and tests.
  - `rewrite.ts`: a MySQL → SQLite token rewriter (string literals are never touched). It also exports
    `qualifyAmbiguous` / `havingToWhere`, which `database.ts` uses as *retries* when SQLite rejects something MySQL allows.
  - `mysql-functions.ts`: MySQL functions as sql.js UDFs. sql.js takes nArg from `fn.length`, so variadic
    functions are registered once per arity through `reg()`. Functions that collide with SQLite keywords or builtins
    are renamed (`mysql_left`, `mysql_concat`, …) in `RENAMED_FUNCTIONS`, and `database.ts` maps those names back in
    error messages.
  - `grader.ts`: the v2/v3 grading rules (status codes 0–5). Row order is only graded when the model answer has a
    top-level ORDER BY.
  - `database.ts`: opens a DB read-only (`PRAGMA query_only`) and translates SQLite errors into Dutch.
- `src/engine/engine.ts` + `src/worker.ts` + `src/client.ts`: one worker per page, shared by all components. A query
  over 5 s terminates the worker, and a new one spawns on the next request. If workers are blocked, the client falls
  back to the main thread.
- `src/component/`: the custom element (shadow DOM, CodeMirror 6 editor, styles themable through `--wd-*` vars).
  The last submission is stored per aid in `localStorage` (`wd-datab1:v4:<aid>`); `approvedAt` is never lost.
- `vite.config.ts` builds a single IIFE `datab1-component.js` (worker inlined). The data URL base comes from
  the script's own `src` (override: `window.NAKIJK_BASE_URL`). `public/` (the site pages: overview, single
  assignment, demo) is copied into `dist/` as is.

When you change the rewriter or the functions, run both `npm test` and `npm run verify`. A model answer that stops
running means students can no longer pass that assignment.
