import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import initSqlJs, { type Database } from 'sql.js';
import { openDatabase, runQuery } from '../src/engine/database.ts';
import { grade, Status, type Assignment } from '../src/engine/grader.ts';
import { rewrite } from '../src/engine/rewrite.ts';

let db: Database;
let emp: Database;
const run = (sql: string) => runQuery(db, sql);

beforeAll(async () => {
  const SQL = await initSqlJs();
  const load = (s: string) => fs.readFileSync(path.join(__dirname, '..', 'data', 'schemas', s + '.sql'), 'utf8');
  db = openDatabase(SQL, load('fun4all'));
  emp = openDatabase(SQL, load('employees'));
});

const assignment = (query: string, regexes: Assignment['regexes'] = []): Assignment => ({
  id: 1, schema: 'fun4all', metaTag: '1.01', title: null, description: '', query, regexes
});

describe('MySQL compatibility', () => {
  it('treats double quotes as strings and || as OR', () => {
    expect(run(`SELECT actcode FROM activiteit WHERE actcode = "KLS" || actcode = 'BEU' ORDER BY actcode`).values)
      .toEqual([['BEU'], ['KLS']]);
  });

  it('compares text case-insensitively, like MySQL collations', () => {
    expect(run(`SELECT actcode FROM activiteit WHERE actcode = 'kls'`).values).toEqual([['KLS']]);
  });

  it('divides like MySQL', () => {
    expect(run('SELECT 5 / 2 AS x').values).toEqual([[2.5]]);
  });

  it('supports MySQL functions', () => {
    expect(run(`SELECT CONCAT('a', NULL) AS a, CONCAT('a', 'b') AS b, LEFT('abc', 2) AS c, IF(1 > 0, 'ja', 'nee') AS d,
      YEAR('2011-06-26') AS e, DATE_FORMAT('2011-06-26', '%d-%m-%Y') AS f, DATEDIFF('2011-06-26', '2011-06-20') AS g,
      DATE_ADD('2011-01-31', INTERVAL 1 MONTH) AS h, EXTRACT(MONTH FROM '2011-06-26') AS i,
      TIMESTAMPDIFF(YEAR, '2000-06-27', '2011-06-26') AS j, CAST('12' AS SIGNED) AS k`).values)
      .toEqual([[null, 'ab', 'ab', 'ja', 2011, '26-06-2011', 6, '2011-02-28', 6, 10, 12]]);
  });

  it('compares numbers with numeric strings', () => {
    expect(run(`SELECT COUNT(*) FROM planning WHERE YEAR(datum) = '2011'`).values[0][0]).toBeGreaterThan(0);
  });

  it('accepts schema-qualified tables but keeps table-qualified columns', () => {
    expect(run('SELECT COUNT(*) FROM fun4all.student').ok).toBe(true);
    expect(runQuery(emp, 'SELECT employees.job_id FROM employees JOIN jobs ON employees.job_id = jobs.job_id LIMIT 1').ok).toBe(true);
  });

  it('accepts HAVING without GROUP BY, and aliases in HAVING', () => {
    const r = run('SELECT actomschr, (SELECT COUNT(*) FROM planning WHERE activiteit.actcode = planning.actcode) AS aantal FROM activiteit HAVING aantal > 1');
    expect(r.ok).toBe(true);
  });

  it('GROUP_CONCAT with SEPARATOR', () => {
    const r = run("SELECT GROUP_CONCAT(actcode ORDER BY actcode SEPARATOR '; ') AS x FROM activiteit WHERE actcode IN ('BEU', 'GAB')");
    expect(r.values).toEqual([['BEU; GAB']]);
  });

  it('does not touch string contents', () => {
    expect(rewrite("SELECT 'a || b / c' AS x")).toBe("SELECT 'a || b / c' AS x");
  });

  it('is read-only', () => {
    expect(run("WITH x AS (SELECT 1) DELETE FROM student").ok).toBe(false);
  });

  it('translates errors to Dutch', () => {
    expect(run('SELECT foo FROM student').message).toMatch(/^Kolom 'foo' bestaat niet/);
    expect(run('SELECT * FROM studentjes').message).toBe("Tabel 'studentjes' bestaat niet in deze database.");
  });
});

describe('grading rules', () => {
  const model = 'SELECT naam FROM student WHERE oplcode = "IN" ORDER BY naam';

  it('approves an equivalent query', () => {
    expect(grade(assignment(model), "select s.naam from student s where s.oplcode='in' order by 1;", run).status).toBe(Status.Approved);
  });

  it('rejects comments, empty and non-SELECT queries', () => {
    expect(grade(assignment(model), 'SELECT naam FROM student -- hoi', run).status).toBe(Status.Rejected);
    expect(grade(assignment(model), 'SELECT /* x */ naam FROM student', run).status).toBe(Status.Rejected);
    expect(grade(assignment(model), '   ', run).status).toBe(Status.Rejected);
    expect(grade(assignment(model), 'DELETE FROM student', run).status).toBe(Status.Rejected);
  });

  it('ignores everything after the first semicolon', () => {
    expect(grade(assignment(model), `${model}; DROP TABLE student`, run).status).toBe(Status.Approved);
  });

  it('reports SQL errors as incorrect', () => {
    const v = grade(assignment(model), 'SELECT nam FROM student', run);
    expect(v.status).toBe(Status.Incorrect);
    expect(v.message).toMatch(/Kolom 'nam'/);
  });

  it('reports wrong row and column counts', () => {
    expect(grade(assignment(model), 'SELECT naam FROM student', run).message).toMatch(/Te veel rijen/);
    expect(grade(assignment(model), 'SELECT naam, oplcode FROM student WHERE oplcode = "IN" ORDER BY naam', run).message).toMatch(/Te veel kolommen/);
  });

  it('grades row order only when the model answer has ORDER BY', () => {
    expect(grade(assignment(model), 'SELECT naam FROM student WHERE oplcode = "IN" ORDER BY naam DESC', run).status).toBe(Status.Incorrect);
    const unordered = 'SELECT naam FROM student WHERE oplcode = "IN"';
    expect(grade(assignment(unordered), 'SELECT naam FROM student WHERE oplcode = "IN" ORDER BY naam DESC', run).status).toBe(Status.Approved);
  });

  it('requires matching column names', () => {
    const v = grade(assignment('SELECT naam AS student FROM student'), 'SELECT naam FROM student', run);
    expect(v.status).toBe(Status.Incorrect);
    expect(v.message).toMatch(/kolom 'student' ontbreekt/);
  });

  it('applies regex requirements after a correct result', () => {
    const regexes = [
      { type: 1, expression: 'JOIN', description: 'Gebruik een JOIN' },
      { type: 2, expression: 'IN\\s*\\(', description: 'Gebruik geen subquery met IN' }
    ];
    const a = assignment('SELECT s.naam FROM student s JOIN opleiding o ON s.oplcode = o.oplcode ORDER BY s.naam', regexes);
    const v = grade(a, 'SELECT naam FROM student WHERE oplcode IN (SELECT oplcode FROM opleiding) ORDER BY naam', run);
    expect(v.status).toBe(Status.Denied);
    expect(v.message).toContain('Gebruik een JOIN');
    expect(v.message).toContain('Gebruik geen subquery met IN');
  });
});
