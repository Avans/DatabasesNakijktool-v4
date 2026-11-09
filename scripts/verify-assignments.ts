// Run every model answer against the SQLite practice databases and check that:
//   1. it runs at all,
//   2. it gets approved by the grader itself (so a student *can* get it right),
//   3. its result matches the output the v2 MySQL server produced (data/assignments.json `expected`).
//
//   node scripts/verify-assignments.ts [--verbose] [--id 21506]
//
// Exit code 1 when (1) or (2) fails for any assignment. Differences in (3) are reported
// as warnings: they mean the student sees a slightly different result than v2 showed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { openDatabase, runQuery } from '../src/engine/database.ts';
import { grade, Status, normalizeQuery, type Cell } from '../src/engine/grader.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const onlyId = args.includes('--id') ? Number(args[args.indexOf('--id') + 1]) : null;

interface Stored {
  id: number; schema: string; metaTag: string; title: string | null; description: string;
  query: string; regexes: { type: number; expression: string; description: string }[];
  expected: { columns: string[]; rows: string[][] } | null;
}

const assignments: Stored[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'assignments.json'), 'utf8'));
const SQL = await initSqlJs();
const dbs = new Map<string, ReturnType<typeof openDatabase>>();
const db = (schema: string) => {
  if (!dbs.has(schema)) dbs.set(schema, openDatabase(SQL, fs.readFileSync(path.join(ROOT, 'data', 'schemas', schema + '.sql'), 'utf8')));
  return dbs.get(schema)!;
};

/** Compare a SQLite cell with the text MySQL printed. */
function sameCell(v: Cell, mysql: string): boolean {
  if (v === null) return mysql === '' || mysql.toUpperCase() === 'NULL';
  const s = String(v);
  if (s === mysql) return true;
  if (typeof v === 'number' && mysql.trim() !== '' && !isNaN(Number(mysql))) return Math.abs(v - Number(mysql)) < 1e-6;
  return s.trim() === mysql.trim();
}

let errors = 0, notApproved = 0, mismatches = 0;
const mismatchKinds: Record<string, number> = {};

for (const a of assignments) {
  if (onlyId !== null && a.id !== onlyId) continue;
  const label = `${a.id} (${a.schema} ${a.metaTag})`;
  const res = runQuery(db(a.schema), normalizeQuery(a.query));
  if (!res.ok) {
    errors++;
    console.log(`ERROR    ${label}: ${res.message}\n         ${a.query}`);
    continue;
  }
  const v = grade(a, a.query, sql => runQuery(db(a.schema), sql));
  if (v.status !== Status.Approved) {
    notApproved++;
    console.log(`REJECTED ${label}: status ${v.status}: ${v.message.replace(/\n/g, ' | ')}`);
  }
  if (!a.expected) continue;
  let kind = '';
  if (res.values.length !== a.expected.rows.length) kind = 'rows';
  else if (res.columns.length !== a.expected.columns.length) kind = 'columns';
  else {
    outer: for (let r = 0; r < res.values.length; r++)
      for (let c = 0; c < res.columns.length; c++)
        if (!sameCell(res.values[r][c], a.expected.rows[r][c] ?? '')) {
          kind = `value r${r + 1} '${res.columns[c]}': sqlite=${JSON.stringify(res.values[r][c])} mysql=${JSON.stringify(a.expected.rows[r][c])}`;
          break outer;
        }
  }
  if (kind) {
    mismatches++;
    const k = kind.startsWith('value') ? 'value' : kind;
    mismatchKinds[k] = (mismatchKinds[k] ?? 0) + 1;
    if (verbose || onlyId !== null) {
      console.log(`DIFF     ${label}: ${kind === 'rows' ? `rows sqlite=${res.values.length} mysql=${a.expected.rows.length}` : kind}\n         ${a.query}`);
    }
  }
}

const total = onlyId !== null ? 1 : assignments.length;
console.log(`\n${total} assignments: ${errors} errors, ${notApproved} not self-approved, ${mismatches} differ from v2 MySQL output`, mismatchKinds);
process.exit(errors + notApproved > 0 ? 1 : 0);
