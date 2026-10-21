import { useEffect, useRef } from 'react';
/** hydrateRoot returns before React's hydration commit; translate only after this effect. */
export function useIslandReady<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const island = ref.current?.closest('astro-island');
    if (island) {
      island.setAttribute('data-ui-ready', 'true');
      island.dispatchEvent(new CustomEvent('av-lore:island-ready', { bubbles: true }));
    }
  }, []);
  return ref;
}
