import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { url } from '../lib/url';
import {
  practiceElapsed,
  pausePractice,
  resumePractice,
  type PracticeClock,
} from '../lib/practice-clock';
import {
  buildQuizSession,
  resolveQuizItem,
  quizSummary,
  type QuizItem,
  type QuizQuestion,
} from '../lib/quiz-models';
const unlimited = Number.MAX_SAFE_INTEGER;
const fmt = (ms: number) => Math.ceil(Math.max(0, ms) / 1000) + ' s';
export default function KnowledgeQuiz({
  questions,
  categories,
  links,
}: {
  questions: QuizQuestion[];
  categories: { id: string; label: { vi: string; en: string } }[];
  links: Record<string, string>;
}) {
  const ref = useIslandReady<HTMLElement>(),
    uid = 'quiz-' + useId().replace(/:/g, '');
  const [category, setCategory] = useState('all'),
    [count, setCount] = useState('10'),
    [seconds, setSeconds] = useState('off');
  const [phase, setPhase] = useState<'setup' | 'play' | 'done'>('setup'),
    [items, setItems] = useState<QuizItem[]>([]),
    [index, setIndex] = useState(0);
  const [clock, setClock] = useState<PracticeClock>({ elapsedMs: 0, anchor: null }),
    [now, setNow] = useState(0),
    [timedSeconds, setTimedSeconds] = useState(0);
  const [onlyGaps, setOnlyGaps] = useState(false),
    [message, setMessage] = useState('Chọn phạm vi rồi bắt đầu khi sẵn sàng.');
  const currentPanel = useRef<HTMLElement>(null),
    terminalChoice = useRef<string | null>(null),
    resultPanel = useRef<HTMLHeadingElement>(null),
    byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const pool = questions.filter((q) => category === 'all' || q.category.id === category),
    current = items[index],
    question = current ? byId.get(current.questionId) : undefined;
  const budget = timedSeconds ? timedSeconds * 1000 : null,
    elapsed = practiceElapsed(clock, now, budget ?? unlimited),
    remaining = budget === null ? null : Math.max(0, budget - elapsed);
  const summary = quizSummary(items, questions),
    counts: Record<string, number> = {};
  questions.forEach((q) => (counts[q.category.id] = (counts[q.category.id] || 0) + 1));
  useEffect(() => {
    if (
      phase !== 'play' ||
      budget === null ||
      clock.anchor === null ||
      current?.outcome !== 'unanswered'
    )
      return;
    const timer = window.setInterval(() => setNow(performance.now()), 200);
    return () => clearInterval(timer);
  }, [phase, budget, clock.anchor, current?.outcome]);
  useEffect(() => {
    if (phase === 'play') currentPanel.current?.focus();
    if (phase === 'done') resultPanel.current?.focus();
  }, [phase]);
  useEffect(() => {
    if (
      phase === 'play' &&
      current?.outcome === 'unanswered' &&
      question &&
      budget !== null &&
      elapsed >= budget
    ) {
      terminalChoice.current = current.questionId;
      setItems((previous) =>
        previous.map((item, i) =>
          i === index ? resolveQuizItem(item, question, 'skip', elapsed, budget) : item,
        ),
      );
      setClock({ elapsedMs: budget, anchor: null });
      setMessage('Hết giờ câu này. Đọc lời giải rồi chủ động chuyển câu.');
    }
  }, [phase, current?.outcome, question, budget, elapsed, index]);
  function start() {
    const next = buildQuizSession(pool, count === 'all' ? 'all' : +count);
    if (!next.length) return;
    const time = performance.now();
    terminalChoice.current = null;
    setItems(next);
    setIndex(0);
    setTimedSeconds(seconds === 'off' ? 0 : +seconds);
    setClock({ elapsedMs: 0, anchor: time });
    setNow(time);
    setOnlyGaps(false);
    setPhase('play');
    setMessage('Đọc assumptions và chọn một đáp án. Lựa chọn đầu tiên được giữ trong lượt này.');
  }
  function choose(choice: string | 'skip') {
    if (
      !current ||
      !question ||
      current.outcome !== 'unanswered' ||
      terminalChoice.current === current.questionId
    )
      return;
    terminalChoice.current = current.questionId;
    const time = performance.now(),
      used = practiceElapsed(clock, time, budget ?? unlimited);
    const resolved = resolveQuizItem(current, question, choice, used, budget);
    setItems((previous) =>
      previous.map((item, i) =>
        i === index ? resolveQuizItem(item, question, choice, used, budget) : item,
      ),
    );
    setClock(pausePractice(clock, time, budget ?? unlimited));
    setNow(time);
    setMessage(
      resolved.outcome === 'timed-out'
        ? 'Hết giờ câu này. Đọc lời giải rồi chủ động chuyển câu.'
        : resolved.outcome === 'skipped'
          ? 'Đã bỏ qua; lời giải vẫn được mở để học.'
          : resolved.picked === question.correctId
            ? 'Lựa chọn khớp đáp án của tình huống này. Kiểm tra cả lý do và giới hạn.'
            : 'Lựa chọn chưa khớp. So assumptions và cơ chế trong lời giải.',
    );
  }
  function next() {
    if (!current || current.outcome === 'unanswered') return;
    if (index + 1 === items.length) {
      setPhase('done');
      setMessage('Đã kết thúc lượt. Xem lại các cơ chế, không suy level phỏng vấn từ điểm.');
      return;
    }
    const time = performance.now();
    terminalChoice.current = null;
    setIndex(index + 1);
    setNow(time);
    setClock({ elapsedMs: 0, anchor: time });
    setMessage('Câu mới: đọc giả định rồi chọn đáp án.');
    window.setTimeout(() => currentPanel.current?.focus(), 0);
  }
  function pause() {
    const time = performance.now();
    setClock((old) =>
      old.anchor === null
        ? resumePractice(old, time, budget ?? unlimited)
        : pausePractice(old, time, budget ?? unlimited),
    );
    setNow(time);
  }
  function finish() {
    terminalChoice.current = current?.questionId || null;
    const time = performance.now();
    const used = practiceElapsed(clock, time, budget ?? unlimited);
    if (current?.outcome === 'unanswered' && question)
      setItems((previous) =>
        previous.map((item, i) =>
          i !== index
            ? item
            : budget !== null && used >= budget
              ? resolveQuizItem(item, question, 'skip', used, budget)
              : { ...item, elapsedMs: used },
        ),
      );
    setClock(pausePractice(clock, time, budget ?? unlimited));
    setNow(time);
    setPhase('done');
    setMessage('Đã kết thúc sớm. Những câu chưa làm được giữ riêng, không gộp thành câu sai.');
  }
  function exportResult() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      timedSeconds,
      items,
      questions: items.map((item) => byId.get(item.questionId)),
      summary,
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    a.download = 'av-lore-quiz-result.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setMessage('Đã xuất câu hỏi, thứ tự lựa chọn và kết quả của lượt này.');
  }
  function explanation(q: QuizQuestion, item: QuizItem) {
    return (
      <div className="quiz-explanation">
        <strong>Giải thích tình huống</strong>
        {q.explanation.map((p, i) => (
          <p key={i}>{p.vi}</p>
        ))}
        <details className="quiz-choice-reasons">
          <summary>Vì sao từng lựa chọn đúng hoặc sai?</summary>
          <ol>
            {item.order.map((id) => {
              const o = q.options.find((o) => o.id === id)!;
              return (
                <li key={id}>
                  <strong>{o.text.vi}</strong>
                  <span className="quiz-choice-verdict">
                    {id === q.correctId ? 'Đáp án phù hợp' : 'Không phù hợp trong tình huống'}
                  </span>
                  <p>{o.rationale.vi}</p>
                </li>
              );
            })}
          </ol>
        </details>
        <a href={url(q.lessonId ? links[q.lessonId] : '/handbook/' + q.topicId + '/')}>
          Mở bài học để xem cơ chế và sơ đồ →
        </a>
      </div>
    );
  }
  const resultLabels = {
    answered: 'Đã chọn',
    skipped: 'Đã bỏ qua',
    'timed-out': 'Hết giờ',
    unanswered: 'Chưa làm',
  };
  return (
    <section
      className="knowledge-quiz handbook-experiment"
      ref={ref}
      aria-labelledby={uid + '-title'}
    >
      <header>
        <span className="eyebrow">KNOWLEDGE QUIZ</span>
        <h3 id={uid + '-title'}>Chọn đáp án. Hiểu lý do. Thử lại cơ chế.</h3>
        <p>
          Mỗi câu có một đáp án theo assumptions đã nêu. Lựa chọn được xáo; giải thích mọi phương án
          và mở đúng bài để đọc sâu.
        </p>
      </header>
      <p className="quiz-session-status" role="status">
        {message}
      </p>
      {phase === 'setup' && (
        <div className="quiz-setup">
          <p>
            <strong>{questions.length}</strong> câu trong pool; <strong>{pool.length}</strong> câu
            thuộc phạm vi đang chọn.
          </p>
          <div className="quiz-setup-controls">
            <label>
              Nhóm câu hỏi
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="all">Toàn bộ nhóm kiến thức</option>
                {categories.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.label.vi} ({counts[c.id]})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Độ dài lượt luyện
              <select value={count} onChange={(e) => setCount(e.target.value)}>
                {['5', '10', '20', 'all'].map((n) => (
                  <option value={n} key={n}>
                    {n === 'all' ? 'Tất cả câu trong phạm vi' : n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Thời gian mỗi câu
              <select value={seconds} onChange={(e) => setSeconds(e.target.value)}>
                <option value="off">Không tính giờ</option>
                <option value="30">30 s</option>
                <option value="60">60 s</option>
              </select>
            </label>
          </div>
          <p>
            Đồng hồ chỉ bắt đầu sau nút Bắt đầu. Có thể tạm dừng; thời gian ngủ của máy tùy
            platform. Đây là công cụ học, không phải kỳ thi.
          </p>
          {items.length > 0 && (
            <aside>
              Lượt mới thay thế kết quả trong bộ nhớ trang. Xuất kết quả trước nếu muốn giữ; reload
              không khôi phục lượt đang làm.
            </aside>
          )}
          <button type="button" data-action="start" disabled={!pool.length} onClick={start}>
            Bắt đầu Quiz
          </button>
        </div>
      )}
      {phase === 'play' && current && question && (
        <div className="quiz-play">
          <div className="quiz-play-meta">
            <span>
              {index + 1} / {items.length}
            </span>
            <span>{question.category.label.vi}</span>
            {budget !== null && (
              <span className="quiz-timer" role="timer" aria-label="Thời gian còn lại của câu">
                {fmt(remaining!)} ·{' '}
                {clock.anchor === null ? 'Đồng hồ tạm dừng' : 'Đồng hồ đang chạy'}
              </span>
            )}
          </div>
          <progress value={index} max={items.length} aria-label="Tiến độ lượt Quiz" />
          <article
            ref={currentPanel}
            tabIndex={0}
            className="quiz-question"
            data-quiz-id={question.id}
            aria-label="Câu hỏi Quiz"
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget || e.ctrlKey || e.metaKey || e.altKey) return;
              const number = Number(e.key);
              if (Number.isInteger(number) && number >= 1 && number <= current.order.length) {
                e.preventDefault();
                choose(current.order[number - 1]);
              } else if (e.key === 'Enter' && current.outcome !== 'unanswered') {
                e.preventDefault();
                next();
              }
            }}
          >
            <h4>{question.question.vi}</h4>
            <div className="quiz-options" role="group" aria-label="Các lựa chọn của câu hỏi">
              {current.order.map((id, i) => {
                const o = question.options.find((o) => o.id === id)!,
                  answered = current.outcome !== 'unanswered',
                  correct = answered && id === question.correctId,
                  picked = current.picked === id;
                return (
                  <button
                    type="button"
                    key={id}
                    className={correct ? 'is-correct' : answered && picked ? 'is-incorrect' : ''}
                    aria-disabled={answered}
                    aria-pressed={picked}
                    data-option-id={id}
                    onClick={() => choose(id)}
                  >
                    <kbd>{i + 1}</kbd>
                    <span>{o.text.vi}</span>
                    {correct && <strong>✓ Đáp án đúng</strong>}
                    {answered && picked && !correct && <strong>× Đã chọn</strong>}
                  </button>
                );
              })}
            </div>
            {current.outcome !== 'unanswered' && (
              <aside className="quiz-feedback">
                <strong>
                  {current.outcome === 'timed-out'
                    ? 'Hết giờ'
                    : current.outcome === 'skipped'
                      ? 'Đã bỏ qua'
                      : current.picked === question.correctId
                        ? 'Đáp án phù hợp'
                        : 'Cần xem lại'}
                </strong>
                {explanation(question, current)}
              </aside>
            )}
          </article>
          <div className="quiz-play-actions">
            {current.outcome === 'unanswered' ? (
              <>
                <button type="button" onClick={() => choose('skip')}>
                  Bỏ qua và đọc giải thích
                </button>
                {budget !== null && (
                  <button type="button" onClick={pause}>
                    {clock.anchor === null ? 'Tiếp tục thời gian câu' : 'Tạm dừng thời gian câu'}
                  </button>
                )}
              </>
            ) : (
              <button type="button" onClick={next}>
                {index + 1 === items.length ? 'Xem tổng kết lượt' : 'Câu tiếp theo →'}
              </button>
            )}
            <button type="button" onClick={finish}>
              Kết thúc lượt tại đây
            </button>
          </div>
          <p className="quiz-help">
            Focus trên khung câu hỏi: phím 1–4 chọn theo thứ tự hiển thị, Enter đi tiếp sau khi trả
            lời. Không áp phím tắt khi focus ở điều khiển khác.
          </p>
        </div>
      )}
      {phase === 'done' && (
        <div className="quiz-results">
          <h4 ref={resultPanel} tabIndex={-1}>
            Kết quả của đúng lượt này
          </h4>
          <div className="quiz-summary-visual" aria-hidden="true">
            {[
              ['correct', summary.correct],
              ['incorrect', summary.incorrect],
              ['skipped', summary.skipped],
              ['timeout', summary.timedOut],
              ['unanswered', summary.unanswered],
            ]
              .filter(([, value]) => Number(value) > 0)
              .map(([name, value]) => (
                <span
                  key={name}
                  className={'quiz-segment-' + name}
                  style={{ flexGrow: Number(value) }}
                />
              ))}
          </div>
          <dl className="quiz-result-counts">
            <div>
              <dt>Chọn đúng</dt>
              <dd>{summary.correct}</dd>
            </div>
            <div>
              <dt>Chọn sai</dt>
              <dd>{summary.incorrect}</dd>
            </div>
            <div>
              <dt>Đã bỏ qua</dt>
              <dd>{summary.skipped}</dd>
            </div>
            <div>
              <dt>Hết giờ</dt>
              <dd>{summary.timedOut}</dd>
            </div>
            <div>
              <dt>Chưa làm</dt>
              <dd>{summary.unanswered}</dd>
            </div>
          </dl>
          <p>
            <span>Đúng trên toàn bộ lượt:</span> {summary.correct} / {summary.total}.{' '}
            <span>Đúng trong số câu đã chọn đáp án:</span> {summary.correct} / {summary.answered}.
          </p>
          <p>
            Tỷ lệ ở lượt này không chứng minh kiến thức toàn bộ hoặc khả năng phỏng vấn. Lượt khác
            có câu và timer khác nên không so như cùng một bài thi.
          </p>
          <div className="quiz-result-actions">
            <button type="button" onClick={exportResult}>
              Xuất kết quả lượt JSON
            </button>
            <button
              type="button"
              onClick={() => {
                setPhase('setup');
                setMessage('Chọn phạm vi cho lượt mới; dữ liệu ngoài Quiz không thay đổi.');
              }}
            >
              Chọn lượt Quiz mới
            </button>
          </div>
          <label className="quiz-gap-filter">
            <input
              type="checkbox"
              checked={onlyGaps}
              onChange={(e) => setOnlyGaps(e.target.checked)}
            />
            Chỉ xem câu chưa đúng
          </label>
          <div className="quiz-result-list">
            {onlyGaps && summary.correct === summary.total && (
              <p>Không có câu nào trong bộ lọc kết quả này.</p>
            )}
            {items
              .filter(
                (item) =>
                  !onlyGaps ||
                  item.outcome !== 'answered' ||
                  item.picked !== byId.get(item.questionId)!.correctId,
              )
              .map((item) => {
                const q = byId.get(item.questionId)!,
                  picked = q.options.find((o) => o.id === item.picked),
                  correct = q.options.find((o) => o.id === q.correctId)!;
                return (
                  <details key={item.questionId} data-result-id={item.questionId}>
                    <summary>
                      <span>
                        {item.outcome === 'answered'
                          ? item.picked === q.correctId
                            ? '✓ Đúng'
                            : '× Sai'
                          : resultLabels[item.outcome]}
                      </span>
                      {q.question.vi}
                    </summary>
                    <p>
                      <strong>Lựa chọn của bạn:</strong>{' '}
                      {picked ? picked.text.vi : 'Chưa chọn đáp án'}
                    </p>
                    <p>
                      <strong>Đáp án theo tình huống:</strong> {correct.text.vi}
                    </p>
                    {explanation(q, item)}
                  </details>
                );
              })}
          </div>
        </div>
      )}
      <footer>
        <p>
          Quiz không tự ghi ratings, bookmarks, lịch Daily Review hoặc dữ liệu Mock. Kết quả chỉ ở
          bộ nhớ trang cho tới khi bạn xuất.
        </p>
        <a href={url('/system-design/questions/')}>Mở Question Bank để luyện câu hỏi mở →</a>
      </footer>
    </section>
  );
}
