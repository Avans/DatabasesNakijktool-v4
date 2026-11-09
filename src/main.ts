// Entry of datab1-component.js: the one script a Brightspace page loads.
//
//   <wd-datab1 aid="21506"></wd-datab1>
//   <script src="https://<host>/datab1-component.js"></script>
//
// Data and the SQLite WebAssembly file are loaded from the same place as this script,
// unless window.NAKIJK_BASE_URL says otherwise.
import { EngineClient } from './client.ts';
import { defineDatab1 } from './component/datab1.ts';

declare global {
  interface Window { NAKIJK_BASE_URL?: string }
}

const base = (() => {
  if (window.NAKIJK_BASE_URL) return window.NAKIJK_BASE_URL.replace(/\/?$/, '/');
  const src = (document.currentScript as HTMLScriptElement | null)?.src;
  return src ? new URL('.', src).href : new URL('/', location.href).href;
})();

let client: EngineClient | null = null;
defineDatab1(() => (client ??= new EngineClient(base)));
