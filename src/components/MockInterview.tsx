import { useEffect, useId, useRef, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  archiveMock,
  emptyMock,
  mockDimensions,
  mockHistoryLimit,
  mockPhaseAt,
  mockPhaseBounds,
  mockPhaseIds,
  mockReviewStates,
  nextMockCurve,
  pausePractice,
  practiceElapsed,
  resumePractice,
  startMock,
  validateMock,
  type MockConfig,
  type MockDimension,
  type MockPhaseId,
  type MockSession,
  type MockStore,
  type PracticeClock,
} from '../lib/mock-interview-models';
import type { RecallMap } from '../lib/recall-map-models';
import { url } from '../lib/url';
const storeKey = 'av-lore-mock-interview-v1';
const dimensionLabels: Record<MockDimension, string> = {
  scope: 'Scope và requirements',
  numbers: 'Số liệu và đơn vị',
  design: 'Luồng xử lý và dữ liệu',
  depth: 'Chiều sâu và invariants',
  tradeoffs: 'Alternatives và trade-offs',
  operations: 'Failure và vận hành',
  communication: 'Giao tiếp và quản lý thời gian',
};
const reviewLabels = {
  unreviewed: 'Chưa tự nhận xét',
  missing: 'Chưa thể hiện',
  partial: 'Đã thử, còn thiếu',
  evidence: 'Có ví dụ hoặc evidence',
};
const difficultyLabels = { intro: 'Khởi động', core: 'Cốt lõi', advanced: 'Đào sâu' };
const fmt = (ms: number) => {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
};
export default function MockInterview({
  config,
  references,
}: {
  config: MockConfig;
  references: RecallMap[];
}) {
  const ref = useIslandReady<HTMLElement>(),
    uid = 'mock-' + useId().replace(/:/g, ''),
    written = useRef<string | null>(null),
    generation = useRef(0);
  const [store, setStore] = useState<MockStore>(emptyMock),
    [clock, setClock] = useState<PracticeClock>({ elapsedMs: 0, anchor: null }),
    [now, setNow] = useState(0),
    [saving, setSaving] = useState(false);
  const [view, setView] = useState<'setup' | 'run' | 'review'>('setup'),
    [selected, setSelected] = useState(config.prompts[0].id),
    [difficulty, setDifficulty] = useState('all'),
    [minutes, setMinutes] = useState<30 | 45 | 60>(45),
    [notePhase, setNotePhase] = useState<MockPhaseId>('scope'),
    [showReference, setShowReference] = useState(false);
  const [english, setEnglish] = useState(false);
  const localized = (p: { vi: string; en: string } | undefined) =>
    p ? (english ? p.en : p.vi) : '';
  const [status, setStatus] = useState('Đang đọc phiên luyện trên trình duyệt…'),
    [pending, setPending] = useState<{ data: MockStore; name: string } | null>(null);
  const current = store.current,
    budget = (current?.durationMinutes || 45) * 60000,
    elapsed = practiceElapsed(clock, now, budget),
    phase = current ? mockPhaseAt(elapsed, current.durationMinutes) : null;
  const choices = config.prompts.filter((p) => difficulty === 'all' || p.difficulty === difficulty),
    reference = current
      ? references.find(
          (r) =>
            r.id ===
            (current.prompt.lessonId
              ? 'handbook:' + current.prompt.lessonId
              : 'topic:' + current.prompt.topicId),
        )
      : undefined;
  const budgetRef = useRef(budget);
  budgetRef.current = budget;
  function apply(data: MockStore) {
    setStore(data);
    setClock({ elapsedMs: data.current?.elapsedMs || 0, anchor: null });
    setNow(performance.now());
    setView(data.current ? (data.current.mode === 'review' ? 'review' : 'run') : 'setup');
    setShowReference(false);
    setNotePhase('scope');
  }
  useEffect(() => {
    setEnglish(document.documentElement.lang === 'en');
    try {
      const raw = localStorage.getItem(storeKey);
      written.current = raw;
      if (raw) {
        apply(validateMock(JSON.parse(raw)));
        setStatus('Đã khôi phục checkpoint; đồng hồ đang tạm dừng.');
      } else setStatus('Chọn đề và bấm Bắt đầu khi đã sẵn sàng.');
      setSaving(true);
    } catch {
      setStatus(
        'Không đọc được dữ liệu lưu. Đang giữ bản cũ và tắt tự lưu; bạn vẫn có thể luyện và xuất bản nháp.',
      );
    }
    function external(e: StorageEvent) {
      if ((e.key === storeKey || e.key === null) && e.newValue !== written.current) {
        setSaving(false);
        setClock((c) => pausePractice(c, performance.now(), budgetRef.current));
        setStatus(
          'Dữ liệu Mock đã đổi ở tab khác. Tự lưu đã dừng; xuất bản nháp trước khi tải lại hoặc nhập bản đã kiểm tra.',
        );
      }
    }
    window.addEventListener('storage', external);
    return () => window.removeEventListener('storage', external);
  }, []);
  useEffect(() => {
    if (clock.anchor === null) return;
    const timer = window.setInterval(() => setNow(performance.now()), 500);
    return () => clearInterval(timer);
  }, [clock.anchor]);
  useEffect(() => {
    if (clock.anchor !== null && elapsed >= budget) {
      setClock({ elapsedMs: budget, anchor: null });
      setStatus('Đã hết khung thời gian. Bạn có thể hoàn tất ghi chú rồi mở phần tự nhận xét.');
    }
  }, [elapsed, budget, clock.anchor]);
  function snapshot(): MockStore {
    return {
      ...store,
      current: current
        ? { ...current, elapsedMs: practiceElapsed(clock, performance.now(), budget) }
        : null,
    };
  }
  const live = useRef({ store, clock, budget, saving });
  live.current = { store, clock, budget, saving };
  function writeLatest() {
    const value = live.current;
    if (!value.saving) return;
    try {
      if (localStorage.getItem(storeKey) !== written.current) {
        setSaving(false);
        setClock((c) => pausePractice(c, performance.now(), value.budget));
        setStatus(
          'Dữ liệu Mock đã đổi ở tab khác. Tự lưu đã dừng; xuất bản nháp trước khi tải lại hoặc nhập bản đã kiểm tra.',
        );
        return;
      }
      const snapshot = {
        ...value.store,
        current: value.store.current
          ? {
              ...value.store.current,
              elapsedMs: practiceElapsed(value.clock, performance.now(), value.budget),
            }
          : null,
      };
      const serialized = JSON.stringify(snapshot);
      if (serialized !== written.current) {
        localStorage.setItem(storeKey, serialized);
        written.current = serialized;
      }
    } catch {
      setSaving(false);
      setClock((c) => pausePractice(c, performance.now(), value.budget));
      setStatus('Không lưu được dữ liệu. Bản lưu cũ được giữ; hãy xuất bản nháp đang mở.');
    }
  }
  useEffect(() => {
    if (!saving) return;
    const pending = window.setTimeout(writeLatest, 350);
    return () => clearTimeout(pending);
  }, [store, clock, saving]);
  useEffect(() => {
    if (!saving) return;
    const checkpoint = window.setInterval(writeLatest, 5000);
    function hidden() {
      if (document.visibilityState === 'hidden') writeLatest();
    }
    window.addEventListener('pagehide', writeLatest);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      clearInterval(checkpoint);
      window.removeEventListener('pagehide', writeLatest);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [saving]);

  function updateCurrent(change: (s: MockSession) => MockSession) {
    setStore((s) => ({ ...s, current: s.current ? change(s.current) : null }));
  }
  function start() {
    const prompt = config.prompts.find((p) => p.id === selected);
    if (!prompt) return;
    const next = startMock(snapshot(), prompt, minutes, crypto.randomUUID(), Date.now());
    setStore(next);
    const time = performance.now();
    setNow(time);
    setClock(resumePractice({ elapsedMs: 0, anchor: null }, time, minutes * 60000));
    setView('run');
    setNotePhase('scope');
    setShowReference(false);
    setStatus('Phiên đã bắt đầu. Nói thành tiếng và giữ assumptions rõ ràng.');
  }
  function pauseResume() {
    const time = performance.now();
    setNow(time);
    setClock((c) =>
      c.anchor === null ? resumePractice(c, time, budget) : pausePractice(c, time, budget),
    );
  }
  function finish() {
    if (!current) return;
    const end = pausePractice(clock, performance.now(), budget);
    setClock(end);
    updateCurrent((s) => ({
      ...s,
      elapsedMs: end.elapsedMs,
      mode: 'review',
      endedAt: Math.max(Date.now(), s.startedAt),
    }));
    setView('review');
    setStatus('Phiên đã kết thúc. Tự nhận xét bằng ví dụ; đây không phải chấm điểm tuyển dụng.');
  }
  function setup() {
    const data = snapshot();
    apply(data);
    setView('setup');
    setStatus('Phiên hiện tại được tạm dừng. Bắt đầu đề mới sẽ đưa phiên này vào lịch sử.');
  }
  function download() {
    const data = validateMock(snapshot()),
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      href = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = href;
    a.download = 'av-lore-mock-interview.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    setStatus('Đã xuất checkpoint và lịch sử Mock. File chứa cả ghi chú bạn đã nhập.');
  }
  async function importFile(file: File | undefined) {
    const ticket = ++generation.current;
    setPending(null);
    if (!file) return;
    if (file.size > 5_000_000) {
      setStatus('File quá lớn; giới hạn 5 MB. Dữ liệu hiện tại được giữ.');
      return;
    }
    try {
      const data = validateMock(JSON.parse(await file.text()));
      if (ticket !== generation.current) return;
      setPending({ data, name: file.name });
      setStatus('File hợp lệ; xem nội dung sẽ thay thế trước khi áp dụng.');
    } catch {
      if (ticket === generation.current)
        setStatus('File không hợp lệ. Dữ liệu hiện tại được giữ nguyên.');
    }
  }
  function acceptImport() {
    if (!pending) return;
    apply(pending.data);
    setPending(null);
    setSaving(true);
    setStatus('Đã áp dụng bản nhập cho Mock. Các ratings và lịch ôn khác được giữ nguyên.');
  }
  function saveReview() {
    if (!current) return;
    setStore(archiveMock(snapshot(), { ...current, elapsedMs: elapsed }));
    setStatus('Đã lưu phiên vào lịch sử; lưu lại cùng phiên sẽ cập nhật nội dung.');
  }
  return (
    <section
      className="mock-interview handbook-experiment"
      ref={ref}
      aria-labelledby={uid + '-title'}
    >
      <header>
        <span className="eyebrow">MOCK INTERVIEW</span>
        <h3 id={uid + '-title'}>Luyện một phiên. Giữ evidence. Chọn bước cải thiện.</h3>
        <p>
          Đề do bạn tự chốt scope; coach chỉ gợi nhịp. Không có AI chấm bài, verdict Senior/Staff
          hoặc phần trăm sẵn sàng.
        </p>
      </header>
      <p className="mock-status" role="status">
        {status}
      </p>
      <p className="mock-save-state">
        {saving ? 'Tự lưu local đang bật.' : 'Tự lưu đang tắt; xuất file để giữ bản nháp.'}
      </p>
      {view === 'setup' && (
        <div className="mock-setup">
          {current && (
            <aside className="mock-resume">
              <strong>{localized(current.prompt.title)}</strong>
              <p>
                <span>Checkpoint hiện tại:</span> {fmt(current.elapsedMs)} /{' '}
                {current.durationMinutes}:00
              </p>
              <button type="button" onClick={() => apply(store)}>
                Mở lại phiên hiện tại
              </button>
            </aside>
          )}
          <div className="mock-controls">
            <label>
              Mức luyện tập
              <select
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(e.target.value);
                  const first = config.prompts.find(
                    (p) => e.target.value === 'all' || p.difficulty === e.target.value,
                  );
                  if (first) setSelected(first.id);
                }}
              >
                <option value="all">Tất cả mức luyện</option>
                {Object.entries(difficultyLabels).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Khung thời gian
              <select value={minutes} onChange={(e) => setMinutes(+e.target.value as 30 | 45 | 60)}>
                {[30, 45, 60].map((m) => (
                  <option value={m} key={m}>
                    {m} min
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mock-prompt-picker">
            Đề luyện
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {choices.map((p) => (
                <option key={p.id} value={p.id}>
                  {localized(p.title)}
                </option>
              ))}
            </select>
          </label>
          <p className="mock-task">
            {localized(config.prompts.find((p) => p.id === selected)?.prompt)}
          </p>
          <div className="mock-actions">
            <button
              type="button"
              onClick={() =>
                choices.length &&
                setSelected(choices[Math.floor(Math.random() * choices.length)].id)
              }
            >
              Bốc một đề trong bộ lọc
            </button>
            <button type="button" onClick={start}>
              Bắt đầu phiên luyện
            </button>
          </div>
          <p className="mock-help">
            Chọn đề chưa chạy đồng hồ. Khi bắt đầu đề mới, phiên đang mở được đưa vào lịch sử; giữ
            tối đa 20 phiên gần nhất.
          </p>
        </div>
      )}
      {view === 'run' && current && phase && (
        <div className="mock-run">
          <div className="mock-session-head">
            <div>
              <span className="eyebrow">{difficultyLabels[current.prompt.difficulty]}</span>
              <h4>{localized(current.prompt.title)}</h4>
            </div>
            <div className="mock-clock">
              <span role="timer" aria-label="Thời gian còn lại">
                {fmt(budget - elapsed)}
              </span>
              <button type="button" onClick={pauseResume} disabled={elapsed >= budget}>
                {clock.anchor === null ? 'Tiếp tục đồng hồ' : 'Tạm dừng đồng hồ'}
              </button>
            </div>
          </div>
          <p className="mock-task">{localized(current.prompt.prompt)}</p>
          <p className="mock-clock-policy">
            Khôi phục luôn tạm dừng tại checkpoint. Thời gian máy ngủ có thể khác theo
            browser/platform. Chọn pha ghi chú không thay đổi thời gian.
          </p>
          <div className="mock-phase-summary" aria-live="polite">
            <strong>Nhịp hiện tại:</strong>{' '}
            <span>{config.coach.find((p) => p.id === phase.id)?.title.vi}</span>
          </div>
          <nav className="mock-phases" aria-label="Chọn vùng ghi chú">
            {mockPhaseBounds(current.durationMinutes).map((p) => (
              <button
                type="button"
                key={p.id}
                aria-pressed={notePhase === p.id}
                aria-current={phase.id === p.id ? 'step' : undefined}
                onClick={() => setNotePhase(p.id)}
              >
                <strong>{config.coach.find((c) => c.id === p.id)?.title.vi}</strong>
                <span>{fmt(p.end - p.start)}</span>
              </button>
            ))}
          </nav>
          <aside className="mock-coach">
            <h5>{config.coach.find((c) => c.id === notePhase)?.title.vi}</h5>
            <p>{config.coach.find((c) => c.id === notePhase)?.goal.vi}</p>
            <ul>
              {config.coach
                .find((c) => c.id === notePhase)
                ?.checklist.map((c) => (
                  <li key={c.vi}>{c.vi}</li>
                ))}
            </ul>
          </aside>
          <label className="mock-scratchpad" htmlFor={uid + '-notes'}>
            Ghi chú cho pha đang chọn
            <textarea
              id={uid + '-notes'}
              rows={9}
              maxLength={8000}
              value={current.notes[notePhase]}
              onChange={(e) =>
                updateCurrent((s) => ({ ...s, notes: { ...s.notes, [notePhase]: e.target.value } }))
              }
              placeholder="Ghi assumptions, phép tính có đơn vị, luồng dữ liệu và failure cases…"
            />
          </label>
          <section className="mock-curveballs">
            <h5>Constraint thay đổi</h5>
            <ol>
              {current.curveIds.map((n) => (
                <li key={n}>{localized(current.prompt.curveballs[n])}</li>
              ))}
            </ol>
            <button
              type="button"
              disabled={current.curveIds.length >= current.prompt.curveballs.length}
              onClick={() => updateCurrent((s) => nextMockCurve(s, Math.random()))}
            >
              Thêm một curveball chưa dùng
            </button>
          </section>
          <section className="mock-reference">
            <button
              type="button"
              aria-expanded={showReference}
              onClick={() => {
                setShowReference((v) => !v);
                updateCurrent((s) => ({ ...s, referenceUsed: true }));
              }}
            >
              {showReference ? 'Ẩn gợi ý tham chiếu' : 'Mở gợi ý tham chiếu'}
            </button>
            {showReference && (
              <div>
                <p>
                  Đây là bản đồ và takeaways của bài học liên quan, không phải đáp án duy nhất cho
                  scope bạn đã chọn.
                </p>
                {reference ? (
                  <>
                    <h5>{reference.title}</h5>
                    <ol>
                      {reference.steps.map((s, i) => (
                        <li key={i}>
                          <strong>{s.title}</strong>
                          {s.detail && <p>{s.detail}</p>}
                        </li>
                      ))}
                    </ol>
                    <ul>
                      {reference.takeaways.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                    <a href={url(reference.href)} target="_blank" rel="noopener">
                      Mở bài đầy đủ ở tab mới →
                    </a>
                  </>
                ) : (
                  <p>
                    Không có bài liên quan trong bản nội dung hiện tại; ghi chú của phiên vẫn được
                    giữ.
                  </p>
                )}
              </div>
            )}
          </section>
          <div className="mock-actions">
            <button type="button" onClick={setup}>
              Tạm dừng và chọn đề
            </button>
            <button type="button" onClick={finish}>
              Kết thúc và tự nhận xét
            </button>
          </div>
        </div>
      )}
      {view === 'review' && current && (
        <div className="mock-self-review">
          <h4>{localized(current.prompt.title)}</h4>
          <p>
            <span>Thời gian đã dùng:</span> {fmt(current.elapsedMs)} / {current.durationMinutes}:00
            · {current.referenceUsed ? 'Đã mở gợi ý trong phiên.' : 'Chưa mở gợi ý trong phiên.'}
          </p>
          <p>
            Nhận xét từng chiều bằng một ví dụ từ ghi chú hoặc bản ghi. “Có evidence” là tự báo cáo
            của bạn, chưa được kiểm chứng độc lập. Không cộng thành phần trăm hoặc level.
          </p>
          {mockDimensions.map((d) => (
            <fieldset key={d}>
              <legend>{dimensionLabels[d]}</legend>
              <label>
                Nhận xét của bạn
                <select
                  value={current.review[d].state}
                  onChange={(e) =>
                    updateCurrent((s) => ({
                      ...s,
                      review: {
                        ...s.review,
                        [d]: {
                          ...s.review[d],
                          state: e.target.value as (typeof mockReviewStates)[number],
                        },
                      },
                    }))
                  }
                >
                  {mockReviewStates.map((v) => (
                    <option key={v} value={v}>
                      {reviewLabels[v]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ví dụ, thiếu sót và bước cải thiện
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={current.review[d].note}
                  onChange={(e) =>
                    updateCurrent((s) => ({
                      ...s,
                      review: { ...s.review, [d]: { ...s.review[d], note: e.target.value } },
                    }))
                  }
                />
              </label>
            </fieldset>
          ))}
          <details>
            <summary>Đọc lại ghi chú của phiên</summary>
            {mockPhaseIds.map((p) => (
              <section key={p}>
                <h5>{config.coach.find((c) => c.id === p)?.title.vi}</h5>
                {current.notes[p] ? <pre>{current.notes[p]}</pre> : <p>Chưa có ghi chú.</p>}
              </section>
            ))}
          </details>
          <div className="mock-actions">
            <button type="button" onClick={saveReview}>
              Lưu nhận xét vào lịch sử
            </button>
            <button type="button" onClick={setup}>
              Chọn đề tiếp theo
            </button>
          </div>
        </div>
      )}
      <section className="mock-backups">
        <h4>Checkpoint và bản sao local</h4>
        <p>
          File nhập thay thế phiên và lịch sử của riêng Mock sau khi bạn áp dụng. Export có cả nội
          dung ghi chú. Phiên nhập hoặc khôi phục luôn tạm dừng; ratings, bookmarks và Daily Review
          dùng dữ liệu riêng.
        </p>
        <div className="mock-actions">
          <button type="button" onClick={download}>
            Xuất dữ liệu Mock
          </button>
          <label className="mock-import">
            Chọn file Mock để kiểm tra
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                void importFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          {!saving && (
            <button type="button" onClick={() => location.reload()}>
              Tải lại bản đang lưu
            </button>
          )}
        </div>
        {pending && (
          <aside className="mock-import-preview">
            <strong>{pending.name}</strong>
            <p>
              <span>Phiên lịch sử:</span> {pending.data.history.length} ·{' '}
              <span>Phiên đang mở:</span>{' '}
              {pending.data.current ? localized(pending.data.current.prompt.title) : 'Không có'}
            </p>
            <button type="button" onClick={acceptImport}>
              Áp dụng bản nhập đã kiểm tra
            </button>
            <button type="button" onClick={() => setPending(null)}>
              Bỏ bản nhập
            </button>
          </aside>
        )}
      </section>
      <details className="mock-history">
        <summary>
          Lịch sử Mock · {store.history.length} / {mockHistoryLimit}
        </summary>
        <p>
          Lịch sử giữ tối đa 20 phiên gần nhất, không phải biểu đồ điểm năng lực. Xuất file trước
          khi thay thế hoặc khi muốn lưu dài hạn.
        </p>
        {store.history.length === 0 ? (
          <p>Chưa có phiên trong lịch sử.</p>
        ) : (
          store.history
            .slice()
            .reverse()
            .map((s) => (
              <details key={s.id}>
                <summary>
                  {localized(s.prompt.title)} ·{' '}
                  <time dateTime={new Date(s.startedAt).toISOString()}>
                    {new Intl.DateTimeFormat(english ? 'en-GB' : 'vi-VN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(s.startedAt)}
                  </time>{' '}
                  · {fmt(s.elapsedMs)} / {s.durationMinutes}:00
                </summary>
                <p>
                  {s.mode === 'review' ? 'Phiên đã kết thúc.' : 'Phiên được lưu khi chuyển đề.'}
                </p>
                <p>{localized(s.prompt.prompt)}</p>
                {mockPhaseIds.map((p) => (
                  <section key={p}>
                    <h5>{config.coach.find((c) => c.id === p)?.title.vi}</h5>
                    {s.notes[p] ? <pre>{s.notes[p]}</pre> : <p>Chưa có ghi chú.</p>}
                  </section>
                ))}
                <dl>
                  {mockDimensions.map((d) => (
                    <div key={d}>
                      <dt>{dimensionLabels[d]}</dt>
                      <dd>
                        {reviewLabels[s.review[d].state]}
                        <p>{s.review[d].note}</p>
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            ))
        )}
      </details>
    </section>
  );
}
