import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { clickWindows, aggregateReplay } from '../lib/ad-click-models';
export default function AdClickPlayground({ kind }: { kind: 'click-windows' | 'click-sink' }) {
  const ref = useIslandReady(),
    id = 'click-' + useId().replace(/:/g, '');
  const [steps, setSteps] = useState(9),
    [lag, setLag] = useState(10),
    [late, setLate] = useState(30),
    [deliveries, setDeliveries] = useState(5),
    [policy, setPolicy] = useState<'add' | 'upsert' | 'fenced'>('fenced');
  const replay = clickWindows(steps, lag, late),
    sink = aggregateReplay(deliveries, policy),
    timeX = (v: number) => 80 + (v / 180) * 650;
  return (
    <section className="handbook-experiment" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">AD CLICKS / TIME AND REVISION BOUNDARIES</span>
      {kind === 'click-windows' ? (
        <>
          <h3 id={id}>Một click đến trễ thuộc window nào?</h3>
          <p>
            Fixture một ad, một input partition, windows 60 giây dạng [start,end). Sau mỗi arrival,
            watermark tăng theo max event time đã thấy trừ lag. Event được xét với watermark trước
            arrival; khi watermark ≥ end thì emit, ≥ end + allowed lateness thì đóng live state. Đây
            là quy ước theo giây của demo, không mô phỏng toàn bộ Flink.
          </p>
          <div className="worksheet-inputs">
            <label>
              Arrivals replayed<output>{steps}</output>
              <input
                type="range"
                min="0"
                max="9"
                value={steps}
                onChange={(e) => setSteps(+e.target.value)}
              />
            </label>
            <label>
              Watermark lag / seconds<output>{lag}</output>
              <input
                type="range"
                min="0"
                max="60"
                step="10"
                value={lag}
                onChange={(e) => setLag(+e.target.value)}
              />
            </label>
            <label>
              Allowed lateness / seconds<output>{late}</output>
              <input
                type="range"
                min="0"
                max="120"
                step="30"
                value={late}
                onChange={(e) => setLate(+e.target.value)}
              />
            </label>
          </div>
          <div
            className="click-timeline"
            tabIndex={0}
            role="region"
            aria-label="Click event and arrival timeline"
          >
            <svg
              viewBox={`0 0 800 ${110 + replay.rows.length * 42}`}
              role="img"
              aria-label="Solid event-time dots and hollow arrival-time dots"
            >
              <title>Event times, arrival times and current watermark for the bounded replay</title>
              {[0, 60, 120, 180].map((t) => (
                <g key={t}>
                  <line
                    x1={timeX(t)}
                    x2={timeX(t)}
                    y1="28"
                    y2={60 + replay.rows.length * 42}
                    className="click-grid"
                  />
                  <text x={timeX(t)} y="20" textAnchor="middle">
                    {t}s
                  </text>
                </g>
              ))}
              {Number.isFinite(replay.watermark) && (
                <line
                  x1={timeX(Math.max(0, replay.watermark))}
                  x2={timeX(Math.max(0, replay.watermark))}
                  y1="28"
                  y2={65 + replay.rows.length * 42}
                  className="click-watermark"
                />
              )}
              {replay.rows.map((e, i) => (
                <g key={i} data-status={e.status}>
                  <text x="12" y={57 + i * 42}>
                    {e.id}
                  </text>
                  <line
                    x1={timeX(e.event)}
                    x2={timeX(e.arrival)}
                    y1={51 + i * 42}
                    y2={51 + i * 42}
                    className="click-delay"
                  />
                  <circle cx={timeX(e.event)} cy={51 + i * 42} r="6" className="click-event">
                    <title>{`${e.id}: event ${e.event}s; arrival ${e.arrival}s; ${e.status}`}</title>
                  </circle>
                  <circle cx={timeX(e.arrival)} cy={51 + i * 42} r="6" className="click-arrival" />
                </g>
              ))}
            </svg>
          </div>
          <p>
            Chấm đặc là event time, chấm rỗng là arrival; nét đứt đứng là current watermark (nếu
            watermark âm thì vẽ tại biên 0). Dedupe giữ tất cả click IDs trong fixture; TTL,
            multiple partitions/idleness và fraud rules không được mô phỏng.
          </p>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Current watermark / seconds</dt>
              <dd>{Number.isFinite(replay.watermark) ? replay.watermark : '—'}</dd>
            </div>
            <div>
              <dt>Duplicate arrivals</dt>
              <dd>{replay.duplicates}</dd>
            </div>
            <div>
              <dt>Accepted late updates</dt>
              <dd>{replay.lateAccepted}</dd>
            </div>
            <div>
              <dt>Too-late side output</dt>
              <dd>{replay.side}</dd>
            </div>
            <div>
              <dt>Stream accepted / unique</dt>
              <dd>
                {replay.accepted} / {replay.unique}
              </dd>
            </div>
          </dl>
          <div className="click-windows">
            {replay.windows.map((w) => (
              <section key={w.start}>
                <h4>
                  [{w.start},{w.start + 60}) seconds
                </h4>
                <strong>{w.count}</strong>
                <p>stream count / raw unique {w.sourceCount}</p>
                <p>
                  {w.closed
                    ? 'Live state retired'
                    : w.emitted
                      ? 'Emitted / late-updatable'
                      : 'Open / not emitted'}
                </p>
                <p>revision {w.revision}</p>
              </section>
            ))}
          </div>
          <details>
            <summary>Arrival decisions and emitted absolute counts</summary>
            <ol>
              {replay.rows.map((e, i) => (
                <li key={i}>
                  {e.id} / event {e.event}s / arrival {e.arrival}s / {e.status}
                </li>
              ))}
            </ol>
            <h4>Outputs / window start, revision, count</h4>
            <ol>
              {replay.outputs.map((o, i) => (
                <li key={i}>
                  {o.start}s / r{o.revision} / {o.count}
                </li>
              ))}
            </ol>
          </details>
          <p>
            Summary giữ lịch sử để nhìn lại dù live state đã retired. Watermark closure không chứng
            minh billing đã final hoặc mọi future late click đã tới. Side output vẫn nằm trong
            retained raw evidence và cần policy recount/adjustment.
          </p>
        </>
      ) : (
        <>
          <h3 id={id}>Upsert absolute count đã đủ chống stale overwrite chưa?</h3>
          <p>
            Cùng window có stream r1=2, r2=3, r1 replay, recount generation 2 count=4, rồi old
            stream generation 1 r3=3 và recount replay. Generation 2 đã được authority publish hợp
            lệ trong fixture. So sánh cộng nhầm absolute count, blind upsert và fenced
            generation/revision.
          </p>
          <div className="worksheet-inputs">
            <label>
              Aggregate deliveries replayed<output>{deliveries}</output>
              <input
                type="range"
                min="0"
                max="6"
                value={deliveries}
                onChange={(e) => setDeliveries(+e.target.value)}
              />
            </label>
          </div>
          <div className="worksheet-choices">
            {(['add', 'upsert', 'fenced'] as const).map((p) => (
              <button
                type="button"
                className="secondary"
                key={p}
                aria-pressed={policy === p}
                onClick={() => setPolicy(p)}
              >
                {p === 'add'
                  ? 'Unsafe additive sink'
                  : p === 'upsert'
                    ? 'Blind absolute upsert'
                    : 'Fenced epoch + revision'}
              </button>
            ))}
          </div>
          <ol className="sync-stage-list">
            {sink.rows.map((m, i) => (
              <li key={i}>
                g{m.generation}/r{m.revision} count {m.count} → {m.reason} → stored {m.value}
              </li>
            ))}
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Stored count</dt>
              <dd>{sink.value}</dd>
            </div>
            <div>
              <dt>Expected authoritative count</dt>
              <dd>{sink.expected}</dd>
            </div>
            <div>
              <dt>Stored generation / revision</dt>
              <dd>
                {sink.generation} / {sink.revision}
              </dd>
            </div>
            <div>
              <dt>Stale writes ignored</dt>
              <dd>{sink.stale}</dd>
            </div>
            <div>
              <dt>Duplicate versions ignored</dt>
              <dd>{sink.duplicates}</dd>
            </div>
          </dl>
          <p>
            Version fence chỉ đúng khi key/dimensions/rule scope và authority generation được
            validate, comparison + write atomic. Cùng version nhưng khác count là conflict cần điều
            tra, không last-write-wins. Transactional sinks là lựa chọn khác; model không thay
            connector/OLAP-engine semantics.
          </p>
        </>
      )}
    </section>
  );
}
