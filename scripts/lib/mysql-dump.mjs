// Minimal parser for mysqldump output: just enough for the v2 sqlinit/ dumps.

/** Split a dump into statements, respecting quoted strings. */
export function splitStatements(sql) {
  const out = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (quote) {
      cur += c;
      if (c === '\\') { cur += sql[++i] ?? ''; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue; }
    if (c === '-' && sql[i + 1] === '-' && (i === 0 || sql[i - 1] === '\n')) {
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }
    if (c === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const ESCAPES = { n: '\n', r: '\r', t: '\t', 0: '\0', Z: '\x1a', b: '\b' };

/**
 * Parse the part after `VALUES` of an extended INSERT into an array of rows.
 * Values become: null, string, or number-as-string tagged {num: '12.50'}.
 */
export function parseValues(src) {
  const rows = [];
  let i = 0;
  const skipWs = () => { while (i < src.length && /\s/.test(src[i])) i++; };
  while (i < src.length) {
    skipWs();
    if (src[i] === ',') { i++; continue; }
    if (src[i] !== '(') { if (i >= src.length) break; throw new Error('Expected ( at ' + i + ': ' + src.slice(i, i + 40)); }
    i++;
    const row = [];
    for (;;) {
      skipWs();
      if (src[i] === "'") {
        i++;
        let s = '';
        for (;;) {
          const c = src[i++];
          if (c === undefined) throw new Error('Unterminated string');
          if (c === '\\') { const e = src[i++]; s += ESCAPES[e] ?? e; continue; }
          if (c === "'") { if (src[i] === "'") { s += "'"; i++; continue; } break; }
          s += c;
        }
        row.push(s);
      } else {
        const m = /^[^,)]+/.exec(src.slice(i));
        const tok = m[0].trim();
        i += m[0].length;
        if (/^NULL$/i.test(tok)) row.push(null);
        else if (/^-?\d+(\.\d+)?(e[-+]?\d+)?$/i.test(tok)) row.push({ num: tok });
        else throw new Error('Unknown token ' + tok);
      }
      skipWs();
      if (src[i] === ',') { i++; continue; }
      if (src[i] === ')') { i++; break; }
      throw new Error('Unexpected char ' + src[i] + ' at ' + i);
    }
    rows.push(row);
  }
  return rows;
}

/** Parse every `INSERT INTO `t` VALUES ...` statement in a dump. */
export function parseInserts(sql) {
  const tables = {};
  for (const st of splitStatements(sql)) {
    const m = /^INSERT INTO `(\w+)`\s*(?:\([^)]*\)\s*)?VALUES\s*/i.exec(st);
    if (!m) continue;
    (tables[m[1]] ??= []).push(...parseValues(st.slice(m[0].length)));
  }
  return tables;
}

/** Extract CREATE TABLE statements: [{name, sql}]. */
export function parseCreateTables(sql) {
  return splitStatements(sql)
    .filter(st => /^CREATE TABLE/i.test(st))
    .map(st => ({ name: /^CREATE TABLE `(\w+)`/i.exec(st)[1], sql: st }));
}

/** Convert a MySQL CREATE TABLE statement to SQLite. */
export function createTableToSqlite(mysql) {
  const name = /^CREATE TABLE `(\w+)`/i.exec(mysql)[1];
  const body = mysql.slice(mysql.indexOf('(') + 1, mysql.lastIndexOf(')'));
  const lines = body.split('\n').map(l => l.trim().replace(/,$/, '')).filter(Boolean);
  const defs = [];
  for (const line of lines) {
    let m;
    if ((m = /^`(\w+)`\s+(\w+)(\([^)]*\))?\s*(.*)$/.exec(line))) {
      const [, col, rawType, params, restRaw] = m;
      // Keep the MySQL type name (students see it in the table overview); SQLite derives
      // the right affinity from it. Text gets NOCASE: MySQL's default collations are
      // case-insensitive.
      const t = rawType.toLowerCase();
      const isText = /char|text|enum|set/.test(t);
      const type = (/^int$/.test(t) ? 'INT' : t.toUpperCase() + (params ?? '')) + (isText ? ' COLLATE NOCASE' : '');
      const rest = restRaw
        .replace(/\bunsigned\b/gi, '')
        .replace(/\bAUTO_INCREMENT\b/gi, '')
        .replace(/\bON UPDATE CURRENT_TIMESTAMP\b/gi, '')
        .replace(/\bCHARACTER SET \w+/gi, '')
        .replace(/\bCOLLATE \w+/gi, '')
        .replace(/\bCOMMENT\s+'(?:[^'\\]|\\.)*'/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      defs.push(`  "${col}" ${type}${rest ? ' ' + rest : ''}`);
    } else if ((m = /^PRIMARY KEY \((.*)\)$/i.exec(line))) {
      defs.push(`  PRIMARY KEY (${unquoteList(m[1])})`);
    } else if ((m = /^UNIQUE KEY `\w+` \((.*)\)$/i.exec(line))) {
      defs.push(`  UNIQUE (${unquoteList(m[1])})`);
    } else if (/^(KEY|INDEX|FULLTEXT)/i.test(line)) {
      // plain indexes are irrelevant for these tiny datasets
    } else if ((m = /^CONSTRAINT `\w+` FOREIGN KEY \((.*?)\) REFERENCES `(\w+)` \((.*?)\)(.*)$/i.exec(line))) {
      defs.push(`  FOREIGN KEY (${unquoteList(m[1])}) REFERENCES "${m[2]}" (${unquoteList(m[3])})${m[4]}`);
    } else {
      throw new Error(`Unsupported line in ${name}: ${line}`);
    }
  }
  return `CREATE TABLE "${name}" (\n${defs.join(',\n')}\n);`;
}

function unquoteList(s) {
  return s.split(',').map(x => '"' + x.trim().replace(/`/g, '').replace(/\(\d+\)$/, '') + '"').join(', ');
}

/** Render a parsed value as a SQLite literal. */
export function sqliteLiteral(v) {
  if (v === null) return 'NULL';
  if (typeof v === 'object') return v.num;
  return "'" + v.replace(/'/g, "''") + "'";
}

/** Plain JS value of a parsed value. */
export function jsValue(v) {
  if (v === null) return null;
  if (typeof v === 'object') return Number(v.num);
  return v;
}
