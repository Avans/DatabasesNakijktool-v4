// SQL editor (CodeMirror 6) with table/column autocompletion for the practice database.
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { sql, MySQL } from '@codemirror/lang-sql';
import { syntaxHighlighting, HighlightStyle, bracketMatching } from '@codemirror/language';
import { autocompletion, closeBrackets, closeBracketsKeymap, closeCompletion, completionKeymap } from '@codemirror/autocomplete';
import { tags as t } from '@lezer/highlight';
import type { TableInfo } from '../protocol.ts';

const highlight = HighlightStyle.define([
  { tag: t.keyword, color: 'var(--wd-code-keyword)', fontWeight: '600' },
  { tag: [t.string, t.special(t.string)], color: 'var(--wd-code-string)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--wd-code-number)' },
  { tag: t.comment, color: 'var(--wd-muted)', fontStyle: 'italic' },
  { tag: [t.operator, t.punctuation], color: 'var(--wd-muted)' },
  { tag: t.typeName, color: 'var(--wd-code-keyword)' }
]);

const theme = EditorView.theme({
  '&': { fontSize: '14px', backgroundColor: 'var(--wd-code-bg)', color: 'var(--wd-text)', borderRadius: '8px' },
  '&.cm-focused': { outline: '2px solid var(--wd-accent)', outlineOffset: '-1px' },
  '.cm-scroller': { fontFamily: 'var(--wd-mono)', lineHeight: '1.6', minHeight: '6.5em' },
  '.cm-content': { padding: '10px 0', caretColor: 'var(--wd-accent)' },
  '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: 'var(--wd-faint)' },
  '.cm-activeLine': { backgroundColor: 'var(--wd-code-active)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--wd-muted)' },
  '.cm-placeholder': { color: 'var(--wd-faint)' },
  '.cm-tooltip': { border: '1px solid var(--wd-border)', backgroundColor: 'var(--wd-surface)', borderRadius: '6px', overflow: 'hidden' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--wd-accent)', color: 'var(--wd-on-accent)' }
});

export interface Editor {
  view: EditorView;
  getValue(): string;
  setValue(v: string): void;
  setSchema(tables: TableInfo[]): void;
}

export function createEditor(parent: HTMLElement, root: ShadowRoot, initial: string, onSubmit: () => void): Editor {
  const lang = new Compartment();
  const sqlLang = (tables: TableInfo[] = []) => sql({
    dialect: MySQL,
    upperCaseKeywords: true,
    schema: Object.fromEntries(tables.map(tb => [tb.name, tb.columns.map(c => c.name)]))
  });

  const state = EditorState.create({
    doc: initial,
    extensions: [
      lineNumbers(),
      history(),
      highlightActiveLine(),
      bracketMatching(),
      closeBrackets(),
      autocompletion({ icons: false }),
      lang.of(sqlLang()),
      syntaxHighlighting(highlight),
      theme,
      EditorView.lineWrapping,
      placeholder('Schrijf hier je SELECT-query…'),
      EditorView.contentAttributes.of({ 'aria-label': 'SQL-query', spellcheck: 'false' }),
      keymap.of([
        { key: 'Mod-Enter', run: v => { closeCompletion(v); onSubmit(); return true; } },
        ...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...completionKeymap
      ])
    ]
  });

  const view = new EditorView({ state, parent, root });

  return {
    view,
    getValue: () => view.state.doc.toString(),
    setValue: v => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } }),
    setSchema: tables => view.dispatch({ effects: lang.reconfigure(sqlLang(tables)) })
  };
}
