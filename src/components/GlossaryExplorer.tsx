import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import type { GlossaryEntry } from '../lib/glossary-schema';
import {
  findGlossary,
  glossaryAnchor,
  glossaryLetter,
  groupGlossary,
  indexGlossary,
  searchGlossary,
} from '../lib/glossary-models';
import { url } from '../lib/url';
type Link = { id: string; title: string; href: string };
const pageSize = 40;
export default function GlossaryExplorer({
  entries,
  lessons,
  topics,
}: {
  entries: GlossaryEntry[];
  lessons: Link[];
  topics: Link[];
}) {
  const ref = useIslandReady<HTMLElement>();
  const uid = 'glossary-' + useId().replace(/:/g, '');
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState('all');
  const [letter, setLetter] = useState('all'),
    [limit, setLimit] = useState(pageSize);
  const [selected, setSelected] = useState<string | null>(null),
    [notice, setNotice] = useState('');
  const index = useMemo(() => indexGlossary(entries), [entries]);
  const categories = useMemo(
    () => [...new Map(entries.map((e) => [e.category.id, e.category])).values()],
    [entries],
  );
  const result = useMemo(() => searchGlossary(index, query, category), [index, query, category]);
  const filtered = result.entries.filter(
    (e) => letter === 'all' || glossaryLetter(e.term) === letter,
  );
  const visible = filtered.slice(0, limit);
  const groups = query.trim() ? [{ letter: '', entries: visible }] : groupGlossary(visible);
  useEffect(() => {
    function followHash() {
      let hash: string;
      try {
        hash = decodeURIComponent(location.hash.slice(1));
      } catch {
        return;
      }
      if (!hash.startsWith('term-')) return;
      const found = findGlossary(index, hash);
      if (!found) {
        setNotice('Không tìm thấy liên kết thuật ngữ này. Bạn có thể tìm theo tên hoặc alias.');
        return;
      }
      setQuery('');
      setCategory('all');
      setLetter('all');
      setLimit(Math.max(pageSize, index.findIndex((r) => r.entry.id === found.entry.id) + 1));
      setSelected(found.entry.id);
      setNotice('');
    }
    followHash();
    window.addEventListener('hashchange', followHash);
    return () => window.removeEventListener('hashchange', followHash);
  }, [index]);
  useEffect(() => {
    if (!selected) return;
    const frame = requestAnimationFrame(() => {
      const entry = document.getElementById(glossaryAnchor(selected));
      entry?.focus({ preventScroll: true });
      entry?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [selected]);
  function reset() {
    setQuery('');
    setCategory('all');
    setLetter('all');
    setLimit(pageSize);
    setSelected(null);
    setNotice('');
    searchRef.current?.focus();
  }
  function links(ids: string[], source: Link[]) {
    return ids.map((id) => source.find((l) => l.id === id)).filter((l): l is Link => !!l);
  }
  return (
    <section
      className="glossary-explorer handbook-experiment"
      ref={ref}
      aria-labelledby={uid + '-title'}
    >
      <header className="glossary-header">
        <span className="eyebrow">GLOSSARY EXPLORER</span>
        <h3 id={uid + '-title'}>Tra nghĩa. Xem ví dụ. Kiểm giới hạn.</h3>
        <p>
          Tìm theo thuật ngữ, alias hoặc nội dung Việt–Anh. Mỗi mục có liên kết cố định để mở lại và
          chia sẻ.
        </p>
      </header>
      <div className="glossary-controls">
        <label htmlFor={uid + '-query'}>
          Tìm thuật ngữ
          <input
            id={uid + '-query'}
            ref={searchRef}
            type="search"
            value={query}
            maxLength={240}
            placeholder="Ví dụ: quorum, TTL, do tre, hydration…"
            aria-describedby={uid + '-help'}
            onChange={(e) => {
              setQuery(e.target.value);
              setLetter('all');
              setLimit(pageSize);
              setSelected(null);
            }}
          />
        </label>
        <label htmlFor={uid + '-category'}>
          Nhóm kiến thức
          <select
            id={uid + '-category'}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setLetter('all');
              setLimit(pageSize);
              setSelected(null);
            }}
          >
            <option value="all">Tất cả nhóm</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label.vi} ({result.counts[c.id] || 0})
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={reset}>
          Xóa bộ lọc
        </button>
      </div>
      <p id={uid + '-help'} className="glossary-help">
        Không phân biệt hoa/thường hoặc dấu tiếng Việt. Các từ trong ô tìm kiếm phải cùng xuất hiện
        trong một mục; tên và alias khớp chính xác được ưu tiên.
      </p>
      <nav className="glossary-alphabet" aria-label="Lọc theo chữ cái đầu">
        <button
          type="button"
          aria-pressed={letter === 'all'}
          onClick={() => {
            setLetter('all');
            setLimit(pageSize);
            setSelected(null);
          }}
        >
          A–Z
        </button>
        {result.letters.map((l) => (
          <button
            type="button"
            key={l}
            aria-pressed={letter === l}
            onClick={() => {
              setLetter(l);
              setLimit(pageSize);
              setSelected(null);
            }}
          >
            {l}
          </button>
        ))}
      </nav>
      <p className="glossary-count" role="status">
        <strong>{filtered.length}</strong> <span>mục phù hợp</span> · <span>Đang hiển thị</span>{' '}
        {visible.length} / {filtered.length}
      </p>
      {notice && <p role="status">{notice}</p>}
      {filtered.length === 0 && (
        <div className="glossary-empty">
          <h4>Chưa có kết quả phù hợp</h4>
          <p>
            Thử tên tiếng Anh, từ viết tắt hoặc bỏ bộ lọc nhóm/chữ cái. Không có kết quả không có
            nghĩa khái niệm không tồn tại.
          </p>
          <button type="button" onClick={reset}>
            Tìm lại từ tất cả nhóm
          </button>
        </div>
      )}
      <div className="glossary-results">
        {groups.map((group) => (
          <div key={group.letter} className="glossary-group">
            {group.letter && <h4 className="glossary-letter">{group.letter}</h4>}
            {group.entries.map((e) => (
              <article
                className="glossary-entry"
                key={e.id}
                id={glossaryAnchor(e.id)}
                tabIndex={-1}
                data-selected={selected === e.id}
                aria-labelledby={uid + '-' + e.id}
              >
                <header>
                  <div>
                    <h5 id={uid + '-' + e.id}>{e.term}</h5>
                    <span className="glossary-category">{e.category.label.vi}</span>
                  </div>
                  <a
                    className="glossary-permalink"
                    href={'#' + glossaryAnchor(e.id)}
                    onClick={() => setSelected(e.id)}
                    aria-label={'Permalink: ' + e.term}
                  >
                    #
                  </a>
                </header>
                {e.aliases.length > 0 && (
                  <p className="glossary-aliases">
                    <span>Alias:</span> {e.aliases.join(' · ')}
                  </p>
                )}
                <p className="glossary-definition">{e.definition.vi}</p>
                <details open={selected === e.id}>
                  <summary>Ví dụ, giới hạn và bài học liên quan</summary>
                  <div className="glossary-example">
                    <strong>Ví dụ cụ thể</strong>
                    <p>{e.example.vi}</p>
                  </div>
                  <aside className="glossary-pitfall">
                    <strong>Đừng nhầm</strong>
                    <p>{e.pitfall.vi}</p>
                  </aside>
                  <nav className="glossary-links" aria-label={'Lessons: ' + e.term}>
                    {links(e.relatedLessons, lessons).map((l) => (
                      <a key={l.id} href={url(l.href)}>
                        {l.title} →
                      </a>
                    ))}
                    {links(e.relatedTopics, topics).map((l) => (
                      <a key={'topic-' + l.id} href={url(l.href)}>
                        Notes &amp; Interview · {l.title} →
                      </a>
                    ))}
                  </nav>
                </details>
              </article>
            ))}
          </div>
        ))}
      </div>
      {visible.length < filtered.length && (
        <button
          type="button"
          className="glossary-more"
          onClick={() => setLimit((n) => n + pageSize)}
        >
          Hiển thị thêm {Math.min(pageSize, filtered.length - visible.length)}
        </button>
      )}
      <footer className="glossary-footer">
        <p>
          Định nghĩa ngắn giúp tra cứu; bài học liên quan giải thích sâu hơn về giả định, luồng xử
          lý và trade-off.
        </p>
        <a href={url('/system-design/review/')}>Ôn thuật ngữ trong Daily Review →</a>
      </footer>
    </section>
  );
}
