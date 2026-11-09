// Brightspace's HTML editor (TinyMCE) strips tags it doesn't know, like <wd-datab1>.
// So besides the custom tag, two editor-proof notations are turned into components:
//
//   [datab1 21506]                          plain text, survives every editor
//   <div class="wd-datab1" data-aid="21506"></div>   (or class "wd-datab1 aid-21506")
//
// Content that is added later (Brightspace renders some content dynamically) is picked
// up by a MutationObserver.

const SHORTCODE_SOURCE = String.raw`\[\s*datab1[\s:=#]+(\d+)\s*\]`;
const HAS_SHORTCODE = new RegExp(SHORTCODE_SOURCE, 'i');
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'WD-DATAB1']);

function component(aid: string): HTMLElement {
  const el = document.createElement('wd-datab1');
  el.setAttribute('aid', aid);
  return el;
}

function upgradeElements(root: ParentNode) {
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('.wd-datab1, [data-datab1]'))) {
    const aid = el.dataset.aid ?? el.dataset.datab1 ?? /\baid-(\d+)\b/.exec(el.className)?.[1] ?? el.textContent?.trim();
    if (aid && /^\d+$/.test(aid)) el.replaceWith(component(aid));
  }
}

function upgradeShortcodes(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => {
      for (let p = n.parentElement; p; p = p.parentElement) {
        if (SKIP.has(p.tagName) || p.isContentEditable) return NodeFilter.FILTER_REJECT;
      }
      return HAS_SHORTCODE.test(n.nodeValue ?? '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const text = node.nodeValue ?? '';
    const frag = document.createDocumentFragment();
    let last = 0;
    for (const m of text.matchAll(new RegExp(SHORTCODE_SOURCE, 'gi'))) {
      if (m.index! > last) frag.append(text.slice(last, m.index));
      frag.append(component(m[1]));
      last = m.index! + m[0].length;
    }
    if (last < text.length) frag.append(text.slice(last));
    node.replaceWith(frag);
  }
}

function upgrade(root: Node) {
  if (root instanceof Element || root instanceof Document || root instanceof DocumentFragment) upgradeElements(root);
  upgradeShortcodes(root);
}

export function upgradePlaceholders() {
  const start = () => {
    upgrade(document.body);
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; upgrade(document.body); });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
