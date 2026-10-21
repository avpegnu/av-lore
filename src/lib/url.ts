export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export function url(path = '/') {
  const route = path.startsWith('/') ? path : '/' + path;
  const english = typeof document !== 'undefined' && document.documentElement.lang === 'en';
  const asset = /\.[a-z0-9]+(?:[?#]|$)/i.test(route) && !route.startsWith('/pagefind/');
  return (
    base + (english && !route.startsWith('/en/') && route !== '/en' && !asset ? '/en' : '') + route
  );
}
