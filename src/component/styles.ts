// Styles live inside the shadow root, so the host page (Brightspace) can't break them.
// Host pages can theme the component through the --wd-* custom properties on wd-datab1.
export const styles = /* css */ `
:host {
  --wd-accent: #c8102e;
  --wd-accent-hover: #a50d26;
  --wd-on-accent: #ffffff;
  --wd-text: #1d2129;
  --wd-muted: #5b6372;
  --wd-faint: #9aa1ad;
  --wd-surface: #ffffff;
  --wd-subtle: #f5f6f8;
  --wd-border: #e1e4e9;
  --wd-code-bg: #fafbfc;
  --wd-code-active: rgba(29, 33, 41, 0.035);
  --wd-code-keyword: #8a1f5c;
  --wd-code-string: #1f6f43;
  --wd-code-number: #a35200;
  --wd-ok: #1e7b46;
  --wd-ok-bg: #e9f6ee;
  --wd-warn: #9a5b00;
  --wd-warn-bg: #fff4e0;
  --wd-error: #b42318;
  --wd-error-bg: #fdecea;
  --wd-diff-bg: #ffe0b2;
  --wd-mono: ui-monospace, 'Cascadia Code', 'SF Mono', Menlo, Consolas, monospace;
  --wd-radius: 12px;

  display: block;
  max-width: 860px;
  margin: 0 0 24px;
  color: var(--wd-text);
  font: inherit;
  line-height: 1.5;
}
* { box-sizing: border-box; }

.card {
  background: var(--wd-surface);
  border: 1px solid var(--wd-border);
  border-radius: var(--wd-radius);
  overflow: hidden;
}
.head { padding: 18px 20px 4px; }
.titlebar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
h2 { margin: 0; font-size: 1.15em; font-weight: 650; letter-spacing: -0.01em; }
.badge {
  font-size: 0.75em; font-weight: 600; padding: 2px 9px; border-radius: 999px;
  background: var(--wd-subtle); color: var(--wd-muted); border: 1px solid var(--wd-border);
}
.badge.done { background: var(--wd-ok-bg); color: var(--wd-ok); border-color: transparent; }
.spacer { flex: 1; }
.description { margin: 8px 0 0; white-space: pre-line; }
.requirements { margin: 10px 0 0; padding: 10px 12px; background: var(--wd-subtle); border-radius: 8px; font-size: 0.92em; }
.requirements strong { display: block; margin-bottom: 2px; }
.requirements ul { margin: 0; padding-left: 18px; }

.tools { display: flex; gap: 4px; flex-wrap: wrap; padding: 10px 14px 0; }
.link {
  font: inherit; font-size: 0.88em; font-weight: 550; color: var(--wd-muted);
  background: none; border: none; padding: 5px 8px; border-radius: 6px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
}
.link:hover { background: var(--wd-subtle); color: var(--wd-text); }
.link[aria-expanded='true'] { color: var(--wd-accent); }
.link svg { width: 14px; height: 14px; transition: transform .15s ease; }
.link[aria-expanded='true'] svg { transform: rotate(90deg); }
.panel { margin: 6px 20px 4px; }
.panel[hidden] { display: none; }

.body { padding: 12px 20px 20px; }
.editor { border: 1px solid var(--wd-border); border-radius: 8px; }
.actions { display: flex; align-items: center; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
.btn {
  font: inherit; font-weight: 600; font-size: 0.95em; border-radius: 8px; padding: 8px 16px;
  cursor: pointer; border: 1px solid var(--wd-border); background: var(--wd-surface); color: var(--wd-text);
}
.btn:hover:not([disabled]) { background: var(--wd-subtle); }
.btn.primary { background: var(--wd-accent); border-color: var(--wd-accent); color: var(--wd-on-accent); }
.btn.primary:hover:not([disabled]) { background: var(--wd-accent-hover); }
.btn[disabled] { opacity: .55; cursor: default; }
.btn:focus-visible, .link:focus-visible { outline: 2px solid var(--wd-accent); outline-offset: 2px; }
.hint { color: var(--wd-faint); font-size: 0.82em; }
kbd { font-family: var(--wd-mono); font-size: 0.95em; border: 1px solid var(--wd-border); border-bottom-width: 2px; border-radius: 4px; padding: 0 4px; background: var(--wd-surface); }

.feedback { margin-top: 14px; padding: 12px 14px; border-radius: 8px; border-left: 4px solid; }
.feedback[hidden] { display: none; }
.feedback .title { font-weight: 650; }
.feedback p { margin: 2px 0 0; white-space: pre-line; }
.feedback.correct { background: var(--wd-ok-bg); border-color: var(--wd-ok); }
.feedback.correct .title { color: var(--wd-ok); }
.feedback.wrong { background: var(--wd-warn-bg); border-color: var(--wd-warn); }
.feedback.wrong .title { color: var(--wd-warn); }
.feedback.error { background: var(--wd-error-bg); border-color: var(--wd-error); }
.feedback.error .title { color: var(--wd-error); }
.feedback.pending { background: var(--wd-subtle); border-color: var(--wd-faint); }

.result { margin-top: 14px; }
.result[hidden] { display: none; }
.result-label { font-size: 0.82em; font-weight: 600; color: var(--wd-muted); margin: 0 0 6px; }
.table-wrap { overflow: auto; max-height: 360px; border: 1px solid var(--wd-border); border-radius: 8px; }
table { border-collapse: collapse; width: 100%; font-size: 0.88em; }
th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--wd-border); white-space: nowrap; }
th { position: sticky; top: 0; background: var(--wd-subtle); font-weight: 600; z-index: 1; }
tr:last-child td { border-bottom: none; }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
td.null { color: var(--wd-faint); font-style: italic; }
td.diff { background: var(--wd-diff-bg); }
.count { font-size: 0.8em; color: var(--wd-faint); margin-top: 4px; }

.schema { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
.schema .tbl { border: 1px solid var(--wd-border); border-radius: 8px; padding: 8px 10px; font-size: 0.85em; }
.schema .tbl b { font-family: var(--wd-mono); display: block; margin-bottom: 4px; }
.schema .col { font-family: var(--wd-mono); color: var(--wd-muted); display: flex; justify-content: space-between; gap: 8px; }
.schema .col.pk { color: var(--wd-text); font-weight: 600; }
.schema .col span:last-child { color: var(--wd-faint); font-size: 0.9em; }

.loading { padding: 18px 20px; color: var(--wd-muted); }
.skeleton { height: 12px; border-radius: 6px; background: linear-gradient(90deg, var(--wd-subtle), var(--wd-border), var(--wd-subtle)); background-size: 200% 100%; animation: shimmer 1.2s infinite; margin-top: 8px; }
@keyframes shimmer { to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } .link svg { transition: none; } }
`;
