// A practice database: SQLite with MySQL functions, read-only, with Dutch error messages.
import type { Database, SqlJsStatic } from 'sql.js';
import { registerMysqlFunctions } from './mysql-functions.ts';
import { rewrite, qualifyAmbiguous, havingToWhere } from './rewrite.ts';
import type { QueryResult } from './grader.ts';

export function openDatabase(SQL: SqlJsStatic, source: Uint8Array | string): Database {
  const db = typeof source === 'string' ? new SQL.Database() : new SQL.Database(source);
  if (typeof source === 'string') db.run(source);
  registerMysqlFunctions(db);
  db.run('PRAGMA query_only = ON');
  return db;
}

const INTERNAL_NAMES: Record<string, string> = {
  mysql_left: 'LEFT', mysql_right: 'RIGHT', mysql_if: 'IF', mysql_concat: 'CONCAT',
  mysql_concat_ws: 'CONCAT_WS', mysql_round: 'ROUND', mysql_truncate: 'TRUNCATE',
  mysql_date_add: 'DATE_ADD', mysql_date_sub: 'DATE_SUB', mysql_extract: 'EXTRACT',
  mysql_timestampdiff: 'TIMESTAMPDIFF', mysql_date: 'DATE'
};

/** Make SQLite's English error messages readable for students. */
export function translateError(message: string): string {
  const m = message.replace(/\bmysql_\w+/g, n => INTERNAL_NAMES[n] ?? n);
  const rules: [RegExp, (...g: string[]) => string][] = [
    [/^no such column: (.+)$/, c => `Kolom '${c}' bestaat niet. Controleer de spelling en of de tabel in de FROM staat.`],
    [/^no such table: (.+)$/, t => `Tabel '${t}' bestaat niet in deze database.`],
    [/^near "(.+)": syntax error$/, t => `Syntaxfout bij '${t}'.`],
    [/^incomplete input$/, () => 'De query is onvolledig (mist er een haakje of een deel van de query?).'],
    [/^unrecognized token: "(.+)"$/, t => `Onbekend teken: ${t}`],
    [/^no such function: (.+)$/, f => `De functie ${f} bestaat niet (of wordt niet ondersteund).`],
    [/^wrong number of arguments to function (.+)\(\)$/, f => `Verkeerd aantal argumenten voor de functie ${f}().`],
    [/^ambiguous column name: (.+)$/, c => `Kolomnaam '${c}' is dubbelzinnig: zet de tabelnaam of alias ervoor.`],
    [/^misuse of aggregate(?: function)?:? ?(.*)$/, f => `Verkeerd gebruik van de aggregatiefunctie ${f}. Gebruik HAVING in plaats van WHERE om op een aggregatie te filteren.`],
    [/^aggregate functions are not allowed in the GROUP BY clause$/, () => 'Aggregatiefuncties mogen niet in de GROUP BY staan.'],
    [/^a GROUP BY clause is required before HAVING$/, () => 'Voor HAVING is een GROUP BY nodig.'],
    [/^sub-select returns (\d+) columns - expected 1$/, n => `De subquery geeft ${n} kolommen terug, terwijl er 1 verwacht wordt.`],
    [/^SELECTs to the left and right of (\w+) do not have the same number of result columns$/, op => `De query's links en rechts van ${op} hebben niet hetzelfde aantal kolommen.`],
    [/^attempt to write a readonly database$/, () => 'Je mag de database niet wijzigen.'],
    [/^interrupted$/, () => 'De query duurde te lang en is afgebroken.']
  ];
  for (const [re, f] of rules) {
    const g = re.exec(m);
    if (g) return f(...g.slice(1));
  }
  return m;
}

/**
 * Run a (MySQL-flavoured) query. Two MySQL leniencies that SQLite rejects are retried
 * with a corrected query: unqualified names in GROUP/ORDER BY that are ambiguous in the
 * FROM clause, and HAVING without GROUP BY.
 */
export function runQuery(db: Database, sql: string): QueryResult {
  let current = sql;
  let result = runOnce(db, current);
  for (let attempt = 0; attempt < 4 && !result.ok; attempt++) {
    const raw = result.raw ?? '';
    const amb = /^ambiguous column name: (.+)$/.exec(raw);
    let next = current;
    if (amb) next = qualifyAmbiguous(current, amb[1].split('.').pop()!);
    else if (/HAVING clause on a non-aggregate query/.test(raw)) next = havingToWhere(current);
    if (next === current) break;
    const retry = runOnce(db, next);
    if (!retry.ok && retry.raw === raw) break;
    current = next;
    result = retry;
  }
  const { raw: _raw, ...out } = result;
  return out;
}

function runOnce(db: Database, sql: string): QueryResult & { raw?: string } {
  // prepare() + step() (not exec()) so that an empty result still has its column names.
  let stmt;
  try {
    stmt = db.prepare(rewrite(sql));
    const columns = stmt.getColumnNames();
    const values = [];
    while (stmt.step()) values.push(stmt.get());
    return { ok: true, message: '', columns, values };
  } catch (e) {
    const raw = (e as Error).message;
    return { ok: false, message: translateError(raw), raw, columns: [], values: [] };
  } finally {
    stmt?.free();
  }
}
