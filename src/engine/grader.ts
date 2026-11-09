// The grading rules, ported from the v2/v3 server (assignmentService.verifySubmission and
// Assignment.isSimilarToAssignmentResult). Two deliberate changes: the messages are Dutch,
// and when the model answer has no ORDER BY the row order is not graded (SQLite's query
// planner may return rows in another order than MySQL did, which students can't control).
import { hasTopLevelOrderBy } from './rewrite.ts';

export const Status = {
  Unprocessed: 0,
  Approved: 1,
  Rejected: 2,       // comments, empty, or not a SELECT
  Incorrect: 3,      // SQL error or result differs
  Denied: 4,         // a required construct is missing (regexes)
  ManuallyApproved: 5
} as const;
export type Status = (typeof Status)[keyof typeof Status];

export interface Regex { type: number; expression: string; description: string }

export interface Assignment {
  id: number;
  schema: string;
  metaTag: string;
  title: string | null;
  description: string;
  query: string;
  regexes: Regex[];
}

export type Cell = string | number | null | Uint8Array;

export interface QueryResult {
  ok: boolean;
  message: string;
  columns: string[];
  values: Cell[][];
}

export interface Verdict {
  status: Status;
  message: string;
  /** Student's own result (when the query ran). */
  result?: QueryResult;
  /** Where the first difference with the reference result is. */
  diff?: { row: number; column: string } | null;
  /** Whether row order was graded. */
  ordered?: boolean;
}

export type RunQuery = (sql: string) => QueryResult;

const ALLOWED_STATEMENT = /^\s*\(*\s*(SELECT|WITH)\b/i;

/** The query text as the rules see it: up to the first ';', newlines as spaces. */
export function normalizeQuery(query: string): string {
  const semi = query.indexOf(';');
  return (semi === -1 ? query : query.substring(0, semi)).replace(/\r?\n/g, ' ');
}

/** Rows as objects keyed by column name: the last duplicate wins, like the v2 MySQL driver. */
function rowObjects(r: QueryResult): Record<string, Cell>[] {
  return r.values.map(v => {
    const o: Record<string, Cell> = {};
    r.columns.forEach((c, i) => { o[c] = v[i]; });
    return o;
  });
}

export function compareResults(student: QueryResult, reference: QueryResult, ordered = true): { ok: boolean; messages: string[]; diff: Verdict['diff'] } {
  let s = rowObjects(student);
  let a = rowObjects(reference);
  if (!ordered && a.length) {
    // Without ORDER BY in the model answer the row order is up to the database: compare
    // the rows as a set by sorting both on the reference columns.
    const cols = Object.keys(a[0]);
    const key = (r: Record<string, Cell>) => JSON.stringify(cols.map(c => (r[c] === undefined ? '\u0000' : String(r[c]))));
    const sortRows = (rows: Record<string, Cell>[]) => rows.map(r => [key(r), r] as const).sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0)).map(x => x[1]);
    s = sortRows(s);
    a = sortRows(a);
  }
  const messages: string[] = [];
  const sCols = s.length ? Object.keys(s[0]).length : 0;
  const aCols = a.length ? Object.keys(a[0]).length : 0;

  if (s.length < a.length) messages.push(`Te weinig rijen: je query geeft er ${s.length}, verwacht zijn er ${a.length}.`);
  else if (s.length > a.length) messages.push(`Te veel rijen: je query geeft er ${s.length}, verwacht zijn er ${a.length}.`);
  if (sCols < aCols) messages.push(`Te weinig kolommen: je query geeft er ${sCols}, verwacht zijn er ${aCols}.`);
  else if (sCols > aCols) messages.push(`Te veel kolommen: je query geeft er ${sCols}, verwacht zijn er ${aCols}.`);
  if (messages.length) return { ok: false, messages, diff: null };

  let diff: Verdict['diff'] = null;
  for (let row = 0; row < a.length; row++) {
    for (const column of Object.keys(a[row])) {
      const sv = s[row][column];
      const av = a[row][column];
      const inconsistent =
        sv === undefined ||
        (sv === null && av !== null) ||
        (sv !== null && av === null) ||
        (sv !== null && av !== null && String(sv) !== String(av));
      if (!inconsistent) continue;
      if (sv === undefined) {
        messages.push(`De kolom '${column}' ontbreekt in je resultaat (let op de kolomnaam of alias).`);
        return { ok: false, messages, diff: { row, column } };
      }
      diff ??= { row, column };
      if (messages.length < 3) messages.push(`De waarde in rij ${row + 1}, kolom '${column}' wijkt af van de verwachte uitvoer.`);
    }
  }
  if (diff && messages.length >= 3) messages.push('Er zijn mogelijk nog meer verschillen.');
  return { ok: !diff, messages, diff };
}

export function grade(assignment: Assignment, rawQuery: string, run: RunQuery): Verdict {
  const query = normalizeQuery(rawQuery);

  if (query.includes('--') || query.includes('/*')) {
    return { status: Status.Rejected, message: 'Commentaar (-- of /* */) is niet toegestaan in je query.' };
  }
  if (query.trim() === '') return { status: Status.Rejected, message: 'Je hebt nog geen query ingevuld.' };
  if (!ALLOWED_STATEMENT.test(query)) {
    return { status: Status.Rejected, message: 'Alleen SELECT-query\'s zijn toegestaan.' };
  }

  const result = run(query);
  if (!result.ok) return { status: Status.Incorrect, message: result.message, result };

  const reference = run(normalizeQuery(assignment.query));
  if (!reference.ok) {
    console.error(`Reference query of assignment ${assignment.id} failed: ${reference.message}`);
    return { status: Status.Incorrect, message: 'Deze opdracht kan op dit moment niet nagekeken worden.', result };
  }

  const cmp = compareResults(result, reference, hasTopLevelOrderBy(assignment.query));
  if (!cmp.ok) {
    return {
      status: Status.Incorrect,
      message: ['Het resultaat van je query komt niet overeen met de verwachte uitvoer.', ...cmp.messages].join('\n'),
      result,
      diff: cmp.diff
    };
  }

  const denied: string[] = [];
  for (const regex of assignment.regexes) {
    let re: RegExp;
    try {
      re = new RegExp(regex.expression, 'i');
    } catch {
      console.error(`Invalid regex on assignment ${assignment.id}: ${regex.expression}`);
      continue;
    }
    if (regex.type === 1 && !re.test(query)) denied.push(regex.description);
    if (regex.type === 2 && re.test(query)) denied.push(regex.description);
  }
  if (denied.length) {
    return {
      status: Status.Denied,
      message: ['Het resultaat klopt, maar de query voldoet nog niet aan de eisen:', ...denied.map(d => '• ' + d)].join('\n'),
      result
    };
  }

  return { status: Status.Approved, message: 'Je query is goedgekeurd.', result };
}
