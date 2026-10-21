import { useIslandReady } from '../lib/use-island-ready';
import { useEffect, useRef, useState } from 'react';
import { url } from '../lib/url';
interface Result {
  url: string;
  title: string;
  excerpt: string;
}
interface Pagefind {
  options: (options: { baseUrl: string }) => Promise<void>;
  search: (q: string) => Promise<{
    results: { data: () => Promise<{ url: string; meta: { title?: string }; excerpt: string }> }[];
  }>;
}
export default function Search() {
  const islandRef = useIslandReady();
  const [query, setQuery] = useState(''),
    [results, setResults] = useState<Result[]>([]),
    [status, setStatus] = useState('Nhập từ khóa để tìm trong bài học, Notes và case study.'),
    [busy, setBusy] = useState(false),
    [limit, setLimit] = useState(20);
  const engine = useRef<Pagefind | null>(null),
    sequence = useRef(0);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQuery(params.get('q') || '');
  }, []);
  useEffect(() => {
    const id = ++sequence.current;
    if (!query.trim()) {
      setResults([]);
      setBusy(false);
      setStatus('Nhập từ khóa để tìm trong bài học, Notes và case study.');
      return;
    }
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        if (!engine.current) {
          const moduleURL = url('/pagefind/pagefind.js');
          engine.current = (await import(/* @vite-ignore */ moduleURL)) as Pagefind;
          await engine.current.options({ baseUrl: url('/') });
        }
        const found = await engine.current.search(query);
        const data = await Promise.all(found.results.slice(0, limit).map((r) => r.data()));
        if (sequence.current !== id) return;
        setResults(
          data.map((d) => ({
            url: d.url,
            title: d.meta.title || 'AV Lore',
            excerpt: d.excerpt.replace(/<[^>]*>/g, ''),
          })),
        );
        setStatus(
          `${found.results.length} trang phù hợp${found.results.length > limit ? `; đang hiển thị ${limit}` : ''}.`,
        );
        const params = new URLSearchParams();
        params.set('q', query);
        history.replaceState(null, '', `${location.pathname}?${params}`);
      } catch {
        if (sequence.current === id)
          setStatus(
            'Chưa tải được chỉ mục. Thử tải lại trang; chỉ mục tìm kiếm được tạo khi build website.',
          );
      } finally {
        if (sequence.current === id) setBusy(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [query, limit]);
  return (
    <div className="search-panel" ref={islandRef}>
      <label className="input-field search-input">
        Từ khóa
        <input
          autoFocus
          type="search"
          value={query}
          placeholder="Ví dụ: transaction, closure, cache, Kubernetes…"
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(20);
          }}
        />
      </label>
      <p role="status" className="muted">
        {busy ? 'Đang tìm…' : status}
      </p>
      <ul className="search-results">
        {results.map((r) => (
          <li key={r.url}>
            <a href={r.url}>
              <h2>{r.title.replace(/ · AV Lore$/, '')}</h2>
              <p>{r.excerpt}</p>
              <small>Đọc nội dung →</small>
            </a>
          </li>
        ))}
      </ul>
      {results.length === limit && (
        <button className="secondary" onClick={() => setLimit((n) => n + 20)}>
          Xem thêm kết quả
        </button>
      )}
    </div>
  );
}
