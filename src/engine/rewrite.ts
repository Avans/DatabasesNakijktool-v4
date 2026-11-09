// Translate MySQL-flavoured SQL (as students write it, and as the v2 model answers are
// written) into SQL that SQLite understands, with MySQL semantics where they differ.
//
// Works on tokens, so text inside string literals is never touched.

export type Token =
  | { t: 'ws'; v: string }
  | { t: 'str'; v: string }      // decoded string contents
  | { t: 'id'; v: string }       // quoted identifier contents (backticks)
  | { t: 'num'; v: string }
  | { t: 'word'; v: string }
  | { t: 'op'; v: string };

const MYSQL_ESCAPES: Record<string, string> = { n: '\n', r: '\r', t: '\t', '0': '\0', Z: '\x1a', b: '\b' };

export function tokenize(sql: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (/\s/.test(c)) {
      let j = i;
      while (j < sql.length && /\s/.test(sql[j])) j++;
      out.push({ t: 'ws', v: sql.slice(i, j) });
      i = j;
    } else if (c === "'" || c === '"') {
      // In MySQL's default sql_mode both quote styles delimit strings.
      let s = '';
      i++;
      while (i < sql.length) {
        const d = sql[i++];
        if (d === '\\' && i < sql.length) { const e = sql[i++]; s += MYSQL_ESCAPES[e] ?? e; continue; }
        if (d === c) { if (sql[i] === c) { s += c; i++; continue; } break; }
        s += d;
      }
      out.push({ t: 'str', v: s });
    } else if (c === '`') {
      const j = sql.indexOf('`', i + 1);
      const end = j === -1 ? sql.length : j;
      out.push({ t: 'id', v: sql.slice(i + 1, end) });
      i = end + 1;
    } else if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(sql[i + 1] ?? ''))) {
      const m = /^(\d*\.?\d+(?:[eE][-+]?\d+)?|\d+\.)/.exec(sql.slice(i))!;
      out.push({ t: 'num', v: m[0] });
      i += m[0].length;
    } else if (/[A-Za-z_À-￿$]/.test(c)) {
      const m = /^[A-Za-z_0-9À-￿$]+/.exec(sql.slice(i))!;
      out.push({ t: 'word', v: m[0] });
      i += m[0].length;
    } else {
      const three = sql.slice(i, i + 3);
      const two = sql.slice(i, i + 2);
      const op = three === '<=>' ? three
        : ['<=', '>=', '<>', '!=', '||', '&&', ':='].includes(two) ? two
        : c;
      out.push({ t: 'op', v: op });
      i += op.length;
    }
  }
  return out;
}

const quoteStr = (s: string) => "'" + s.replace(/'/g, "''") + "'";
const quoteId = (s: string) => '"' + s.replace(/"/g, '""') + '"';

/** Render tokens as SQLite SQL, or (dialect 'mysql') back as MySQL for another pass. */
export function render(tokens: Token[], dialect: 'sqlite' | 'mysql' = 'sqlite'): string {
  return tokens.map(tk => {
    switch (tk.t) {
      case 'str': return dialect === 'mysql' ? "'" + tk.v.replace(/\\/g, '\\\\').replace(/'/g, "''") + "'" : quoteStr(tk.v);
      case 'id': return dialect === 'mysql' ? '`' + tk.v + '`' : quoteId(tk.v);
      default: return tk.v;
    }
  }).join('');
}

const isWord = (tk: Token | undefined, ...words: string[]) =>
  !!tk && tk.t === 'word' && words.includes(tk.v.toUpperCase());

/** Index of the next non-whitespace token at or after i, or -1. */
function nextSig(tokens: Token[], i: number): number {
  for (let j = i; j < tokens.length; j++) if (tokens[j].t !== 'ws') return j;
  return -1;
}

function prevSig(tokens: Token[], i: number): number {
  for (let j = i; j >= 0; j--) if (tokens[j].t !== 'ws') return j;
  return -1;
}

/** Index of the matching ')' for the '(' at index open. */
function matchParen(tokens: Token[], open: number): number {
  let depth = 0;
  for (let j = open; j < tokens.length; j++) {
    const tk = tokens[j];
    if (tk.t !== 'op') continue;
    if (tk.v === '(') depth++;
    else if (tk.v === ')' && --depth === 0) return j;
  }
  return -1;
}

const UNITS = ['MICROSECOND', 'SECOND', 'MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'];

/** Words that are SQLite keywords but MySQL functions: renamed to our own UDFs. */
const RENAMED_FUNCTIONS: Record<string, string> = {
  LEFT: 'mysql_left',
  RIGHT: 'mysql_right',
  IF: 'mysql_if',
  CONCAT: 'mysql_concat',
  CONCAT_WS: 'mysql_concat_ws',
  ROUND: 'mysql_round',
  TRUNCATE: 'mysql_truncate',
  MID: 'substr',
  GREATEST: 'max',
  LEAST: 'min'
};

/** The practice schemas. `schema.table` in a query refers to the database itself. */
export const SCHEMAS = ['fun4all', 'muziekscholen', 'outerspace', 'studentactiviteiten', 'muziekstukken', 'ruimtereis', 'employees'];

/** Drop `schema.` qualifiers: every practice database is opened as SQLite's main schema. */
function stripSchemaQualifiers(tokens: Token[]): void {
  for (let i = 0; i < tokens.length - 2; i++) {
    const tk = tokens[i];
    const name = tk.t === 'word' || tk.t === 'id' ? tk.v.toLowerCase() : null;
    if (!name || !SCHEMAS.includes(name)) continue;
    const dot = tokens[i + 1];
    const next = tokens[i + 2];
    if (dot.t !== 'op' || dot.v !== '.' || (next.t !== 'word' && next.t !== 'id')) continue;
    if (i > 0 && tokens[i - 1].t === 'op' && tokens[i - 1].v === '.') continue;
    // `employees` is both a schema and a table, so `employees.job_id` must stay. Strip
    // only for a three-part name (schema.table.column) or a table reference in FROM/JOIN.
    const third = tokens[i + 3];
    const threePart = third?.t === 'op' && third.v === '.';
    if (threePart || inTableReference(tokens, i)) tokens.splice(i, 2);
  }
}

/** Whether the token at i is a table reference: right after FROM/JOIN, or after a ',' in a FROM list. */
function inTableReference(tokens: Token[], i: number): boolean {
  const p = prevSig(tokens, i - 1);
  if (p === -1) return false;
  if (isWord(tokens[p], 'FROM', 'JOIN')) return true;
  if (!(tokens[p].t === 'op' && tokens[p].v === ',')) return false;
  // walk back at the same depth to the clause keyword
  let depth = 0;
  for (let j = p - 1; j >= 0; j--) {
    const tk = tokens[j];
    if (tk.t === 'op' && tk.v === ')') depth++;
    if (tk.t === 'op' && tk.v === '(') { if (depth === 0) return false; depth--; }
    if (depth === 0 && isWord(tk, 'SELECT', 'WHERE', 'ON', 'GROUP', 'ORDER', 'HAVING', 'BY')) return false;
    if (depth === 0 && isWord(tk, 'FROM', 'JOIN')) return true;
  }
  return false;
}

const COMPARISON = ['=', '<', '>', '<=', '>=', '<>', '!='];

/**
 * MySQL compares a number with a numeric string as numbers (`YEAR(d) = '1976'`); SQLite
 * never considers an integer equal to text. Turn canonical numeric string literals that
 * take part in a comparison or IN list into number literals. Literals with leading zeros
 * stay strings so `code = '007'` keeps comparing as text.
 */
function numericStringLiterals(tokens: Token[]): void {
  const canonical = /^-?(0|[1-9]\d*)(\.\d*[1-9])?$/;
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk.t !== 'str' || !canonical.test(tk.v)) continue;
    const p = prevSig(tokens, i - 1);
    const n = nextSig(tokens, i + 1);
    const isCmp = (k: number) => k !== -1 && tokens[k].t === 'op' && COMPARISON.includes(tokens[k].v);
    let inList = false;
    if (p !== -1 && tokens[p].t === 'op' && (tokens[p].v === '(' || tokens[p].v === ',')) {
      // find the opening paren and check it follows IN
      let depth = 0;
      for (let j = p; j >= 0; j--) {
        const t = tokens[j];
        if (t.t === 'op' && t.v === ')') depth++;
        if (t.t === 'op' && t.v === '(') {
          if (depth === 0) { inList = isWord(tokens[prevSig(tokens, j - 1)], 'IN'); break; }
          depth--;
        }
      }
    }
    const between = isWord(tokens[p], 'BETWEEN') || (isWord(tokens[p], 'AND') && hasBetweenBefore(tokens, p));
    if (isCmp(p) || isCmp(n) || inList || between) tokens[i] = { t: 'num', v: tk.v };
  }
}

function hasBetweenBefore(tokens: Token[], andIdx: number): boolean {
  const v = prevSig(tokens, andIdx - 1);
  const b = v === -1 ? -1 : prevSig(tokens, v - 1);
  return b !== -1 && isWord(tokens[b], 'BETWEEN');
}

/**
 * In HAVING, MySQL resolves a name to a select-list alias before a table column; SQLite
 * does the opposite. Replace alias references in HAVING by the aliased expression.
 */
function expandHavingAliases(tokens: Token[]): void {
  for (const s of selectScopes(tokens).reverse()) {
    const cl = clauses(tokens, s);
    if (cl.HAVING === undefined) continue;
    // explicit `expr AS alias` items of the select list
    const aliases = new Map<string, Token[]>();
    let depth = 0;
    let itemStart = s.select + 1;
    for (let j = s.select + 1; j <= s.from; j++) {
      const tk = tokens[j];
      if (tk.t === 'op' && tk.v === '(') depth++;
      if (tk.t === 'op' && tk.v === ')') depth--;
      if (depth !== 0) continue;
      if (j === s.from || (tk.t === 'op' && tk.v === ',')) {
        const item = tokens.slice(itemStart, j);
        let d2 = 0;
        const asIdx = item.findIndex(t => {
          if (t.t === 'op' && t.v === '(') d2++;
          if (t.t === 'op' && t.v === ')') d2--;
          return d2 === 0 && isWord(t, 'AS');
        });
        const name = item.filter(t => t.t !== 'ws').pop();
        if (asIdx > 0 && name && (name.t === 'word' || name.t === 'id')) {
          aliases.set(name.v.toLowerCase(), item.slice(0, asIdx));
        }
        itemStart = j + 1;
      }
    }
    if (!aliases.size) continue;
    const end = [cl.ORDER, cl.LIMIT, s.end].filter(x => x !== undefined && x > cl.HAVING!).reduce((a, b) => Math.min(a!, b!))!;
    const out: Token[] = [];
    for (let j = cl.HAVING + 1; j < end; j++) {
      const tk = tokens[j];
      const prev = tokens[j - 1];
      const next = tokens[j + 1];
      const qualified = (prev?.t === 'op' && prev.v === '.') || (next?.t === 'op' && (next.v === '.' || next.v === '('));
      const expr = (tk.t === 'word' || tk.t === 'id') && !qualified ? aliases.get(tk.v.toLowerCase()) : undefined;
      if (expr) out.push({ t: 'op', v: '(' }, ...expr.map(t => ({ ...t })), { t: 'op', v: ')' });
      else out.push(tk);
    }
    tokens.splice(cl.HAVING + 1, end - cl.HAVING - 1, ...out);
  }
}

interface Scope { select: number; from: number; end: number }

/** Every SELECT at its own nesting level, with the token range of its clauses. */
function selectScopes(tokens: Token[]): Scope[] {
  const depthAt: number[] = [];
  let depth = 0;
  for (const tk of tokens) {
    if (tk.t === 'op' && tk.v === ')') depth--;
    depthAt.push(depth);
    if (tk.t === 'op' && tk.v === '(') depth++;
  }
  const scopes: Scope[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (!isWord(tokens[i], 'SELECT')) continue;
    const d = depthAt[i];
    let from = -1;
    let end = tokens.length;
    for (let j = i + 1; j < tokens.length; j++) {
      if (depthAt[j] < d) { end = j; break; }
      if (depthAt[j] !== d) continue;
      if (from === -1 && isWord(tokens[j], 'FROM')) from = j;
      if (isWord(tokens[j], 'UNION', 'INTERSECT', 'EXCEPT')) { end = j; break; }
    }
    scopes.push({ select: i, from: from === -1 ? end : from, end });
  }
  return scopes;
}

/** Top-level clause keyword positions (GROUP, HAVING, ORDER, WHERE, LIMIT) inside a scope. */
function clauses(tokens: Token[], s: Scope): Record<string, number> {
  const found: Record<string, number> = {};
  let depth = 0;
  for (let j = s.from; j < s.end; j++) {
    const tk = tokens[j];
    if (tk.t === 'op' && tk.v === '(') depth++;
    if (tk.t === 'op' && tk.v === ')') depth--;
    if (depth === 0 && isWord(tk, 'WHERE', 'GROUP', 'HAVING', 'ORDER', 'LIMIT') && found[tk.v.toUpperCase()] === undefined) {
      found[tk.v.toUpperCase()] = j;
    }
  }
  return found;
}

/**
 * MySQL resolves an unqualified name in GROUP BY / ORDER BY to the matching select-list
 * column; SQLite reports it as ambiguous. Qualify `column` like it is in the select list.
 */
export function qualifyAmbiguous(sql: string, column: string): string {
  const tokens = tokenize(sql);
  const target = column.toLowerCase();
  for (const s of selectScopes(tokens).reverse()) {
    // find `x.column` in the select list
    let qualifier: Token | null = null;
    for (let j = s.select + 1; j < s.from - 2; j++) {
      const a = tokens[j], dot = tokens[j + 1], c = tokens[j + 2];
      if ((a.t === 'word' || a.t === 'id') && dot.t === 'op' && dot.v === '.' &&
          (c.t === 'word' || c.t === 'id') && c.v.toLowerCase() === target) { qualifier = a; break; }
    }
    if (!qualifier) continue;
    const cl = clauses(tokens, s);
    const starts = [cl.GROUP, cl.ORDER, cl.HAVING].filter(x => x !== undefined) as number[];
    for (const start of starts) {
      let depth = 0;
      for (let j = start + 1; j < s.end; j++) {
        const tk = tokens[j];
        if (tk.t === 'op' && tk.v === '(') depth++;
        if (tk.t === 'op' && tk.v === ')') depth--;
        if (depth === 0 && j !== start && isWord(tk, 'GROUP', 'HAVING', 'ORDER', 'LIMIT')) break;
        if ((tk.t === 'word' || tk.t === 'id') && tk.v.toLowerCase() === target) {
          const prev = tokens[j - 1];
          const next = tokens[j + 1];
          if (prev?.t === 'op' && prev.v === '.') continue;
          if (next?.t === 'op' && (next.v === '.' || next.v === '(')) continue;
          tokens.splice(j, 0, qualifier, { t: 'op', v: '.' });
          j += 2;
          s.end += 2;
        }
      }
    }
  }
  return render(tokens, 'mysql');
}

/**
 * MySQL allows HAVING without GROUP BY as a filter on select-list aliases. SQLite allows
 * aliases in WHERE, so turn `... [WHERE a] HAVING b` into `... WHERE (a) AND (b)`.
 */
export function havingToWhere(sql: string): string {
  const tokens = tokenize(sql);
  for (const s of selectScopes(tokens).reverse()) {
    const cl = clauses(tokens, s);
    if (cl.HAVING === undefined || cl.GROUP !== undefined) continue;
    const havingEnd = [cl.ORDER, cl.LIMIT, s.end].filter(x => x !== undefined && x > cl.HAVING) as number[];
    const end = Math.min(...havingEnd);
    if (cl.WHERE === undefined) {
      tokens[cl.HAVING] = { t: 'word', v: 'WHERE' };
    } else {
      tokens.splice(end, 0, { t: 'op', v: ')' }, { t: 'ws', v: ' ' });
      tokens.splice(cl.HAVING, 1, { t: 'op', v: ')' }, { t: 'ws', v: ' ' }, { t: 'word', v: 'AND' }, { t: 'ws', v: ' ' }, { t: 'op', v: '(' });
      tokens.splice(cl.WHERE + 1, 0, { t: 'ws', v: ' ' }, { t: 'op', v: '(' });
    }
  }
  return render(tokens, 'mysql');
}

export function rewrite(sql: string): string {
  const tokens = tokenize(sql);
  stripSchemaQualifiers(tokens);
  numericStringLiterals(tokens);
  expandHavingAliases(tokens);

  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];

    // MySQL default mode: || is OR, && is AND.
    if (tk.t === 'op' && tk.v === '||') { tokens[i] = { t: 'word', v: 'OR' }; continue; }
    if (tk.t === 'op' && tk.v === '&&') { tokens[i] = { t: 'word', v: 'AND' }; continue; }
    // Null-safe equality.
    if (tk.t === 'op' && tk.v === '<=>') { tokens[i] = { t: 'word', v: 'IS' }; continue; }
    // MySQL '/' always yields a decimal; SQLite truncates integer division.
    if (tk.t === 'op' && tk.v === '/') {
      tokens.splice(i, 1, { t: 'op', v: '*' }, { t: 'num', v: '1.0' }, { t: 'op', v: '/' });
      i += 2;
      continue;
    }
    // Integer division: SQLite's '/' on integers already truncates like DIV.
    if (isWord(tk, 'DIV')) { tokens[i] = { t: 'op', v: '/' }; continue; }

    if (tk.t !== 'word') continue;
    const upper = tk.v.toUpperCase();
    const n = nextSig(tokens, i + 1);
    const isCall = n !== -1 && tokens[n].t === 'op' && tokens[n].v === '(';
    if (!isCall) continue;
    const close = matchParen(tokens, n);
    if (close === -1) continue;

    if (upper === 'CAST' || upper === 'CONVERT') {
      // CAST(x AS SIGNED) etc. -> SQLite types.
      for (let j = n + 1; j < close; j++) {
        if (!isWord(tokens[j], 'AS')) continue;
        const t = nextSig(tokens, j + 1);
        if (t === -1 || t >= close) break;
        const typ = tokens[t].v.toUpperCase();
        let end = t;
        // swallow optional (p,s) and a trailing INTEGER after SIGNED/UNSIGNED
        const after = nextSig(tokens, t + 1);
        if (after !== -1 && after < close && tokens[after].v === '(') end = matchParen(tokens, after);
        else if ((typ === 'SIGNED' || typ === 'UNSIGNED') && after !== -1 && isWord(tokens[after], 'INT', 'INTEGER')) end = after;
        const map: Record<string, string> = {
          SIGNED: 'INTEGER', UNSIGNED: 'INTEGER', INT: 'INTEGER', INTEGER: 'INTEGER',
          DECIMAL: 'NUMERIC', NUMERIC: 'NUMERIC', FLOAT: 'REAL', DOUBLE: 'REAL', REAL: 'REAL',
          CHAR: 'TEXT', VARCHAR: 'TEXT', TEXT: 'TEXT', DATE: 'TEXT', DATETIME: 'TEXT', TIME: 'TEXT'
        };
        if (map[typ]) tokens.splice(t, end - t + 1, { t: 'word', v: map[typ] });
        break;
      }
      if (upper === 'CONVERT') tokens[i] = { t: 'word', v: 'CAST' };
      continue;
    }

    if (upper === 'EXTRACT') {
      // EXTRACT(YEAR FROM x) -> mysql_extract('YEAR', x)
      const u = nextSig(tokens, n + 1);
      const f = u === -1 ? -1 : nextSig(tokens, u + 1);
      if (u !== -1 && f !== -1 && isWord(tokens[f], 'FROM')) {
        tokens.splice(u, f - u + 1, { t: 'str', v: tokens[u].v.toUpperCase() }, { t: 'op', v: ',' });
        tokens[i] = { t: 'word', v: 'mysql_extract' };
      }
      continue;
    }

    if (upper === 'TIMESTAMPDIFF' || upper === 'TIMESTAMPADD') {
      const u = nextSig(tokens, n + 1);
      if (u !== -1 && tokens[u].t === 'word' && UNITS.includes(tokens[u].v.toUpperCase())) {
        tokens[u] = { t: 'str', v: tokens[u].v.toUpperCase() };
      }
      tokens[i] = { t: 'word', v: 'mysql_' + upper.toLowerCase() };
      continue;
    }

    if (['DATE_ADD', 'DATE_SUB', 'ADDDATE', 'SUBDATE'].includes(upper)) {
      // DATE_ADD(d, INTERVAL n UNIT) -> mysql_date_add(d, n, 'UNIT')
      for (let j = n + 1; j < close; j++) {
        if (!isWord(tokens[j], 'INTERVAL')) continue;
        // find the unit: last word before close
        const u = prevSig(tokens, close - 1);
        if (u > j && tokens[u].t === 'word' && UNITS.includes(tokens[u].v.toUpperCase())) {
          tokens[u] = { t: 'str', v: tokens[u].v.toUpperCase() };
          tokens.splice(u, 0, { t: 'op', v: ',' });
        }
        tokens.splice(j, 1);
        break;
      }
      const sub = upper === 'DATE_SUB' || upper === 'SUBDATE';
      tokens[i] = { t: 'word', v: sub ? 'mysql_date_sub' : 'mysql_date_add' };
      continue;
    }

    if (upper === 'GROUP_CONCAT') {
      // GROUP_CONCAT(x ORDER BY y SEPARATOR 's'): SQLite takes the separator as 2nd arg.
      // SQLite (3.44+) supports ORDER BY inside aggregate calls, but only after the arguments.
      let sepIdx = -1;
      let orderIdx = -1;
      let depth = 0;
      for (let j = n + 1; j < close; j++) {
        const t = tokens[j];
        if (t.t === 'op' && t.v === '(') depth++;
        if (t.t === 'op' && t.v === ')') depth--;
        if (depth !== 0) continue;
        if (isWord(t, 'SEPARATOR')) sepIdx = j;
        if (isWord(t, 'ORDER') && orderIdx === -1) orderIdx = j;
      }
      let sep: Token = { t: 'str', v: ',' };
      if (sepIdx !== -1) {
        const s = nextSig(tokens, sepIdx + 1);
        sep = tokens[s];
        tokens.splice(sepIdx, s - sepIdx + 1);
      }
      const c2 = matchParen(tokens, n);
      const insertAt = orderIdx !== -1 ? orderIdx : c2;
      const hasDistinct = isWord(tokens[nextSig(tokens, n + 1)], 'DISTINCT');
      // SQLite forbids DISTINCT together with a separator argument; the default ',' is
      // what MySQL uses too, so only pass the separator when it differs.
      if (!(hasDistinct && sep.t === 'str' && sep.v === ',')) {
        tokens.splice(insertAt, 0, { t: 'op', v: ',' }, sep, { t: 'ws', v: ' ' });
      }
      continue;
    }

    const renamed = RENAMED_FUNCTIONS[upper];
    if (renamed) tokens[i] = { t: 'word', v: renamed };
  }

  return render(tokens);
}

/** Whether the outermost query has an ORDER BY (so row order is part of the answer). */
export function hasTopLevelOrderBy(sql: string): boolean {
  let depth = 0;
  for (const tk of tokenize(sql)) {
    if (tk.t === 'op' && tk.v === '(') depth++;
    if (tk.t === 'op' && tk.v === ')') depth--;
    if (depth === 0 && isWord(tk, 'ORDER')) return true;
  }
  return false;
}
