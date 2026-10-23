import { useEffect, useId, useRef, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  emptyRecall,
  reviewSessionLimit,
  validateRecall,
  nextRecall,
  gradeRecall,
  undoRecall,
  recallPool,
  recallQueue,
  recallForecast,
  type RecallGrade,
  type RecallStore,
} from '../lib/daily-review-models';
import type { ReviewCard } from '../lib/review-deck';
import { readStudy } from '../lib/study';
import { url } from '../lib/url';
type Settings = {
  newLimit: number;
  sessionLimit: number;
  source: string;
  subject: string;
  legacyOnly: boolean;
};
const defaults: Settings = {
    newLimit: 5,
    sessionLimit: 20,
    source: 'all',
    subject: 'all',
    legacyOnly: false,
  },
  storeKey = 'av-lore-daily-review-v1';
const grades: RecallGrade[] = ['again', 'hard', 'good', 'easy'];
const labels: Record<RecallGrade, string> = {
  again: 'Chưa nhớ',
  hard: 'Nhớ khó',
  good: 'Nhớ được',
  easy: 'Nhớ dễ',
};
function settings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') throw Error('INVALID_SETTINGS');
  const s = raw as Settings;
  if (
    !Number.isInteger(s.newLimit) ||
    s.newLimit < 0 ||
    s.newLimit > 50 ||
    !Number.isInteger(s.sessionLimit) ||
    s.sessionLimit < 1 ||
    s.sessionLimit > reviewSessionLimit ||
    !['all', 'topic', 'handbook', 'visual', 'term'].includes(s.source) ||
    typeof s.subject !== 'string' ||
    s.subject.length > 80 ||
    typeof s.legacyOnly !== 'boolean'
  )
    throw Error('INVALID_SETTINGS');
  return {
    newLimit: s.newLimit,
    sessionLimit: s.sessionLimit,
    source: s.source,
    subject: s.subject,
    legacyOnly: s.legacyOnly,
  };
}
const interval = (ms: number) =>
  ms < 3_600_000
    ? Math.round(ms / 60_000) + 'm'
    : ms < 86_400_000
      ? Math.round(ms / 3_600_000) + 'h'
      : Math.round((ms / 86_400_000) * 10) / 10 + 'd';
export default function DailyReview({
  cards,
  subjects,
}: {
  cards: ReviewCard[];
  subjects: { id: string; title: string }[];
}) {
  const ref = useIslandReady<HTMLElement>(),
    id = 'recall-' + useId().replace(/:/g, ''),
    heading = useRef<HTMLHeadingElement>(null),
    importGeneration = useRef(0);
  const [state, setState] = useState<RecallStore>(emptyRecall),
    [prefs, setPrefs] = useState<Settings>(defaults),
    [now, setNow] = useState(0),
    [saving, setSaving] = useState(false),
    [legacy, setLegacy] = useState<string[]>([]),
    [status, setStatus] = useState('Đang đọc lịch ôn trên trình duyệt…'),
    [pending, setPending] = useState<{ state: RecallStore; prefs: Settings; name: string } | null>(
      null,
    ),
    [resetArmed, setResetArmed] = useState(false);
  const [session, setSession] = useState<{ ids: string[]; preview: boolean } | null>(null),
    [position, setPosition] = useState(0),
    [revealed, setRevealed] = useState(false),
    [history, setHistory] = useState<{ position: number; grade: RecallGrade }[]>([]);
  const poolCards = cards.filter(
      (c) =>
        (prefs.source === 'all' || c.source === prefs.source) &&
        (prefs.subject === 'all' || c.subjects.includes(prefs.subject)) &&
        (!prefs.legacyOnly || (!!c.legacyKey && legacy.includes(c.legacyKey))),
    ),
    pool = recallPool(state, poolCards, now, prefs.newLimit),
    forecast = recallForecast(state, poolCards, now),
    maxForecast = Math.max(1, ...forecast),
    card = session ? cards.find((c) => c.id === session.ids[position]) : undefined;
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(storeKey) || 'null');
      if (raw) {
        if (raw.format !== 'av-lore-recall' || raw.version !== 1) throw Error('INVALID_VERSION');
        setState(validateRecall(raw.state));
        setPrefs(settings(raw.settings));
      }
      setSaving(true);
      setStatus('Lịch ôn được lưu riêng trên trình duyệt; dữ liệu đánh giá cũ được giữ nguyên.');
    } catch {
      setStatus(
        'Không đọc được bản lưu; phiên này chưa tự lưu để giữ dữ liệu cũ. Hãy xuất JSON trước khi tải lại.',
      );
    }
    setLegacy(readStudy().review);
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 15000);
    const refreshLegacy = () => setLegacy(readStudy().review);
    const change = (e: StorageEvent) => {
      if (e.key === 'it-basic-notes-interview-v1') refreshLegacy();
      if (e.key === storeKey) {
        setSaving(false);
        setStatus(
          'Lịch ôn đổi ở tab khác; tạm ngừng tự lưu. Xuất JSON nếu cần giữ thay đổi, rồi tải lại.',
        );
      }
    };
    window.addEventListener('storage', change);
    window.addEventListener('study-change', refreshLegacy);
    return () => {
      clearInterval(tick);
      window.removeEventListener('storage', change);
      window.removeEventListener('study-change', refreshLegacy);
    };
  }, []);
  useEffect(() => {
    if (!saving) return;
    try {
      localStorage.setItem(
        storeKey,
        JSON.stringify({ format: 'av-lore-recall', version: 1, state, settings: prefs }),
      );
    } catch {
      setStatus('Không lưu được lịch ôn; hãy xuất JSON để giữ tiến độ.');
    }
  }, [state, prefs, saving]);
  useEffect(() => {
    if (session) heading.current?.focus();
  }, [position, session]);
  const start = (preview: boolean) => {
    const at = Date.now();
    setNow(at);
    const available = preview
      ? [...pool.future, ...pool.fresh].slice(0, prefs.sessionLimit).map((c) => c.id)
      : recallQueue(state, poolCards, at, prefs.newLimit, prefs.sessionLimit);
    setSession({ ids: available, preview });
    setPosition(0);
    setHistory([]);
    setRevealed(false);
  };
  const rate = (g: RecallGrade) => {
    if (!card || !revealed || session?.preview) return;
    const at = Date.now();
    setState((s) => gradeRecall(s, card.id, card.revision, g, at));
    setHistory((h) => [...h, { position, grade: g }]);
    setPosition((p) => p + 1);
    setRevealed(false);
    setNow(at);
  };
  const undo = () => {
    const last = history.at(-1);
    if (!last) return;
    setState(undoRecall);
    setPosition(last.position);
    setHistory((h) => h.slice(0, -1));
    setRevealed(true);
  };
  const end = () => {
    setSession(null);
    setPosition(0);
    setHistory([]);
    setRevealed(false);
    setNow(Date.now());
  };
  const exportData = () => {
    const blob = new Blob(
        [JSON.stringify({ format: 'av-lore-recall', version: 1, state, settings: prefs }, null, 2)],
        { type: 'application/json' },
      ),
      href = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = href;
    a.download = 'av-lore-daily-review.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    setStatus('Đã xuất lịch ôn.');
  };
  const importData = async (file?: File) => {
    if (!file) return;
    const generation = ++importGeneration.current;
    setPending(null);
    try {
      if (file.size > 5e6) throw Error('LIMIT');
      const raw = JSON.parse(await file.text());
      if (raw.format !== 'av-lore-recall' || raw.version !== 1) throw Error('VERSION');
      if (generation !== importGeneration.current) return;
      setPending({
        state: validateRecall(raw.state),
        prefs: settings(raw.settings),
        name: file.name,
      });
      setStatus(
        'Bản nhập đã được kiểm tra. Xem số lượng và xuất bản hiện tại trước khi thay lịch ôn nếu cần.',
      );
    } catch {
      if (generation !== importGeneration.current) return;
      setPending(null);
      setStatus('File lịch ôn không hợp lệ hoặc quá 5 MB; tiến độ hiện tại được giữ nguyên.');
    }
  };
  const applyImport = () => {
    if (!pending) return;
    setState({ ...pending.state, undo: [] });
    setPrefs(pending.prefs);
    setPending(null);
    setSaving(true);
    end();
    setStatus('Đã thay lịch ôn bằng bản nhập; dữ liệu Notes & Interview cũ không đổi.');
  };
  const number = (
    label: string,
    value: number,
    min: number,
    max: number,
    onChange: (v: number) => void,
  ) => (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          if (Number.isInteger(n) && n >= min && n <= max) onChange(n);
        }}
      />
    </label>
  );
  return (
    <section
      ref={ref}
      className="handbook-experiment daily-review"
      aria-labelledby={id}
      onKeyDown={(e) => {
        const t = e.target as HTMLElement;
        if (
          e.metaKey ||
          e.altKey ||
          e.ctrlKey ||
          t.isContentEditable ||
          t.closest('input,textarea,select,button,a')
        )
          return;
        if (e.key === ' ' && card && !revealed) {
          e.preventDefault();
          setRevealed(true);
        } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          rate(grades[Number(e.key) - 1]);
        } else if (e.key.toLowerCase() === 'u') {
          e.preventDefault();
          undo();
        }
      }}
    >
      <span className="eyebrow">DAILY REVIEW / RETRIEVE, CHECK, SPACE</span>
      <h3 id={id}>Tự nhớ trước, xem lời giải sau</h3>
      <p>
        Thẻ lấy từ câu hỏi và sơ đồ hiện có trong website. Lịch là heuristic có quy tắc công khai,
        không dự đoán lúc bạn sắp quên hoặc chứng nhận năng lực. Mốc ngày dùng lịch local của trình
        duyệt; các khoảng ôn dùng elapsed hours/days.
      </p>
      <p className="recall-status" role="status">
        {status}
      </p>
      {!session && (
        <>
          <div className="recall-settings">
            <label>
              Nguồn thẻ
              <select
                value={prefs.source}
                onChange={(e) => setPrefs((p) => ({ ...p, source: e.target.value }))}
              >
                <option value="all">Tất cả nguồn thẻ</option>
                <option value="topic">Notes & Interview</option>
                <option value="handbook">Handbook questions</option>
                <option value="visual">Visual recall</option>
                {cards.some((c) => c.source === 'term') && (
                  <option value="term">Glossary terms</option>
                )}
              </select>
            </label>
            <label>
              Topic liên quan
              <select
                value={prefs.subject}
                onChange={(e) => setPrefs((p) => ({ ...p, subject: e.target.value }))}
              >
                <option value="all">Tất cả topics</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            {number('Thẻ mới tối đa mỗi ngày (toàn deck)', prefs.newLimit, 0, 50, (n) =>
              setPrefs((p) => ({ ...p, newLimit: n })),
            )}
            {number('Thẻ tối đa trong một phiên', prefs.sessionLimit, 1, reviewSessionLimit, (n) =>
              setPrefs((p) => ({ ...p, sessionLimit: n })),
            )}
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={prefs.legacyOnly}
              onChange={(e) => setPrefs((p) => ({ ...p, legacyOnly: e.target.checked }))}
            />
            Chỉ câu được đánh dấu cần ôn trong Notes & Interview
          </label>
          <dl className="worksheet-results">
            <div>
              <dt>Thẻ trong bộ lọc</dt>
              <dd>{poolCards.length}</dd>
            </div>
            <div>
              <dt>Đến hạn trong bộ lọc</dt>
              <dd>{pool.due.length}</dd>
            </div>
            <div>
              <dt>Thẻ mới có thể thêm</dt>
              <dd>{pool.newAvailable}</dd>
            </div>
            <div>
              <dt>Thẻ đã lên lịch về sau</dt>
              <dd>{pool.future.length}</dd>
            </div>
            <div>
              <dt>Thẻ mới hôm nay · toàn deck</dt>
              <dd>{pool.newTodayGlobal}</dd>
            </div>
            <div>
              <dt>Lượt chấm hôm nay · toàn deck</dt>
              <dd>{pool.reviewsTodayGlobal}</dd>
            </div>
          </dl>
          <div className="recall-actions">
            <button
              type="button"
              disabled={!now || (!pool.due.length && !pool.newAvailable)}
              onClick={() => start(false)}
            >
              Bắt đầu ôn đến hạn + thẻ mới
            </button>
            <button
              type="button"
              disabled={!pool.future.length && !pool.fresh.length}
              onClick={() => start(true)}
            >
              Xem trước · không đổi lịch
            </button>
            <button type="button" onClick={exportData}>
              Export JSON
            </button>
            <label>
              Import JSON
              <input
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  void importData(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <figure className="recall-forecast">
            <figcaption>Thẻ đã lên lịch trong 7 khoảng 24 giờ tới · theo bộ lọc</figcaption>
            {forecast.map((n, i) => (
              <div key={i}>
                <span>{i === 0 ? 'Due / 0–24h' : `${i}–${i + 1}d`}</span>
                <div>
                  <i style={{ width: (n / maxForecast) * 100 + '%' }} />
                </div>
                <strong>{n}</strong>
              </div>
            ))}
          </figure>
          <p className="worksheet-footnote">
            Cột đầu gồm cả thẻ quá hạn; forecast không tính thẻ mới chưa học hoặc đoán kết quả chấm
            tương lai. Đến hạn được ưu tiên trước thẻ mới. Giới hạn thẻ mới là toàn deck để đổi
            filter không vô tình tăng lượng học mới.
          </p>
          {pending && (
            <aside className="recall-import-preview">
              <h4>Kiểm tra bản nhập trước khi áp dụng</h4>
              <p>
                <strong>{pending.name}</strong>
              </p>
              <p>
                {Object.keys(pending.state.cards).length} thẻ đã lên lịch ·{' '}
                {Object.keys(pending.state.days).length} ngày học
              </p>
              <p>
                Áp dụng sẽ thay riêng lịch ôn này và bỏ undo history của bản nhập. Export bản hiện
                tại nếu muốn giữ; không gộp counters từ hai thiết bị bằng cách cộng mù.
              </p>
              <button type="button" onClick={applyImport}>
                Áp dụng bản nhập
              </button>
              <button type="button" onClick={() => setPending(null)}>
                Hủy bản nhập
              </button>
            </aside>
          )}
          <div className="recall-reset">
            <button
              type="button"
              data-armed={resetArmed}
              onClick={() => {
                if (!resetArmed) {
                  setResetArmed(true);
                  return;
                }
                setState(emptyRecall());
                setSaving(true);
                setResetArmed(false);
                setStatus('Đã đặt lại lịch ôn riêng; dữ liệu học tập cũ được giữ nguyên.');
              }}
            >
              Đặt lại lịch ôn · bấm hai lần
            </button>
          </div>
        </>
      )}
      {session && (
        <div className="recall-session">
          <div className="recall-session-bar">
            <strong>
              {Math.min(position + 1, session.ids.length)} / {session.ids.length}
            </strong>
            <button type="button" disabled={!history.length} onClick={undo}>
              Undo · U
            </button>
            <button type="button" onClick={end}>
              Kết thúc phiên
            </button>
          </div>
          {session.preview && (
            <p className="recall-preview">
              Chế độ xem trước: không ghi tự đánh giá và không đổi ngày đến hạn.
            </p>
          )}
          {card ? (
            <article className="recall-card" key={card.id + '-' + position}>
              <span className="eyebrow">
                {card.source} · {card.title}
              </span>
              <h4 ref={heading} tabIndex={-1}>
                {card.question}
              </h4>
              {card.flow && (
                <p>Thử vẽ lại luồng chính và nêu failure boundary trước khi mở sơ đồ.</p>
              )}
              {!revealed ? (
                <button type="button" className="recall-reveal" onClick={() => setRevealed(true)}>
                  Xem lời giải · Space
                </button>
              ) : (
                <div className="recall-answer">
                  {card.flow && (
                    <figure className="recall-flow">
                      <figcaption>{card.flow.title.vi}</figcaption>
                      <ol>
                        {card.flow.steps.map((s, i) => (
                          <li key={i}>
                            <span>{i + 1}</span>
                            <div>
                              <strong>{s.title.vi}</strong>
                              <p>{s.detail.vi}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                      <p>{card.flow.caption.vi}</p>
                    </figure>
                  )}
                  {card.answer.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                  {card.followUp && (
                    <aside className="recall-followup">
                      <strong>Đào sâu thêm</strong>
                      <p>{card.followUp}</p>
                    </aside>
                  )}
                  <a href={url(card.href)}>Mở bài học liên quan →</a>
                  {session.preview ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPosition((p) => p + 1);
                        setRevealed(false);
                      }}
                    >
                      Thẻ tiếp theo · không đổi lịch
                    </button>
                  ) : (
                    <div
                      className="recall-grades"
                      role="group"
                      aria-label="Tự đánh giá khả năng nhớ"
                    >
                      <p>
                        Chọn theo khả năng tự giải thích trước khi xem; đây không phải điểm đúng/sai
                        tự động.
                      </p>
                      {grades.map((g, i) => (
                        <button key={g} type="button" data-grade={g} onClick={() => rate(g)}>
                          <strong>{labels[g]}</strong>
                          <span>
                            {interval(
                              nextRecall(state.cards[card.id], card.revision, g, now).due - now,
                            )}
                          </span>
                          <kbd>{i + 1}</kbd>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!session.preview && (
                <button
                  type="button"
                  className="recall-skip"
                  onClick={() => {
                    setPosition((p) => p + 1);
                    setRevealed(false);
                  }}
                >
                  Bỏ qua · không chấm
                </button>
              )}
            </article>
          ) : (
            <div className="recall-summary">
              <h4 ref={heading} tabIndex={-1}>
                Đã đi hết bộ thẻ của phiên này
              </h4>
              <p>
                {history.length} lượt tự chấm · {session.ids.length} thẻ đã đi qua
              </p>
              <ul>
                {grades.map((g) => (
                  <li key={g}>
                    {labels[g]} · {history.filter((h) => h.grade === g).length}
                  </li>
                ))}
              </ul>
              <p>
                Thẻ Chưa nhớ được lên lịch sau 10 phút; không ép lặp ngay như thể thời gian đã trôi
                qua. Quay lại dashboard để xem due state mới.
              </p>
              <button type="button" onClick={end}>
                Về lịch ôn
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
