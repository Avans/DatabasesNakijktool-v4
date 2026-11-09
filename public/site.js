// Overview page: every assignment, grouped by series (id / 100), with local progress.
const groupsEl = document.getElementById('groups');
const q = document.getElementById('q');
const dbSel = document.getElementById('db');
const progressEl = document.getElementById('progress');

function progress() {
  const done = new Set();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const m = k && /^wd-datab1:v4:(\d+)$/.exec(k);
      if (!m) continue;
      const s = JSON.parse(localStorage.getItem(k) || 'null');
      if (s && (s.approvedAt || s.status === 1)) done.add(Number(m[1]));
    }
  } catch { /* storage unavailable */ }
  return done;
}

const titleOf = a => a.title || `Opdracht ${a.metaTag}`;

function render(all) {
  const done = progress();
  const term = q.value.trim().toLowerCase();
  const db = dbSel.value;
  const shown = all.filter(a =>
    (!db || a.schema === db) &&
    (!term || String(a.id).includes(term) || titleOf(a).toLowerCase().includes(term) || a.description.toLowerCase().includes(term))
  );
  progressEl.textContent = `${[...done].filter(id => all.some(a => a.id === id)).length} van ${all.length} gemaakt`;
  groupsEl.replaceChildren();
  if (!shown.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Geen opdrachten gevonden.';
    groupsEl.append(p);
    return;
  }
  const groups = new Map();
  for (const a of shown) {
    const k = Math.floor(a.id / 100);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(a);
  }
  for (const [k, items] of groups) {
    const section = document.createElement('section');
    section.className = 'group';
    const h2 = document.createElement('h2');
    const schemas = [...new Set(items.map(a => a.schema))].join(', ');
    h2.textContent = `Reeks ${k} · ${schemas} `;
    const small = document.createElement('small');
    small.textContent = `${items[0].id}–${items[items.length - 1].id}`;
    h2.append(small);
    const ul = document.createElement('ul');
    ul.className = 'list';
    for (const a of items) {
      const li = document.createElement('li');
      li.className = 'item' + (done.has(a.id) ? ' done' : '');
      const link = document.createElement('a');
      link.href = `opdracht.html?aid=${a.id}`;
      const row = document.createElement('div');
      row.className = 'row';
      const t = document.createElement('span');
      t.className = 't';
      t.textContent = titleOf(a);
      const id = document.createElement('span');
      id.className = done.has(a.id) ? 'ok' : 'id';
      id.textContent = done.has(a.id) ? '✓ gemaakt' : `aid ${a.id}`;
      row.append(t, id);
      const d = document.createElement('div');
      d.className = 'd';
      d.textContent = a.description;
      link.append(row, d);
      li.append(link);
      ul.append(li);
    }
    section.append(h2, ul);
    groupsEl.append(section);
  }
}

fetch('data/assignments.json')
  .then(r => r.json())
  .then(all => {
    for (const s of [...new Set(all.map(a => a.schema))].sort()) {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s;
      dbSel.append(o);
    }
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('db')) dbSel.value = params.get('db');
    } catch { /* ignore */ }
    render(all);
    q.addEventListener('input', () => render(all));
    dbSel.addEventListener('change', () => render(all));
  })
  .catch(() => { groupsEl.innerHTML = '<p class="empty">De opdrachten konden niet geladen worden.</p>'; });
