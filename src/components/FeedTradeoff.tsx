import { useEffect, useRef, useState } from 'react';
import { feedTradeoff, type FeedStrategy } from '../lib/feed-tradeoff';
export default function FeedTradeoff() {
  const [strategy, setStrategy] = useState<FeedStrategy>('hybrid'),
    [followers, setFollowers] = useState(20000000),
    [active, setActive] = useState(100),
    [followees, setFollowees] = useState(300),
    [otherPulled, setOtherPulled] = useState(8),
    [threshold, setThreshold] = useState(10000),
    [capacity, setCapacity] = useState(1000),
    [run, setRun] = useState(0),
    [lit, setLit] = useState(false);
  const serial = useRef(0);
  const input = {
      strategy,
      followers,
      activeFraction: active / 100,
      readerFollowees: followees,
      otherPulledAuthors: Math.min(otherPulled, followees - 1),
      threshold,
      insertsPerSecond: capacity * 1000,
    },
    result = feedTradeoff(input),
    comparisons = (['push', 'pull', 'hybrid'] as const).map((strategy) => ({
      strategy,
      result: feedTradeoff({ ...input, strategy }),
    }));
  useEffect(() => {
    setLit(false);
    if (!run) return;
    const current = ++serial.current;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        if (serial.current === current) setLit(true);
      });
    });
    return () => {
      serial.current++;
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [run]);
  const change = (action: () => void) => {
    setRun(0);
    setLit(false);
    action();
  };
  const range = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    apply: (n: number) => void,
  ) => (
    <label>
      {label}
      <output>{value.toLocaleString('en-US')}</output>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => change(() => apply(+e.target.value))}
      />
    </label>
  );
  return (
    <div className="feed-tradeoff">
      <h4>Một post: ai trả chi phí, writer hay reader?</h4>
      <p>
        Mô hình một tác giả và một reader có follow tác giả đó. Số tác giả pull khác là assumption
        riêng; đổi threshold chỉ phân loại tác giả đang xét. Mỗi timeline insert có 16 B payload,
        chưa tính overhead/replica; số nguồn logic có thể được batch, không đồng nghĩa số RPC.
      </p>
      <div className="worksheet-choices">
        {(['push', 'pull', 'hybrid'] as const).map((mode) => (
          <button
            type="button"
            className="secondary"
            key={mode}
            aria-pressed={strategy === mode}
            data-feed-mode={mode}
            onClick={() => change(() => setStrategy(mode))}
          >
            {mode === 'push' ? 'Push' : mode === 'pull' ? 'Pull' : 'Hybrid'}
          </button>
        ))}
      </div>
      <div className="worksheet-inputs">
        {range('Author followers', followers, 1, 100000000, 1, setFollowers)}
        {range('Eligible active followers / %', active, 0, 100, 5, setActive)}
        {range('Reader follows / accounts', followees, 1, 2000, 1, (n) => {
          setFollowees(n);
          setOtherPulled((old) => Math.min(old, n - 1));
        })}
        {range('Hybrid threshold / followers', threshold, 0, 100000000, 1000, setThreshold)}
        {range(
          'Other pulled authors / reader',
          Math.min(otherPulled, followees - 1),
          0,
          Math.min(50, followees - 1),
          1,
          setOtherPulled,
        )}
        {range('Assumed insert capacity / thousand per second', capacity, 1, 1000, 1, setCapacity)}
      </div>
      <div className="worksheet-choices">
        <button
          type="button"
          className="primary"
          data-feed-publish
          onClick={() => {
            setLit(false);
            setRun((n) => n + 1);
          }}
        >
          Mô phỏng publish một post
        </button>
      </div>
      <div
        className="feed-publication"
        key={run}
        data-active={lit}
        data-pulled={result.authorPulled}
      >
        <div className="feed-source-state">
          <strong>Source post · 1</strong>
          <span>
            {result.authorPulled ? 'Reader pull từ author source' : 'Worker push candidate IDs'}
          </span>
        </div>
        <div className="feed-recipient-dots" aria-hidden="true">
          {Array.from({ length: Math.min(120, result.eligibleFollowers) }, (_, i) => (
            <span
              key={i}
              data-lit={lit && !result.authorPulled && result.timelineInserts > 0}
              style={{
                transitionDelay: `${(i / 120) * Math.min(3, Math.max(0.5, result.idealDrainSeconds))}s`,
              }}
            />
          ))}
        </div>
      </div>
      <p className="worksheet-verdict" role="status">
        {!run
          ? 'Chọn mode rồi mô phỏng để xem đường phân phối.'
          : result.authorPulled
            ? 'Post nằm ở author source để pull lúc đọc; không fan-out candidate của post này vào timeline.'
            : result.timelineInserts === 0
              ? 'Không có follower eligible trong assumption này; source post vẫn được ghi.'
              : 'Post đã vào source; các chấm minh họa timeline nhận candidate. Mỗi chấm đại diện một nhóm recipient, không phải một ACK thật.'}
      </p>
      <dl className="worksheet-results" aria-live="polite">
        <div>
          <dt>Timeline inserts / post</dt>
          <dd>{result.timelineInserts.toLocaleString('en-US')}</dd>
        </div>
        <div>
          <dt>Logical reader sources</dt>
          <dd>{result.logicalReadSources}</dd>
        </div>
        <div>
          <dt>Inserted ID payload / MB</dt>
          <dd>{(result.insertPayloadBytes / 1e6).toFixed(2)}</dd>
        </div>
        <div>
          <dt>Ideal insert drain / seconds</dt>
          <dd>{result.authorPulled ? 'read-time' : result.idealDrainSeconds.toFixed(3)}</dd>
        </div>
      </dl>
      <div
        className="feed-cost-table"
        role="region"
        tabIndex={0}
        aria-label="So sánh cost push pull hybrid"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Mode</th>
              <th scope="col">Timeline inserts / post</th>
              <th scope="col">Logical reader sources</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map(({ strategy, result }) => (
              <tr key={strategy} data-feed-strategy={strategy}>
                <th scope="row">{strategy}</th>
                <td>{result.timelineInserts.toLocaleString('en-US')}</td>
                <td>{result.logicalReadSources}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Pure pull đọc nguồn của mọi followee. Hybrid trong mô hình luôn đọc một timeline và các
        author nguồn pull; có thể tối ưu bỏ timeline rỗng nhưng chưa mô phỏng ở đây. Tỷ lệ active
        chỉ đổi push recipients; số nguồn reader không được tự suy ra từ tỷ lệ đó.
      </p>
      <p>
        Ideal drain là inserts chia capacity được nhập, giả định chỉ job này dùng toàn bộ capacity
        và tải đều; chưa có queue, retry, I/O hay privacy work. Đó không phải latency dự báo hoặc
        thời gian bài tới user. Animation được co giãn tối đa vài giây để dễ quan sát; chế độ
        reduced motion bỏ chuyển động.
      </p>
    </div>
  );
}
