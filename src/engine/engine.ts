// Loads sql.js, the assignments and the practice databases on demand, and answers requests.
// Runs inside the web worker (or, as a fallback, on the main thread).
import initSqlJs from 'sql.js/dist/sql-wasm.js';
import type { Database, SqlJsStatic } from 'sql.js';
import { openDatabase, runQuery } from './database.ts';
import { grade, normalizeQuery, type Assignment } from './grader.ts';
import type { AssignmentInfo, Request, ResponseMap, TableInfo } from '../protocol.ts';

export class Engine {
  private sql: Promise<SqlJsStatic>;
  private assignments: Promise<Map<number, Assignment>>;
  private dbs = new Map<string, Promise<Database>>();
  private base: string;

  constructor(base: string) {
    this.base = base;
    this.sql = (initSqlJs as unknown as (c: object) => Promise<SqlJsStatic>)({ locateFile: (f: string) => base + f });
    this.assignments = fetch(base + 'data/assignments.json')
      .then(r => {
        if (!r.ok) throw new Error('Opdrachten konden niet geladen worden (' + r.status + ').');
        return r.json();
      })
      .then((list: Assignment[]) => new Map(list.map(a => [a.id, a])));
    // don't leave unhandled rejections around before the first request
    this.assignments.catch(() => {});
    this.sql.catch(() => {});
  }

  private async assignment(aid: number): Promise<Assignment> {
    const a = (await this.assignments).get(aid);
    if (!a) throw new Error(`Opdracht ${aid} bestaat niet.`);
    return a;
  }

  private db(schema: string): Promise<Database> {
    let p = this.dbs.get(schema);
    if (!p) {
      p = Promise.all([this.sql, fetch(this.base + `data/${schema}.sqlite`)]).then(async ([SQL, res]) => {
        if (!res.ok) throw new Error(`Database ${schema} kon niet geladen worden (${res.status}).`);
        return openDatabase(SQL, new Uint8Array(await res.arrayBuffer()));
      });
      p.catch(() => this.dbs.delete(schema));
      this.dbs.set(schema, p);
    }
    return p;
  }

  async handle<R extends Request>(req: R): Promise<ResponseMap[R['type']]> {
    type Out = ResponseMap[R['type']];
    switch (req.type) {
      case 'init':
        return true as Out;
      case 'assignment': {
        const a = (await this.assignments).get(req.aid);
        if (!a) return null as Out;
        const info: AssignmentInfo = {
          id: a.id,
          schema: a.schema,
          metaTag: a.metaTag,
          title: a.title || `Opdracht ${a.metaTag}`,
          description: a.description,
          requirements: a.regexes.map(r => r.description)
        };
        return info as Out;
      }
      case 'grade': {
        const a = await this.assignment(req.aid);
        const db = await this.db(a.schema);
        return grade(a, req.query, sql => runQuery(db, sql)) as Out;
      }
      case 'run': {
        const a = await this.assignment(req.aid);
        return runQuery(await this.db(a.schema), normalizeQuery(req.query)) as Out;
      }
      case 'expected': {
        const a = await this.assignment(req.aid);
        return runQuery(await this.db(a.schema), normalizeQuery(a.query)) as Out;
      }
      case 'schema': {
        const a = await this.assignment(req.aid);
        const db = await this.db(a.schema);
        const tables = db.exec("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")[0]?.values ?? [];
        const info: TableInfo[] = tables.map(([name]) => {
          const cols = db.exec(`PRAGMA table_info("${String(name)}")`)[0]?.values ?? [];
          return {
            name: String(name),
            columns: cols.map(c => ({ name: String(c[1]), type: String(c[2]).replace(/ COLLATE NOCASE/i, ''), pk: Number(c[5]) > 0 }))
          };
        });
        return info as Out;
      }
    }
    throw new Error('Onbekend verzoek');
  }
}
