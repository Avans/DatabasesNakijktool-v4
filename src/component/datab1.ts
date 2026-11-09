// <wd-datab1 aid="21506"></wd-datab1>
//
// Same tag and the same flow as v2: title, description, "show expected output", a query
// box, submit, feedback, and the last submission remembered. Everything runs locally.
import { styles } from './styles.ts';
import { createEditor, type Editor } from './editor.ts';
import { renderTable } from './table.ts';
import { loadSubmission, saveSubmission, type StoredSubmission } from './storage.ts';
import { Status, type QueryResult, type Verdict } from '../engine/grader.ts';
import type { AssignmentInfo, TableInfo } from '../protocol.ts';
import { QUERY_TIMEOUT_MS, type EngineClient } from '../client.ts';

const chevron = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function defineDatab1(getClient: () => EngineClient) {
  class Datab1 extends HTMLElement {
    private root: ShadowRoot;
    private aid = 0;
    private info: AssignmentInfo | null = null;
    private editor: Editor | null = null;
    private busy = false;
    private els: Record<string, HTMLElement> = {};

    constructor() {
      super();
      this.root = this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      if (this.els.card) return;
      this.aid = Number(this.getAttribute('aid'));
      const style = el('style');
      style.textContent = styles;
      this.root.append(style);
      const card = el('section', 'card');
      card.setAttribute('aria-busy', 'true');
      card.innerHTML = '<div class="loading">Opdracht laden…<div class="skeleton" style="width:60%"></div><div class="skeleton" style="width:85%"></div></div>';
      this.root.append(card);
      this.els.card = card;
      this.load();
    }

    private async load() {
      const client = getClient();
      try {
        if (!Number.isInteger(this.aid) || this.aid <= 0) throw new Error('Dit component heeft geen geldig aid-attribuut.');
        const info = await client.request({ type: 'assignment', aid: this.aid });
        if (!info) throw new Error(`Opdracht ${this.aid} bestaat niet.`);
        this.info = info;
        this.render(info, loadSubmission(this.aid));
        // load the database right away, so the first submit is quick (and not cut off by the timeout)
        client.request({ type: 'schema', aid: this.aid }).then(t => this.renderSchema(t)).catch(() => {});
      } catch (e) {
        this.els.card.removeAttribute('aria-busy');
        this.els.card.innerHTML = '';
        const box = el('div', 'body');
        const fb = el('div', 'feedback error');
        fb.append(el('div', 'title', 'Deze opdracht kon niet geladen worden'), el('p', '', (e as Error).message));
        box.append(fb);
        this.els.card.append(box);
      }
    }

    private render(info: AssignmentInfo, saved: StoredSubmission | null) {
      const card = this.els.card;
      card.removeAttribute('aria-busy');
      card.innerHTML = '';
      card.setAttribute('aria-label', info.title);

      // --- assignment ---
      const head = el('div', 'head');
      const bar = el('div', 'titlebar');
      const h2 = el('h2', '', info.title);
      const status = el('span', 'badge');
      bar.append(h2, el('span', 'spacer'), status);
      head.append(bar, el('p', 'description', info.description));
      if (info.requirements.length) {
        const req = el('div', 'requirements');
        req.append(el('strong', '', 'Eisen aan je query'));
        const ul = el('ul');
        for (const r of info.requirements) ul.append(el('li', '', r));
        req.append(ul);
        head.append(req);
      }

      // --- toggles: expected output and tables ---
      const tools = el('div', 'tools');
      const expectedBtn = this.toggle('Toon verwachte uitvoer', 'Verberg verwachte uitvoer');
      const schemaBtn = this.toggle('Toon tabellen', 'Verberg tabellen');
      tools.append(expectedBtn.button, schemaBtn.button);
      expectedBtn.onOpen = () => this.loadExpected(expectedBtn.panel);
      this.els.schemaPanel = schemaBtn.panel;
      schemaBtn.panel.append(el('div', 'hint', 'Tabellen laden…'));

      // --- query + submit ---
      const body = el('div', 'body');
      const editorHost = el('div', 'editor');
      const actions = el('div', 'actions');
      const submit = el('button', 'btn primary', 'Nakijken') as HTMLButtonElement;
      const hint = el('span', 'hint');
      hint.innerHTML = `<kbd>${isMac ? '⌘' : 'Ctrl'}</kbd>+<kbd>Enter</kbd> nakijken`;
      actions.append(submit, hint);
      const feedback = el('div', 'feedback');
      feedback.hidden = true;
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      const result = el('div', 'result');
      result.hidden = true;
      body.append(editorHost, actions, feedback, result);

      card.append(head, tools, expectedBtn.panel, schemaBtn.panel, body);
      Object.assign(this.els, { status, submit, feedback, result });

      this.editor = createEditor(editorHost, this.root, saved?.query ?? '', () => this.submit());
      submit.addEventListener('click', () => this.submit());

      if (saved) this.showFeedback(saved.status, saved.message, saved.approvedAt ?? saved.timestamp);
      this.updateBadge(saved);
    }

    private toggle(openLabel: string, closeLabel: string) {
      const button = el('button', 'link') as HTMLButtonElement;
      const panel = el('div', 'panel');
      panel.hidden = true;
      panel.id = 'p' + Math.random().toString(36).slice(2);
      button.setAttribute('aria-controls', panel.id);
      button.setAttribute('aria-expanded', 'false');
      const label = el('span', '', openLabel);
      button.innerHTML = chevron;
      button.append(label);
      const t = { button, panel, onOpen: null as null | (() => void) };
      let opened = false;
      button.addEventListener('click', () => {
        const open = panel.hidden;
        panel.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
        label.textContent = open ? closeLabel : openLabel;
        if (open && !opened) { opened = true; t.onOpen?.(); }
      });
      return t;
    }

    private async loadExpected(panel: HTMLElement) {
      panel.replaceChildren(el('div', 'hint', 'Verwachte uitvoer berekenen…'));
      try {
        const r = await getClient().request({ type: 'expected', aid: this.aid }, QUERY_TIMEOUT_MS * 2);
        panel.replaceChildren(r.ok ? renderTable(r) : el('div', 'hint', r.message));
      } catch (e) {
        panel.replaceChildren(el('div', 'hint', (e as Error).message));
      }
    }

    private renderSchema(tables: TableInfo[]) {
      this.editor?.setSchema(tables);
      const panel = this.els.schemaPanel;
      if (!panel) return;
      const grid = el('div', 'schema');
      for (const t of tables) {
        const box = el('div', 'tbl');
        box.append(el('b', '', t.name));
        for (const c of t.columns) {
          const row = el('div', 'col' + (c.pk ? ' pk' : ''));
          row.append(el('span', '', c.name), el('span', '', c.type.toLowerCase()));
          if (c.pk) row.title = 'Primaire sleutel';
          box.append(row);
        }
        grid.append(box);
      }
      panel.replaceChildren(grid);
    }

    private setBusy(b: boolean, label?: string) {
      this.busy = b;
      const submit = this.els.submit as HTMLButtonElement;
      submit.disabled = b;
      submit.textContent = b && label ? label : 'Nakijken';
    }

    private async submit() {
      if (this.busy || !this.editor) return;
      const query = this.editor.getValue();
      if (!query.trim()) {
        this.showFeedback(Status.Rejected, 'Je hebt nog geen query ingevuld.');
        return;
      }
      this.setBusy(true, 'Bezig…');
      this.showFeedback(Status.Unprocessed, 'We controleren je query…');
      let verdict: Verdict;
      try {
        verdict = await getClient().request({ type: 'grade', aid: this.aid, query }, QUERY_TIMEOUT_MS);
      } catch (e) {
        verdict = { status: Status.Incorrect, message: (e as Error).message };
      }
      const previous = loadSubmission(this.aid);
      saveSubmission(this.aid, { query, status: verdict.status, message: verdict.message, timestamp: new Date().toISOString() }, previous);
      const stored = loadSubmission(this.aid);
      this.showFeedback(verdict.status, verdict.message, stored?.approvedAt);
      this.showResult(verdict.result, verdict.diff ?? null, 'Resultaat van je query');
      this.updateBadge(stored ?? { query, status: verdict.status, message: '', timestamp: '' });
      this.setBusy(false);
      this.dispatchEvent(new CustomEvent('wd-graded', { bubbles: true, composed: true, detail: { aid: this.aid, status: verdict.status } }));
    }

    private showFeedback(status: Status, message: string, timestamp?: string) {
      const fb = this.els.feedback;
      fb.hidden = false;
      fb.replaceChildren();
      let cls = 'wrong', title = 'Nog niet goed';
      let text = message;
      if (status === Status.Unprocessed) { cls = 'pending'; title = 'Bezig met nakijken'; }
      else if (status === Status.Approved || status === Status.ManuallyApproved) {
        cls = 'correct'; title = 'Goed gedaan!';
        const when = timestamp ? new Date(timestamp).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
        text = when ? `Je hebt deze opdracht gemaakt op ${when}.` : message;
      } else if (status === Status.Rejected) { cls = 'error'; title = 'Niet nagekeken'; }
      else text = message + '\n\nPas je query aan en probeer het opnieuw.';
      fb.className = 'feedback ' + cls;
      fb.append(el('div', 'title', title), el('p', '', text));
    }

    private showResult(r: QueryResult | undefined, diff: Verdict['diff'], label: string) {
      const box = this.els.result;
      if (!r || !r.ok) { box.hidden = true; return; }
      box.hidden = false;
      box.replaceChildren(el('p', 'result-label', label), renderTable(r, diff));
    }

    private updateBadge(saved: StoredSubmission | null) {
      const b = this.els.status;
      const done = !!saved && (!!saved.approvedAt || saved.status === Status.Approved || saved.status === Status.ManuallyApproved);
      b.className = 'badge' + (done ? ' done' : '');
      b.textContent = done ? '✓ Gemaakt' : saved ? 'Nog niet goed' : 'Nog niet gemaakt';
    }
  }

  if (!customElements.get('wd-datab1')) customElements.define('wd-datab1', Datab1);
}
