import { base } from './url';
import { createTranslator, type Dictionary } from './translate';
/** Local dictionaries only: no user text or learning state is sent to a translation service. */
export function initLanguage() {
  const locale = document.documentElement.lang === 'en' ? 'en' : 'vi';
  const menu = document.querySelector<HTMLDetailsElement>('#language-menu');
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-language]')];
  const relative = location.pathname.slice(base.length).replace(/^\/en(?=\/|$)/, '') || '/';
  for (const link of links) {
    link.href =
      base +
      (link.dataset.language === 'en' ? '/en' : '') +
      relative +
      location.search +
      location.hash;
    link.addEventListener('click', () => {
      link.href =
        base +
        (link.dataset.language === 'en' ? '/en' : '') +
        relative +
        location.search +
        location.hash;
      try {
        localStorage.setItem('it-basic-language', link.dataset.language!);
      } catch {}
    });
  }
  menu?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      menu.open = false;
      menu.querySelector<HTMLElement>('summary')?.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (menu?.open && !menu.contains(e.target as Node)) menu.open = false;
  });
  window.addEventListener('hashchange', () => {
    for (const link of links) link.hash = location.hash;
  });
  if (locale !== 'en') return;
  fetch(base + '/locales/en-runtime.json?v=' + document.documentElement.dataset.languageVersion)
    .then((r) => {
      if (!r.ok) throw Error('English dictionary unavailable');
      return r.json() as Promise<Dictionary>;
    })
    .then((dictionary) => {
      const t = createTranslator(dictionary);
      const excluded = 'pre,code,script,style,kbd,samp,textarea,[contenteditable],[translate="no"]';
      const inPendingIsland = (el: Element) => {
        const island = el.closest('astro-island');
        return !!island && !island.hasAttribute('data-ui-ready');
      };
      function translateText(node: Text) {
        const parent = node.parentElement;
        if (!parent || parent.closest(excluded) || inPendingIsland(parent)) return;
        const next = t(node.data);
        if (next !== node.data) node.data = next;
      }
      function translateElement(el: Element) {
        if (el.closest(excluded) || inPendingIsland(el)) return;
        for (const attr of ['aria-label', 'placeholder', 'title', 'alt']) {
          const value = el.getAttribute(attr);
          if (value) {
            const next = t(value);
            if (next !== value) el.setAttribute(attr, next);
          }
        }
      }
      function visit(node: Node) {
        if (node.nodeType === Node.TEXT_NODE) {
          translateText(node as Text);
          return;
        }
        if (!(node instanceof Element)) return;
        if (node.closest(excluded) || inPendingIsland(node)) return;
        translateElement(node);
        const walker = document.createTreeWalker(
          node,
          NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        );
        let child: Node | null;
        while ((child = walker.nextNode())) {
          if (child.nodeType === Node.TEXT_NODE) translateText(child as Text);
          else translateElement(child as Element);
        }
      }
      const observer = new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === 'characterData') translateText(record.target as Text);
          else if (record.type === 'attributes') translateElement(record.target as Element);
          else for (const node of record.addedNodes) visit(node);
        }
      });
      visit(document.body);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['aria-label', 'placeholder', 'title', 'alt'],
      });
      for (const island of document.querySelectorAll('astro-island'))
        island.addEventListener('it-basic:island-ready', () => visit(island));
      // Existing canvas lessons draw labels rather than DOM text.
      if (typeof CanvasRenderingContext2D !== 'undefined') {
        const original = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
          const value = t(String(text));
          return maxWidth === undefined
            ? original.call(this, value, x, y)
            : original.call(this, value, x, y, maxWidth);
        };
        for (const control of document.querySelectorAll(
          '.legacy-prose .interactive input,.legacy-prose .interactive select',
        ))
          control.dispatchEvent(new Event('input', { bubbles: true }));
      }
      document.documentElement.dataset.languageReady = 'true';
    })
    .catch(() => {
      const status = document.querySelector('#language-status');
      if (status) {
        status.classList.remove('sr-only');
        status.textContent =
          'Could not load interactive translations. Reload this page to try again.';
      }
      document.documentElement.dataset.languageReady = 'true';
    });
}
