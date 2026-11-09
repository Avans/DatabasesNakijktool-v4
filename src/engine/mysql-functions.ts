// MySQL functions that SQLite lacks (or names differently), as SQLite user functions.
// Dates are stored as 'YYYY-MM-DD[ hh:mm:ss]' text, exactly what MySQL prints.

import type { Database, SqlValue } from 'sql.js';

type V = SqlValue;

interface Parts { y: number; m: number; d: number; h: number; i: number; s: number }

function parseDate(v: V): Parts | null {
  if (v === null || v === undefined) return null;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/.exec(String(v));
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3], h: +(m[4] ?? 0), i: +(m[5] ?? 0), s: +(m[6] ?? 0) };
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const toUtc = (p: Parts) => Date.UTC(p.y, p.m - 1, p.d, p.h, p.i, p.s);
const fromUtc = (ms: number, withTime: boolean) => {
  const d = new Date(ms);
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return withTime ? `${date} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}` : date;
};
const hasTime = (v: V) => /\d:\d/.test(String(v));
const dayNumber = (p: Parts) => Math.floor(Date.UTC(p.y, p.m - 1, p.d) / 86400000);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function nowLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** MySQL WEEK(date, 0): weeks start on Sunday, week 1 has the first Sunday. */
function week0(p: Parts): number {
  const jan1 = new Date(Date.UTC(p.y, 0, 1)).getUTCDay();
  const firstSunday = 1 + ((7 - jan1) % 7);
  const doy = dayNumber(p) - dayNumber({ ...p, m: 1, d: 1 }) + 1;
  return doy < firstSunday ? 0 : Math.floor((doy - firstSunday) / 7) + 1;
}

function addInterval(v: V, n: V, unit: V, sign: 1 | -1): V {
  const p = parseDate(v);
  if (!p || n === null) return null;
  const amount = Number(n) * sign;
  const u = String(unit ?? 'DAY').toUpperCase();
  const time = hasTime(v) || ['HOUR', 'MINUTE', 'SECOND'].includes(u);
  const q = { ...p };
  switch (u) {
    case 'YEAR': q.y += amount; break;
    case 'QUARTER': q.m += amount * 3; break;
    case 'MONTH': q.m += amount; break;
    case 'WEEK': q.d += amount * 7; break;
    case 'DAY': q.d += amount; break;
    case 'HOUR': q.h += amount; break;
    case 'MINUTE': q.i += amount; break;
    case 'SECOND': q.s += amount; break;
    default: return null;
  }
  if (['YEAR', 'QUARTER', 'MONTH'].includes(u)) {
    // MySQL clamps to the last day of the target month.
    const y = q.y + Math.floor((q.m - 1) / 12);
    const m = ((q.m - 1) % 12 + 12) % 12 + 1;
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return fromUtc(Date.UTC(y, m - 1, Math.min(q.d, last), q.h, q.i, q.s), time);
  }
  return fromUtc(Date.UTC(q.y, q.m - 1, q.d, q.h, q.i, q.s), time);
}

function dateFormat(v: V, fmt: V): V {
  const p = parseDate(v);
  if (!p || fmt === null) return null;
  const dow = new Date(toUtc(p)).getUTCDay();
  const map: Record<string, () => string> = {
    Y: () => pad(p.y, 4), y: () => pad(p.y % 100), m: () => pad(p.m), c: () => String(p.m),
    d: () => pad(p.d), e: () => String(p.d), M: () => MONTHS[p.m - 1], b: () => MONTHS[p.m - 1].slice(0, 3),
    W: () => DAYS[dow], a: () => DAYS[dow].slice(0, 3), w: () => String(dow),
    H: () => pad(p.h), k: () => String(p.h), h: () => pad(((p.h + 11) % 12) + 1), I: () => pad(((p.h + 11) % 12) + 1),
    l: () => String(((p.h + 11) % 12) + 1), i: () => pad(p.i), s: () => pad(p.s), S: () => pad(p.s),
    p: () => (p.h < 12 ? 'AM' : 'PM'), T: () => `${pad(p.h)}:${pad(p.i)}:${pad(p.s)}`,
    j: () => pad(dayNumber(p) - dayNumber({ ...p, m: 1, d: 1 }) + 1, 3), U: () => pad(week0(p)),
    D: () => { const s = ['th', 'st', 'nd', 'rd']; const v2 = p.d % 100; return p.d + (s[(v2 - 20) % 10] || s[v2] || s[0]); },
    '%': () => '%'
  };
  return String(fmt).replace(/%(.)/g, (_, c) => (map[c] ? map[c]() : c));
}

function strToDate(v: V, fmt: V): V {
  if (v === null || fmt === null) return null;
  const s = String(v);
  let pos = 0;
  const p: Parts = { y: 0, m: 1, d: 1, h: 0, i: 0, s: 0 };
  let time = false;
  const f = String(fmt);
  for (let k = 0; k < f.length; k++) {
    if (f[k] !== '%') { pos++; continue; }
    const c = f[++k];
    const num = /^\d+/.exec(s.slice(pos));
    if (!num) return null;
    pos += num[0].length;
    const n = Number(num[0]);
    if (c === 'Y') p.y = n; else if (c === 'y') p.y = 2000 + n;
    else if (c === 'm' || c === 'c') p.m = n; else if (c === 'd' || c === 'e') p.d = n;
    else if (c === 'H' || c === 'k') { p.h = n; time = true; } else if (c === 'i') { p.i = n; time = true; }
    else if (c === 's' || c === 'S') { p.s = n; time = true; }
  }
  return fromUtc(toUtc(p), time);
}

function concat(...args: V[]): V {
  if (args.some(a => a === null)) return null;
  return args.map(a => String(a)).join('');
}

function roundHalfAwayFromZero(x: number, d: number): number {
  const f = Math.pow(10, d);
  const r = Math.round(Math.abs(x) * f + 1e-9) / f;
  return x < 0 ? -r : r;
}

/** Register a function for a fixed set of arities (sql.js derives nArg from fn.length). */
function reg(db: Database, name: string, fn: (...a: V[]) => V, arities: number[]) {
  for (const n of arities) {
    const wrapped = (...a: V[]) => fn(...a);
    Object.defineProperty(wrapped, 'length', { value: n });
    db.create_function(name, wrapped as never);
  }
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export function registerMysqlFunctions(db: Database): void {
  const d1 = (name: string, f: (p: Parts, v: V) => V) => reg(db, name, v => { const p = parseDate(v); return p ? f(p, v) : null; }, [1]);

  d1('year', p => p.y);
  d1('month', p => p.m);
  d1('day', p => p.d);
  d1('dayofmonth', p => p.d);
  d1('hour', p => p.h);
  d1('minute', p => p.i);
  d1('second', p => p.s);
  d1('quarter', p => Math.ceil(p.m / 3));
  d1('monthname', p => MONTHS[p.m - 1]);
  d1('dayname', p => DAYS[new Date(toUtc(p)).getUTCDay()]);
  d1('dayofweek', p => new Date(toUtc(p)).getUTCDay() + 1);
  d1('weekday', p => (new Date(toUtc(p)).getUTCDay() + 6) % 7);
  d1('dayofyear', p => dayNumber(p) - dayNumber({ ...p, m: 1, d: 1 }) + 1);
  d1('last_day', p => fromUtc(Date.UTC(p.y, p.m, 0), false));
  d1('to_days', p => dayNumber(p) + 719528);
  reg(db, 'week', v => { const p = parseDate(v); return p ? week0(p) : null; }, [1, 2]);
  reg(db, 'mysql_date', v => { const p = parseDate(v); return p ? fromUtc(toUtc(p), false) : null; }, [1]);

  reg(db, 'now', () => nowLocal(), [0]);
  reg(db, 'sysdate', () => nowLocal(), [0]);
  reg(db, 'curdate', () => nowLocal().slice(0, 10), [0]);
  reg(db, 'curtime', () => nowLocal().slice(11), [0]);
  reg(db, 'datediff', (a, b) => {
    const p = parseDate(a), q = parseDate(b);
    return p && q ? dayNumber(p) - dayNumber(q) : null;
  }, [2]);
  reg(db, 'mysql_timestampdiff', (unit, a, b) => {
    const p = parseDate(a), q = parseDate(b);
    if (!p || !q) return null;
    const u = String(unit).toUpperCase();
    const months = (q.y - p.y) * 12 + (q.m - p.m) - ((q.d * 86400 + q.h * 3600 + q.i * 60 + q.s) < (p.d * 86400 + p.h * 3600 + p.i * 60 + p.s) ? 1 : 0);
    const secs = (toUtc(q) - toUtc(p)) / 1000;
    switch (u) {
      case 'YEAR': return Math.trunc(months / 12);
      case 'QUARTER': return Math.trunc(months / 3);
      case 'MONTH': return months;
      case 'WEEK': return Math.trunc(secs / 604800);
      case 'DAY': return Math.trunc(secs / 86400);
      case 'HOUR': return Math.trunc(secs / 3600);
      case 'MINUTE': return Math.trunc(secs / 60);
      case 'SECOND': return secs;
      default: return null;
    }
  }, [3]);
  reg(db, 'mysql_date_add', (v, n, u) => addInterval(v, n, u, 1), [2, 3]);
  reg(db, 'mysql_date_sub', (v, n, u) => addInterval(v, n, u, -1), [2, 3]);
  reg(db, 'mysql_extract', (u, v) => {
    const p = parseDate(v);
    if (!p) return null;
    const m: Record<string, number> = { YEAR: p.y, MONTH: p.m, DAY: p.d, HOUR: p.h, MINUTE: p.i, SECOND: p.s, QUARTER: Math.ceil(p.m / 3), WEEK: week0(p) };
    return m[String(u).toUpperCase()] ?? null;
  }, [2]);
  reg(db, 'date_format', dateFormat, [2]);
  reg(db, 'str_to_date', strToDate, [2]);

  reg(db, 'mysql_if', (c, a, b) => (c !== null && Number(c) !== 0 && c !== '' ? a : b), [3]);
  reg(db, 'isnull', v => (v === null ? 1 : 0), [1]);
  reg(db, 'mysql_concat', concat, range(1, 32));
  reg(db, 'mysql_concat_ws', (sep, ...args) => (sep === null ? null : args.filter(a => a !== null).map(String).join(String(sep))), range(2, 32));
  reg(db, 'mysql_left', (s, n) => (s === null || n === null ? null : String(s).slice(0, Math.max(0, Number(n)))), [2]);
  reg(db, 'mysql_right', (s, n) => (s === null || n === null ? null : Number(n) <= 0 ? '' : String(s).slice(-Number(n))), [2]);
  reg(db, 'lcase', s => (s === null ? null : String(s).toLowerCase()), [1]);
  reg(db, 'ucase', s => (s === null ? null : String(s).toUpperCase()), [1]);
  reg(db, 'char_length', s => (s === null ? null : [...String(s)].length), [1]);
  reg(db, 'character_length', s => (s === null ? null : [...String(s)].length), [1]);
  reg(db, 'reverse', s => (s === null ? null : [...String(s)].reverse().join('')), [1]);
  reg(db, 'repeat', (s, n) => (s === null || n === null ? null : String(s).repeat(Math.max(0, Number(n)))), [2]);
  reg(db, 'space', n => (n === null ? null : ' '.repeat(Math.max(0, Number(n)))), [1]);
  reg(db, 'lpad', (s, n, p) => {
    if (s === null || n === null || p === null) return null;
    const str = String(s), len = Number(n);
    return str.length >= len ? str.slice(0, len) : String(p).repeat(len).slice(0, len - str.length) + str;
  }, [3]);
  reg(db, 'rpad', (s, n, p) => {
    if (s === null || n === null || p === null) return null;
    const str = String(s), len = Number(n);
    return str.length >= len ? str.slice(0, len) : str + String(p).repeat(len).slice(0, len - str.length);
  }, [3]);
  reg(db, 'locate', (sub, s, start) => {
    if (sub === null || s === null) return null;
    const from = start === undefined || start === null ? 0 : Number(start) - 1;
    return String(s).toLowerCase().indexOf(String(sub).toLowerCase(), from) + 1;
  }, [2, 3]);
  // MySQL's default collation is case-insensitive, so INSTR is too.
  reg(db, 'instr', (s, sub) => (s === null || sub === null ? null : String(s).toLowerCase().indexOf(String(sub).toLowerCase()) + 1), [2]);
  reg(db, 'mysql_round', (x, d) => {
    if (x === null) return null;
    const digits = d === undefined || d === null ? 0 : Number(d);
    return roundHalfAwayFromZero(Number(x), digits);
  }, [1, 2]);
  reg(db, 'mysql_truncate', (x, d) => {
    if (x === null || d === null) return null;
    const f = Math.pow(10, Number(d));
    return Math.trunc(Number(x) * f) / f;
  }, [2]);
  reg(db, 'ceiling', x => (x === null ? null : Math.ceil(Number(x))), [1]);
  reg(db, 'format', (x, d) => {
    if (x === null || d === null) return null;
    return Number(x).toLocaleString('en-US', { minimumFractionDigits: Number(d), maximumFractionDigits: Number(d) });
  }, [2]);
}
