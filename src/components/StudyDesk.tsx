import { useIslandReady } from '../lib/use-island-ready';
import { useEffect, useState, type ChangeEvent } from 'react';
import { readStudy, saveStudy, validateStudy, type StudyState } from '../lib/study';
import { url } from '../lib/url';
interface Entry {
  key: string;
  title: string;
  topic: string;
  href: string;
}
export default function StudyDesk({
  entries,
  chapters,
}: {
  entries: Entry[];
  chapters: { id: string; title: string; href: string }[];
}) {
  const islandRef = useIslandReady();
  const [state, setState] = useState<StudyState>({
      bookmarks: [],
      known: [],
      review: [],
      last: null,
      session: null,
    }),
    [done, setDone] = useState<string[]>([]),
    [tab, setTab] = useState<'bookmarks' | 'review' | 'known'>('bookmarks'),
    [status, setStatus] = useState('Đang đọc dữ liệu trên trình duyệt…');
  useEffect(() => {
    const refresh = () => setState(readStudy());
    refresh();
    try {
      const d = JSON.parse(localStorage.getItem('it-basic-chapters-v1') || '[]');
      if (Array.isArray(d)) setDone(d.filter((x: unknown) => typeof x === 'string'));
    } catch {}
    setStatus('Dữ liệu được lưu cục bộ trên trình duyệt này.');
    window.addEventListener('study-change', refresh);
    return () => window.removeEventListener('study-change', refresh);
  }, []);
  function exportData() {
    const data = { version: 1, exported: new Date().toISOString(), ...readStudy(), chapters: done };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'it-basic-study.json';
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus('Đã xuất dữ liệu học tập.');
  }
  async function importData(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5e6) throw Error('Tệp quá lớn (tối đa 5MB).');
      const raw = JSON.parse(await file.text());
      if (raw.version !== undefined && raw.version !== 1)
        throw Error('Chưa hỗ trợ phiên bản tệp này.');
      const incoming = validateStudy(raw),
        current = readStudy();
      const merged = {
        ...current,
        bookmarks: [...new Set([...current.bookmarks, ...incoming.bookmarks])],
        known: [...new Set([...current.known, ...incoming.known])],
        review: [...new Set([...current.review, ...incoming.review])],
      };
      merged.known = merged.known.filter((x) => !merged.review.includes(x));
      if (!saveStudy(merged)) throw Error('Không lưu được trong trình duyệt.');
      if (
        Array.isArray(raw.chapters) &&
        raw.chapters.every((x: unknown) => typeof x === 'string')
      ) {
        const next = [...new Set<string>([...done, ...raw.chapters])];
        localStorage.setItem('it-basic-chapters-v1', JSON.stringify(next));
        setDone(next);
      }
      setState(merged);
      setStatus(
        'Đã gộp dữ liệu. Các mục đang có được giữ lại; “Cần ôn lại” được ưu tiên khi có hai đánh giá.',
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Tệp không hợp lệ.');
    }
    e.target.value = '';
  }
  const visible = entries.filter((e) => state[tab].includes(e.key)),
    finished = chapters.filter((c) => done.includes(c.id));
  return (
    <div className="study-desk" ref={islandRef}>
      <div className="stats-strip">
        <div>
          <strong>{state.bookmarks.length}</strong>
          <span>mục đã lưu</span>
        </div>
        <div>
          <strong>{state.known.length}</strong>
          <span>câu đã hiểu</span>
        </div>
        <div>
          <strong>{state.review.length}</strong>
          <span>câu cần ôn</span>
        </div>
        <div>
          <strong>
            {finished.length}/{chapters.length}
          </strong>
          <span>chương hoàn thành</span>
        </div>
      </div>
      <div className="desk-toolbar">
        <button className="secondary" onClick={exportData}>
          Xuất dữ liệu JSON ↓
        </button>
        <label className="button secondary file-input">
          Nhập & gộp dữ liệu
          <input type="file" accept=".json,application/json" onChange={importData} />
        </label>
        <a className="button secondary" href={url('/practice/')}>
          Luyện câu cần ôn →
        </a>
      </div>
      <p role="status" className="muted">
        {status}
      </p>
      <div className="filter-row" role="group" aria-label="Danh sách học tập">
        {(
          [
            ['bookmarks', 'Đã lưu'],
            ['review', 'Cần ôn lại'],
            ['known', 'Đã hiểu'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className="secondary"
            aria-pressed={key === tab}
            onClick={() => setTab(key)}
          >
            {label} ({state[key].length})
          </button>
        ))}
      </div>
      {visible.length ? (
        <ul className="saved-list">
          {visible.map((e) => (
            <li key={e.key}>
              <a href={url(e.href)}>
                <small>{e.topic}</small>
                <strong>{e.title}</strong>
              </a>
              <button
                className="secondary"
                onClick={() => {
                  const s = readStudy();
                  s[tab] = s[tab].filter((k) => k !== e.key);
                  saveStudy(s);
                }}
              >
                Bỏ khỏi danh sách
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <h2>Góc học tập đang chờ bạn.</h2>
          <p>Lưu note, đánh dấu câu cần ôn hoặc nhập tệp dữ liệu từ trang Notes & Interview cũ.</p>
          <a className="button" href={url('/handbook/')}>
            Chọn một topic →
          </a>
        </div>
      )}
      {finished.length > 0 && (
        <section>
          <h2>Các chương đã học</h2>
          <ul>
            {finished.map((c) => (
              <li key={c.id}>
                <a href={url(c.href)}>{c.title}</a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <aside className="callout">
        <strong>Chuyển thiết bị hoặc địa chỉ website</strong>
        <p>
          Xuất JSON ở trang cũ rồi nhập vào đây. LocalStorage được tách theo origin, nên dữ liệu
          trên VPS không tự xuất hiện ở GitHub Pages. Tệp xuất của Notes & Interview cũ cũng được hỗ
          trợ.
        </p>
      </aside>
    </div>
  );
}
