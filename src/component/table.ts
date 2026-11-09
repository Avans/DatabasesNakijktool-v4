import type { QueryResult, Verdict } from '../engine/grader.ts';

const MAX_ROWS = 500;

export function renderTable(r: QueryResult, diff: Verdict['diff'] = null): HTMLElement {
  const frag = document.createElement('div');
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const table = document.createElement('table');
  const thead = table.createTHead().insertRow();
  for (const c of r.columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = c;
    thead.append(th);
  }
  const tbody = table.createTBody();
  r.values.slice(0, MAX_ROWS).forEach((row, ri) => {
    const tr = tbody.insertRow();
    row.forEach((v, ci) => {
      const td = tr.insertCell();
      if (v === null) { td.textContent = 'NULL'; td.className = 'null'; }
      else if (typeof v === 'number') { td.textContent = formatNumber(v); td.className = 'num'; }
      else if (v instanceof Uint8Array) td.textContent = `[${v.length} bytes]`;
      else td.textContent = v;
      if (diff && diff.row === ri && r.columns[ci] === diff.column) {
        td.classList.add('diff');
        td.title = 'Hier wijkt je resultaat af';
      }
    });
  });
  wrap.append(table);
  const count = document.createElement('div');
  count.className = 'count';
  const n = r.values.length;
  count.textContent = (n === 1 ? '1 rij' : `${n} rijen`) + (n > MAX_ROWS ? ` (eerste ${MAX_ROWS} getoond)` : '');
  frag.append(wrap, count);
  return frag;
}

/** Hide floating-point noise (0.30000000000000004) without changing real values. */
function formatNumber(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return String(Number(v.toPrecision(12)));
}
