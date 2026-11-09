// Build the files the browser loads, from data/ (the source of truth in this repo):
//   public/data/<schema>.sqlite    ready-to-open SQLite databases
//   public/data/assignments.json   assignments without the v2 expected output
//   public/sql-wasm.wasm           the SQLite engine
//
//   node scripts/build-data.ts
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'data');
fs.mkdirSync(OUT, { recursive: true });

const SQL = await initSqlJs();
const schemaDir = path.join(ROOT, 'data', 'schemas');
for (const f of fs.readdirSync(schemaDir).filter(f => f.endsWith('.sql'))) {
  const db = new SQL.Database();
  db.run(fs.readFileSync(path.join(schemaDir, f), 'utf8'));
  fs.writeFileSync(path.join(OUT, f.replace(/\.sql$/, '.sqlite')), db.export());
  db.close();
}

const assignments = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'assignments.json'), 'utf8'));
const slim = assignments.map(({ expected: _e, ...a }: { expected: unknown }) => a);
fs.writeFileSync(path.join(OUT, 'assignments.json'), JSON.stringify(slim));

const require = createRequire(import.meta.url);
fs.copyFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'), path.join(ROOT, 'public', 'sql-wasm.wasm'));

console.log(`built ${fs.readdirSync(OUT).length} data files for ${slim.length} assignments`);
