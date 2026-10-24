import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { boardReadCut, type BoardChange, type BoardReadMode } from '../lib/board-read-cut';
import '../styles/board-read-cut.css';
export default function BoardReadCut() {
  const ref = useIslandReady(),
    id = 'board-cut-' + useId().replace(/:/g, ''),
    [target, setTarget] = useState('B'),
    [radius, setRadius] = useState(1),
    [change, setChange] = useState<BoardChange>('others-up'),
    [mode, setMode] = useState<BoardReadMode>('separate'),
    run = boardReadCut(target, radius, change, mode),
    maximum = Math.max(...run.after.map((p) => p.score), ...run.before.map((p) => p.score));
  return (
    <section className="handbook-experiment board-read-cut" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">LEADERBOARD / ONE READ, WHICH VIEW?</span>
      <h3 id={id}>Vì sao around-me có thể không chứa chính bạn?</h3>
      <p>
        Fixture độc lập: sáu player, một board và một lần chuyển atomic từ Before sang After. Ties
        dùng descending ASCII ID, rank là ordinal bắt đầu từ 1. Chọn score change để xem hàng di
        chuyển; kết quả query được tính lại từ đầu, không chạy Redis hoặc network thật.
      </p>
      <fieldset>
        <legend>Target player</legend>
        <div className="worksheet-choices">
          {'ABCDEF'.split('').map((p) => (
            <button
              className="secondary"
              type="button"
              key={p}
              aria-pressed={target === p}
              onClick={() => setTarget(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Score change giữa hai read</legend>
        <div className="worksheet-choices">
          {(
            [
              ['others-up', 'Hai player cuối khác target +300'],
              ['target-up', 'Target +100'],
              ['unchanged', 'Không đổi score'],
            ] as const
          ).map(([value, label]) => (
            <button
              className="secondary"
              type="button"
              key={value}
              aria-pressed={change === value}
              onClick={() => setChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="board-cut-views">
        {[
          { label: 'Before / view 0', rows: run.before },
          { label: 'After / view 1', rows: run.after },
        ].map((view) => (
          <section key={view.label}>
            <h4>{view.label}</h4>
            <ol className="board-cut-rows">
              {view.rows.map((p, index) => (
                <li
                  key={p.id}
                  value={index + 1}
                  data-target={p.id === target}
                  style={{ transform: `translateY(${index * 58}px)` }}
                >
                  <span aria-hidden="true">#{index + 1}</span>
                  <strong>
                    {p.id}
                    {p.id === target ? ' ← target' : ''}
                  </strong>
                  <span>{p.score} pts</span>
                  <span
                    className="board-cut-bar"
                    aria-hidden="true"
                    style={{ width: `${(p.score / maximum) * 100}%` }}
                  />
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <fieldset>
        <legend>Read protocol</legend>
        <div className="worksheet-choices">
          {(
            [
              ['separate', 'Rank Before → range After'],
              ['live-generation', 'Cùng generation nhưng còn mutable'],
              ['atomic-before', 'Atomic trong Before'],
              ['atomic-after', 'Atomic trong After'],
            ] as const
          ).map(([value, label]) => (
            <button
              className="secondary"
              type="button"
              key={value}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="worksheet-inputs">
        <label>
          Neighbor radius<output>{radius}</output>
          <input
            type="range"
            min="0"
            max="2"
            value={radius}
            onChange={(e) => setRadius(+e.target.value)}
          />
        </label>
      </div>
      <dl className="worksheet-results" aria-live="polite">
        <div>
          <dt>Returned ordinal rank</dt>
          <dd>{run.rank}</dd>
        </div>
        <div>
          <dt>Actual rank in After</dt>
          <dd>{run.afterRank}</dd>
        </div>
        <div>
          <dt>Target in returned window</dt>
          <dd>{run.containsTarget ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt>Compatible with Before / After</dt>
          <dd>
            {run.compatibleBefore ? 'Yes' : 'No'} / {run.compatibleAfter ? 'Yes' : 'No'}
          </dd>
        </div>
      </dl>
      <div className="board-cut-response">
        <p>
          Rank read: {run.rankCut} · Range read: {run.windowCut}
        </p>
        <h4>Returned window</h4>
        <ol className="board-cut-window">
          {run.window.map((p) => (
            <li key={p.id} data-target={p.id === target}>
              <strong>{p.id}</strong> · {p.score} pts{p.id === target ? ' ← target' : ''}
            </li>
          ))}
        </ol>
      </div>
      <p>
        Compatible nghĩa là cả rank và toàn bộ window khớp một trong hai frozen states của fixture.
        Đây không phải phép kiểm chứng linearizability tổng quát. Hai read riêng vẫn có thể tình cờ
        khớp; thử Không đổi score.
      </p>
      <p>
        Pin một generation vẫn mutable không khóa view. Atomic mode giữ rank và range trong cùng
        state trên một authority; không tạo distributed snapshot hoặc hứa phản ánh score mới nhất ở
        mọi replica.
      </p>
    </section>
  );
}
