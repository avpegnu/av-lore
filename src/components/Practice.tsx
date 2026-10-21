import { useIslandReady } from '../lib/use-island-ready';
import { useEffect, useMemo, useState } from 'react';
import { readStudy, setRating } from '../lib/study';
import { url } from '../lib/url';
interface Item {
  key: string;
  topic: string;
  title: string;
  question: string;
  answer: string;
  explanation: string;
  followUp: string;
  id: string;
}
interface Props {
  items: Item[];
}
const roles: Record<string, string[]> = {
  'Tất cả': [],
  Frontend: [
    'html-css',
    'javascript',
    'typescript',
    'react',
    'rendering',
    'network',
    'security',
    'testing',
  ],
  Backend: [
    'backend',
    'nodejs',
    'api',
    'auth',
    'sql',
    'database',
    'nosql',
    'cache',
    'messaging',
    'security',
  ],
  'System Design': [
    'architecture',
    'distributed',
    'storage-search',
    'system-design',
    'observability',
  ],
  DevOps: ['linux', 'git', 'network', 'docker-cicd', 'kubernetes', 'observability'],
};
export default function Practice({ items }: Props) {
  const islandRef = useIslandReady();
  const [role, setRole] = useState('Tất cả'),
    [onlyReview, setOnlyReview] = useState(false),
    [review, setReview] = useState<string[]>([]),
    [index, setIndex] = useState(0),
    [show, setShow] = useState(false),
    [scores, setScores] = useState({ known: 0, review: 0 }),
    [seed, setSeed] = useState(0);
  useEffect(() => {
    setReview(readStudy().review);
  }, []);
  const deck = useMemo(() => {
    const topics = roles[role];
    const list = items.filter(
      (i) =>
        (!topics.length || topics.includes(i.topic)) && (!onlyReview || review.includes(i.key)),
    );
    if (seed)
      return [
        ...list.slice(seed % Math.max(list.length, 1)),
        ...list.slice(0, seed % Math.max(list.length, 1)),
      ];
    return list;
  }, [role, onlyReview, review, seed, items]);
  const item = deck[index];
  function reset() {
    setIndex(0);
    setShow(false);
    setScores({ known: 0, review: 0 });
  }
  function rate(r: 'known' | 'review') {
    if (!item) return;
    setRating(item.key, r);
    setScores((s) => ({ ...s, [r]: s[r] + 1 }));
    setIndex((n) => n + 1);
    setShow(false);
  }
  return (
    <div className="practice-panel" ref={islandRef}>
      <div className="practice-controls">
        <label className="input-field">
          Hướng luyện tập
          <select
            className="practice-role-select"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              reset();
            }}
          >
            {Object.keys(roles).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="toggle-field">
          <input
            type="checkbox"
            checked={onlyReview}
            onChange={(e) => {
              setOnlyReview(e.target.checked);
              setReview(readStudy().review);
              reset();
            }}
          />
          Chỉ câu cần ôn lại
        </label>
        <button
          className="secondary"
          onClick={() => {
            setSeed((s) => s + 7);
            reset();
          }}
        >
          Đổi điểm bắt đầu
        </button>
      </div>
      <p className="muted">
        {deck.length} câu phù hợp · Đã hiểu {scores.known} · Cần ôn {scores.review}
      </p>
      {item ? (
        <div className="practice-card">
          <span className="eyebrow">
            {item.title} / {index + 1} TRÊN {deck.length}
          </span>
          <h2>{item.question}</h2>
          {show ? (
            <div>
              <p>{item.answer}</p>
              <p className="muted">{item.explanation}</p>
              <aside className="callout">
                <strong>Đào sâu</strong>
                <p>{item.followUp}</p>
              </aside>
              <div className="lab-actions">
                <button onClick={() => rate('known')}>Đã hiểu →</button>
                <button className="secondary" onClick={() => rate('review')}>
                  Cần ôn lại →
                </button>
              </div>
              <a className="text-link" href={url(`/handbook/${item.topic}/#question-${item.id}`)}>
                Xem trong topic ↗
              </a>
            </div>
          ) : (
            <>
              <p>Thử nói câu trả lời thành tiếng, kèm ví dụ và một trade-off.</p>
              <button onClick={() => setShow(true)}>Xem gợi ý trả lời</button>
              <button
                className="secondary"
                onClick={() => {
                  setIndex((i) => i + 1);
                  setShow(false);
                }}
              >
                Bỏ qua →
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{deck.length ? 'Đã đi hết bộ câu hỏi.' : 'Chưa có câu phù hợp.'}</h2>
          <p>
            {onlyReview
              ? 'Đánh dấu “Cần ôn lại” trong từng topic hoặc chọn toàn bộ câu hỏi.'
              : 'Đổi hướng luyện tập hoặc bắt đầu lại để ôn tiếp.'}
          </p>
          <button onClick={reset}>Bắt đầu lại</button>
        </div>
      )}
      <p className="muted">
        Tự đánh giá để ôn tập; đây không phải điểm số phỏng vấn. Nội dung câu hỏi dùng cùng nguồn
        với các topic.
      </p>
    </div>
  );
}
