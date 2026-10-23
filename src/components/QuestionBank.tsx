import { useEffect, useId, useMemo, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { url } from '../lib/url';
import {
  bankMark,
  changeBankMark,
  defaultBankFilter,
  parseBankStudy,
  selectBankQuestions,
  shuffledQuestionIds,
  type BankFilter,
  type BankQuestion,
} from '../lib/question-bank-models';
import type { StudyState } from '../lib/study';
const storageKey = 'it-basic-notes-interview-v1';
const statusNames = { unseen: 'Chưa tự đánh giá', known: 'Đã hiểu', review: 'Cần ôn lại' };
const listBatch = 12;
export default function QuestionBank({
  questions,
  groups,
  topics,
}: {
  questions: BankQuestion[];
  groups: { id: string; title: string }[];
  topics: { id: string; title: string }[];
}) {
  const ref = useIslandReady<HTMLElement>(),
    uid = 'qbank-' + useId().replace(/:/g, '');
  const [filter, setFilter] = useState<BankFilter>({ ...defaultBankFilter });
  const [state, setState] = useState<StudyState>(() => parseBankStudy(null));
  const [storageOkay, setStorageOkay] = useState(false),
    [message, setMessage] = useState('Đang đọc đánh dấu học tập…');
  const [mode, setMode] = useState<'list' | 'drill'>('list'),
    [limit, setLimit] = useState(listBatch);
  const [deck, setDeck] = useState<string[]>([]),
    [position, setPosition] = useState(0),
    [revealed, setRevealed] = useState(false);
  const [sessionLimit, setSessionLimit] = useState('20'),
    [usedFilter, setUsedFilter] = useState('');
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const result = useMemo(
    () => selectBankQuestions(questions, filter, state),
    [questions, filter, state],
  );
  const current = byId.get(deck[position]);
  function refresh() {
    try {
      setState(parseBankStudy(localStorage.getItem(storageKey)));
      setStorageOkay(true);
      setMessage('Đánh dấu dùng chung với Notes & Interview và Góc học tập.');
    } catch {
      setStorageOkay(false);
      setMessage(
        'Không đọc được dữ liệu đã lưu. Đánh dấu đang tắt để giữ nguyên bản cũ; bạn vẫn có thể đọc và luyện.',
      );
    }
  }
  useEffect(() => {
    refresh();
    const external = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) refresh();
    };
    window.addEventListener('study-change', refresh);
    window.addEventListener('storage', external);
    return () => {
      window.removeEventListener('study-change', refresh);
      window.removeEventListener('storage', external);
    };
  }, []);
  function update<K extends keyof BankFilter>(key: K, value: BankFilter[K]) {
    setFilter((old) => ({ ...old, [key]: value }));
    setLimit(listBatch);
  }
  function mark(q: BankQuestion, action: 'known' | 'review' | 'unseen' | 'bookmark') {
    if (!storageOkay) return;
    try {
      // Read immediately before writing; do not save a React snapshot over another tab's changes.
      const next = changeBankMark(parseBankStudy(localStorage.getItem(storageKey)), q, action);
      localStorage.setItem(storageKey, JSON.stringify(next));
      setState(next);
      window.dispatchEvent(new Event('study-change'));
      setMessage(
        'Đã cập nhật đánh dấu. Bộ thẻ đang luyện giữ nguyên cho tới khi bạn lấy bộ lọc mới.',
      );
    } catch {
      setStorageOkay(false);
      setMessage(
        'Không lưu được đánh dấu. Dữ liệu cũ được giữ; kiểm tra quyền lưu hoặc xuất bản gốc trước khi sửa.',
      );
    }
  }
  function exportRaw() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) {
        setMessage('Chưa có dữ liệu học tập để xuất.');
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      a.download = 'av-lore-study-raw.json';
      a.click();
      URL.revokeObjectURL(a.href);
      setMessage('Đã xuất nguyên bản dữ liệu học tập, gồm cả các mục ngoài Question Bank.');
    } catch {
      setMessage('Trình duyệt chưa cho phép đọc dữ liệu để xuất.');
    }
  }
  function start(shuffle = false) {
    const ids = result.questions.map((q) => q.id),
      ordered = shuffle ? shuffledQuestionIds(ids) : ids;
    setDeck(sessionLimit === 'all' ? ordered : ordered.slice(0, +sessionLimit));
    setPosition(0);
    setRevealed(false);
    setUsedFilter(JSON.stringify(filter));
    setMode('drill');
  }
  function go(delta: number) {
    if (!deck.length) return;
    setPosition((old) => (old + delta + deck.length) % deck.length);
    setRevealed(false);
  }
  function shuffleDeck() {
    setDeck((old) => shuffledQuestionIds(old));
    setPosition(0);
    setRevealed(false);
  }
  function origins(q: BankQuestion) {
    return (
      <nav className="bank-origins" aria-label="Mở bài giải thích đầy đủ">
        {q.origins.map((o) => (
          <a key={o.id} href={url(o.href)}>
            {o.title} ↗
          </a>
        ))}
      </nav>
    );
  }
  function controls(q: BankQuestion, canRate = true) {
    const markState = bankMark(q, state);
    return (
      <div className="bank-mark-actions">
        <button
          type="button"
          aria-pressed={markState.saved}
          disabled={!storageOkay}
          onClick={() => mark(q, 'bookmark')}
        >
          {markState.saved ? '✓ Đã lưu câu hỏi' : '+ Lưu câu hỏi'}
        </button>
        {canRate && (
          <>
            <button
              type="button"
              aria-pressed={markState.rating === 'review'}
              disabled={!storageOkay}
              onClick={() => mark(q, 'review')}
            >
              Cần ôn lại
            </button>
            <button
              type="button"
              aria-pressed={markState.rating === 'known'}
              disabled={!storageOkay}
              onClick={() => mark(q, 'known')}
            >
              Đã hiểu
            </button>
            {markState.rating !== 'unseen' && (
              <button type="button" disabled={!storageOkay} onClick={() => mark(q, 'unseen')}>
                Bỏ tự đánh giá
              </button>
            )}
          </>
        )}
      </div>
    );
  }
  function answer(q: BankQuestion) {
    return (
      <div className="bank-answer">
        <strong>Lời giải và cách suy luận</strong>
        {q.answer.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {q.followUp && (
          <aside>
            <strong>Thử đào sâu</strong>
            <p>{q.followUp}</p>
          </aside>
        )}
        {origins(q)}
      </div>
    );
  }
  const marks = questions.reduce(
    (s, q) => {
      const m = bankMark(q, state);
      s[m.rating]++;
      if (m.saved) s.saved++;
      return s;
    },
    { known: 0, review: 0, unseen: 0, saved: 0 },
  );
  return (
    <section
      ref={ref}
      className="question-bank handbook-experiment"
      aria-labelledby={uid + '-title'}
    >
      <header>
        <span className="eyebrow">QUESTION BANK</span>
        <h3 id={uid + '-title'}>Hiểu cơ chế. Tự trả lời. Đối chiếu.</h3>
        <p>
          Câu hỏi lấy từ Notes & Interview và các bài chuyên sâu. Lời giải giữ đầy đủ; chỉ gộp khi
          câu hỏi, lời giải và follow-up trùng nguyên nội dung.
        </p>
      </header>
      <div className="bank-totals">
        <span>
          <strong>{questions.length}</strong> câu trong thư viện
        </span>
        <span>
          <strong>{marks.known}</strong> đã hiểu
        </span>
        <span>
          <strong>{marks.review}</strong> cần ôn
        </span>
        <span>
          <strong>{marks.saved}</strong> đã lưu
        </span>
      </div>
      <div className="bank-filter-grid">
        <label className="bank-query">
          Tìm câu hỏi và lời giải
          <input
            type="search"
            value={filter.query}
            maxLength={240}
            placeholder="Ví dụ: quorum, cache, tinh nhat quan…"
            onChange={(e) => update('query', e.target.value)}
          />
        </label>
        <label>
          Bộ nội dung
          <select
            value={filter.source}
            onChange={(e) => update('source', e.target.value as BankFilter['source'])}
          >
            <option value="all">Mọi bộ nội dung</option>
            <option value="topic">Notes & Interview</option>
            <option value="handbook">Bài chuyên sâu</option>
          </select>
        </label>
        <label>
          Nhóm bài
          <select value={filter.group} onChange={(e) => update('group', e.target.value)}>
            <option value="all">Mọi nhóm bài</option>
            {groups.map((g) => (
              <option value={g.id} key={g.id}>
                {g.title} ({result.counts[g.id] || 0})
              </option>
            ))}
          </select>
        </label>
        <label>
          Chủ đề liên quan
          <select value={filter.topic} onChange={(e) => update('topic', e.target.value)}>
            <option value="all">Mọi chủ đề</option>
            {topics.map((t) => (
              <option value={t.id} key={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Trạng thái câu hỏi
          <select
            value={filter.status}
            onChange={(e) => update('status', e.target.value as BankFilter['status'])}
          >
            <option value="all">Mọi trạng thái</option>
            <option value="unseen">Chưa tự đánh giá</option>
            <option value="known">Đã hiểu</option>
            <option value="review">Cần ôn lại</option>
            <option value="saved">Đã lưu câu hỏi</option>
          </select>
        </label>
      </div>
      <p className="bank-match-count">
        <strong>{result.questions.length}</strong> câu phù hợp bộ lọc hiện tại
      </p>
      <div className="bank-toolbar">
        <div role="group" aria-label="Cách xem câu hỏi">
          <button type="button" aria-pressed={mode === 'list'} onClick={() => setMode('list')}>
            Đọc danh sách
          </button>
          <button type="button" aria-pressed={mode === 'drill'} onClick={() => setMode('drill')}>
            Luyện từng thẻ
          </button>
        </div>
        <label>
          Số thẻ mỗi lượt
          <select value={sessionLimit} onChange={(e) => setSessionLimit(e.target.value)}>
            {['10', '20', '50', 'all'].map((n) => (
              <option key={n} value={n}>
                {n === 'all' ? 'Tất cả câu phù hợp' : n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!result.questions.length}
          data-action="start"
          onClick={() => start(false)}
        >
          Lấy bộ lọc để luyện
        </button>
        <button type="button" disabled={!result.questions.length} onClick={() => start(true)}>
          Bốc ngẫu nhiên từ bộ lọc
        </button>
        <button
          type="button"
          onClick={() => {
            setFilter({ ...defaultBankFilter });
            setLimit(listBatch);
          }}
        >
          Xóa bộ lọc câu hỏi
        </button>
      </div>
      <p role="status" className="bank-status">
        {message}
      </p>
      {!storageOkay && (
        <div className="bank-recovery">
          <button type="button" onClick={exportRaw}>
            Xuất nguyên bản dữ liệu đang lưu
          </button>
          <button type="button" onClick={refresh}>
            Đọc lại dữ liệu học tập
          </button>
        </div>
      )}
      {mode === 'list' ? (
        <div className="bank-list">
          {!result.questions.length && (
            <p>Chưa có câu phù hợp. Thử xóa từ khóa hoặc nới một bộ lọc.</p>
          )}
          {result.questions.slice(0, limit).map((q) => (
            <article className="bank-list-item" key={q.id} data-question-id={q.id}>
              <small>
                {q.title} · {statusNames[bankMark(q, state).rating]}
              </small>
              <h4>{q.question}</h4>
              <details>
                <summary>Mở lời giải để đối chiếu</summary>
                {answer(q)}
              </details>
              {controls(q)}
            </article>
          ))}
          {limit < result.questions.length && (
            <button type="button" onClick={() => setLimit((old) => old + listBatch)}>
              Xem thêm câu hỏi
            </button>
          )}
        </div>
      ) : (
        <div className="bank-drill">
          {usedFilter && usedFilter !== JSON.stringify(filter) && (
            <p className="bank-snapshot-notice">
              Bộ lọc đã đổi. Bộ thẻ đang luyện vẫn giữ nguyên; bấm lấy bộ lọc để tạo lượt mới.
            </p>
          )}
          {current ? (
            <>
              <div className="bank-card-meta">
                <span>
                  {position + 1} / {deck.length}
                </span>
                <span>{statusNames[bankMark(current, state).rating]}</span>
                <button type="button" onClick={shuffleDeck}>
                  Xáo thứ tự bộ đang luyện
                </button>
              </div>
              <article
                className="bank-flashcard"
                tabIndex={0}
                data-question-id={current.id}
                aria-label="Thẻ luyện câu hỏi"
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    go(1);
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    go(-1);
                  } else if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setRevealed((old) => !old);
                  }
                }}
              >
                <small>{current.title}</small>
                <h4>{current.question}</h4>
                <p>Nói câu trả lời thành tiếng, nêu một ví dụ và failure mode trước khi mở.</p>
                <button
                  type="button"
                  aria-expanded={revealed}
                  aria-controls={uid + '-answer'}
                  onClick={() => setRevealed((old) => !old)}
                >
                  {revealed ? 'Ẩn lời giải thẻ' : 'Mở lời giải thẻ'}
                </button>
                <div id={uid + '-answer'} hidden={!revealed}>
                  {revealed && answer(current)}
                </div>
              </article>
              {controls(current, revealed)}
              {!revealed && (
                <p className="bank-help">
                  Mở lời giải trước khi tự đánh giá. Lưu câu hỏi không thay đổi lịch ôn.
                </p>
              )}
              <div className="bank-navigation">
                <button type="button" onClick={() => go(-1)}>
                  ← Thẻ trước
                </button>
                <button type="button" onClick={() => go(1)}>
                  Thẻ tiếp →
                </button>
              </div>
              <p className="bank-help">
                Đặt focus trên thẻ: Enter/Space để mở hoặc ẩn; phím trái/phải để chuyển. Khi tới
                cuối, thẻ quay vòng. Tự đánh giá không tự chuyển thẻ.
              </p>
            </>
          ) : (
            <p>Chưa có lượt luyện. Chọn bộ lọc rồi bấm lấy bộ thẻ hoặc bốc ngẫu nhiên.</p>
          )}
        </div>
      )}
      <footer>
        <p>
          Đánh dấu là tự nhận xét, không phải bằng chứng đã thành thạo. Daily Review dùng lịch
          riêng; thao tác ở đây không sửa ngày đến hạn.
        </p>
        <a href={url('/saved/')}>Mở Góc học tập →</a>
        <a href={url('/system-design/review/')}>Mở Daily Review →</a>
      </footer>
    </section>
  );
}
