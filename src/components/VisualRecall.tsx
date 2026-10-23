import { useId, useMemo, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { selectRecallMaps, type RecallMap } from '../lib/recall-map-models';
import { url } from '../lib/url';
const iconPaths: Record<string, string> = {
  target:
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0 M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0',
  route: 'M5 4h5v5H5z M14 15h5v5h-5z M7 9v7h7 M10 6h7v9',
  inspect: 'M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M7 10h6 M10 7v6',
  flag: 'M5 21V3 M5 3h13l-3 4 3 4H5',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M18 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-4',
  gauge: 'M4 19a10 10 0 1 1 16 0 M12 13l5-5 M4 13h2 M18 13h2 M12 3v3',
  scope: 'M4 4h5 M4 4v5 M20 4h-5 M20 4v5 M4 20h5 M4 20v-5 M20 20h-5 M20 20v-5 M9 12h6',
  chart: 'M4 3v17h17 M8 15v-4 M13 15V7 M18 15v-7',
  compare: 'M8 3v18 M16 3v18 M4 7l4-4 4 4 M12 17l4 4 4-4',
  decision: 'M9 12l2 2 5-5 M20 12a8 8 0 1 1-3-6',
  shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
  check: 'M5 12l4 4L19 6',
  warning: 'M12 3L2 21h20z M12 9v5 M12 17v1',
};
const batchSize = 8;
export default function VisualRecall({
  maps,
  groups,
}: {
  maps: RecallMap[];
  groups: { id: string; title: string }[];
}) {
  const ref = useIslandReady<HTMLElement>(),
    uid = 'visual-' + useId().replace(/:/g, '');
  const [query, setQuery] = useState(''),
    [group, setGroup] = useState('all'),
    [limit, setLimit] = useState(batchSize);
  const [selfTest, setSelfTest] = useState(false),
    [revealed, setRevealed] = useState<Set<string>>(new Set());
  const result = useMemo(() => selectRecallMaps(maps, query, group), [maps, query, group]);
  const visible = result.maps.slice(0, limit);
  function toggle(id: string) {
    setRevealed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  return (
    <section
      className="visual-recall handbook-experiment"
      ref={ref}
      aria-labelledby={uid + '-title'}
    >
      <header>
        <span className="eyebrow">VISUAL RECALL</span>
        <h3 id={uid + '-title'}>Nhìn luồng. Giải thích. Đối chiếu.</h3>
        <p>
          Mỗi thẻ dùng lại bản đồ ghi nhớ của bài học hoặc topic. Bật tự kiểm tra để ẩn nhãn, mô tả
          và takeaways; hãy tự vẽ hoặc giải thích trước khi mở.
        </p>
      </header>
      <div className="visual-controls">
        <label>
          Tìm bản đồ
          <input
            type="search"
            value={query}
            maxLength={240}
            placeholder="Ví dụ: cache, transaction, do tre…"
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(batchSize);
            }}
          />
        </label>
        <label>
          Phần kiến thức
          <select
            value={group}
            onChange={(e) => {
              setGroup(e.target.value);
              setLimit(batchSize);
            }}
          >
            <option value="all">Tất cả bản đồ</option>
            {groups.map((g) => (
              <option value={g.id} key={g.id}>
                {g.title} ({result.counts[g.id] || 0})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="visual-actions">
        <button
          type="button"
          aria-pressed={selfTest}
          onClick={() => {
            setSelfTest((v) => !v);
            setRevealed(new Set());
          }}
        >
          {selfTest ? 'Tắt tự kiểm tra' : 'Bật tự kiểm tra'}
        </button>
        {selfTest && (
          <button type="button" onClick={() => setRevealed(new Set())}>
            Ẩn lại tất cả lời giải
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setQuery('');
            setGroup('all');
            setLimit(batchSize);
          }}
        >
          Xóa tìm kiếm và bộ lọc
        </button>
      </div>
      <p className="visual-count" role="status">
        <strong>{result.maps.length}</strong> <span>bản đồ phù hợp</span> ·{' '}
        <span>Đang hiển thị</span> {visible.length} / {result.maps.length}
      </p>
      {selfTest && (
        <p className="visual-test-note">
          Các biểu tượng và số thứ tự chỉ gợi vị trí. Hãy nêu mục đích từng bước, một invariant và
          một failure case; không có chấm điểm tự động.
        </p>
      )}
      {result.maps.length === 0 && (
        <p className="visual-empty">Không có bản đồ phù hợp. Thử từ khóa khác hoặc bỏ bộ lọc.</p>
      )}
      <div className="visual-map-grid">
        {visible.map((m) => {
          const hidden = selfTest && !revealed.has(m.id),
            contentId = uid + '-' + m.id.replace(':', '-');
          return (
            <article className="visual-map" key={m.id} data-map-id={m.id} data-hidden={hidden}>
              <header>
                <span className="eyebrow">{groups.find((g) => g.id === m.group)?.title}</span>
                <h4>{m.title}</h4>
              </header>
              <ol
                className="visual-map-path"
                aria-label={hidden ? 'Luồng đang ẩn nhãn' : 'Luồng ghi nhớ'}
              >
                {m.steps.map((s, i) => (
                  <li key={i}>
                    <div className="visual-step-icon" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={iconPaths[s.icon] || iconPaths.route} />
                      </svg>
                      <span>{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="visual-step-text">
                      {hidden ? (
                        <span className="visual-step-hidden">Bước {i + 1} · ?</span>
                      ) : (
                        <>
                          <strong>{s.title}</strong>
                          {s.detail && <p>{s.detail}</p>}
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              {!hidden && (
                <div id={contentId} className="visual-map-answer">
                  <p className="visual-map-caption">{m.caption}</p>
                  {m.analogy && (
                    <aside>
                      <strong>Liên tưởng để nhớ</strong>
                      <p>{m.analogy}</p>
                    </aside>
                  )}
                  <ul>
                    {m.takeaways.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              <footer>
                {selfTest && (
                  <button type="button" aria-expanded={!hidden} onClick={() => toggle(m.id)}>
                    {hidden ? 'Mở lời giải' : 'Ẩn lời giải'}
                  </button>
                )}
                <a href={url(m.href)}>Mở bài học →</a>
              </footer>
            </article>
          );
        })}
      </div>
      {visible.length < result.maps.length && (
        <button
          className="visual-more"
          type="button"
          onClick={() => setLimit((n) => n + batchSize)}
        >
          Xem thêm bản đồ
        </button>
      )}
      <footer className="visual-footer">
        <p>
          Tự kiểm tra không ghi điểm hoặc đổi lịch ôn. Mở Daily Review nếu muốn self-grade và lưu
          due dates; mở bài học để đọc đầy đủ assumptions và lời giải.
        </p>
        <a href={url('/system-design/review/')}>Đến Daily Review →</a>
      </footer>
    </section>
  );
}
