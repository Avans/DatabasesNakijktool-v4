// One-off import of the v2 MySQL dumps into this repo's own data format.
//
//   node scripts/import-v2.mjs [path/to/DatabasesNakijktool-v2/sqlinit]
//
// Writes:
//   data/schemas/<schema>.sql   SQLite script per practice database
//   data/assignments.json       assignments with model query, regexes and the expected
//                               output that the v2 MySQL server produced
//
// Student data (submissions, studentnrs) and the connection credentials are never read
// into the output: only the connectionID -> schema mapping is used.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseCreateTables, createTableToSqlite, parseInserts, sqliteLiteral, jsValue
} from './lib/mysql-dump.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SQLINIT = path.resolve(process.argv[2] ?? path.join(ROOT, '..', 'DatabasesNakijktool-v2', 'sqlinit'));
const OUT = path.join(ROOT, 'data');

if (!fs.existsSync(path.join(SQLINIT, '002_databaas_assignments.sql'))) {
  console.error(`sqlinit/ not found at ${SQLINIT}`);
  process.exit(1);
}

const read = f => fs.readFileSync(path.join(SQLINIT, f), 'utf8');

/** Rows of a databaas table as objects keyed by column name. */
function tableObjects(file, table) {
  const sql = read(file);
  const create = parseCreateTables(sql).find(t => t.name === table);
  const cols = [...create.sql.matchAll(/^\s*`(\w+)`\s+\w+/gm)].map(m => m[1]);
  return (parseInserts(sql)[table] ?? []).map(r =>
    Object.fromEntries(cols.map((c, i) => [c, jsValue(r[i])]))
  );
}

// --- practice databases ------------------------------------------------------
const connections = new Map();
{
  // columns: ID, host, port, user, password, schema -- only ID and schema are kept
  const rows = parseInserts(read('003_databaas_connections.sql')).connections;
  for (const r of rows) connections.set(jsValue(r[0]), jsValue(r[r.length - 1]));
}
const schemas = [...new Set(connections.values())];

fs.mkdirSync(path.join(OUT, 'schemas'), { recursive: true });
for (const schema of schemas) {
  const files = fs.readdirSync(SQLINIT)
    .filter(f => f.startsWith(schema + '_') && f.endsWith('.sql') && !f.endsWith('_routines.sql'))
    .sort();
  const parts = [`-- Practice database "${schema}", converted from the v2 MySQL dumps.`, ''];
  for (const f of files) {
    const sql = read(f);
    for (const t of parseCreateTables(sql)) parts.push(createTableToSqlite(t.sql), '');
    for (const [table, rows] of Object.entries(parseInserts(sql))) {
      for (const r of rows) parts.push(`INSERT INTO "${table}" VALUES (${r.map(sqliteLiteral).join(', ')});`);
      parts.push('');
    }
  }
  fs.writeFileSync(path.join(OUT, 'schemas', schema + '.sql'), parts.join('\n'));
  console.log(`  ${schema}: ${files.length} tables`);
}

// --- assignments ---------------------------------------------------------------
const decode = s => s
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&amp;/g, '&');

/** Turn the v2 resultsHTML table into {columns, rows}. */
function parseResultsHtml(html) {
  if (!html) return null;
  const trs = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m =>
    [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => decode(c[1]))
  );
  if (trs.length === 0) return null;
  return { columns: trs[0], rows: trs.slice(1) };
}

const regexes = tableObjects('005_databaas_regexes.sql', 'regexes');
const assignments = tableObjects('002_databaas_assignments.sql', 'assignments').map(a => ({
  id: a.ID,
  schema: connections.get(a.connectionID),
  metaTag: a.meta_tag ?? '',
  title: a.title ?? null,
  description: a.description ?? '',
  query: a.query,
  regexes: regexes
    .filter(r => r.assignmentID === a.ID)
    .map(r => ({ type: r.type, expression: r.expression, description: r.description })),
  expected: parseResultsHtml(a.resultsHTML)
}));

fs.writeFileSync(path.join(OUT, 'assignments.json'), JSON.stringify(assignments, null, 1) + '\n');
console.log(`  assignments: ${assignments.length}, regexes: ${regexes.length}`);
