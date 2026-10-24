import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  clickWindowShapes,
  clickPartitionProgress,
  clickTopN,
  type ClickWindowShape,
} from '../lib/click-visual-models';
import '../styles/click-visuals.css';
export default function ClickVisuals({
  kind,
}: {
  kind: 'click-shapes' | 'click-progress' | 'click-topn';
}) {
  const ref = useIslandReady(),
    id = 'click-visual-' + useId().replace(/:/g, ''),
    [shape, setShape] = useState<ClickWindowShape>('tumbling'),
    [gap, setGap] = useState(20),
    [bridge, setBridge] = useState(false),
    [selected, setSelected] = useState('e3'),
    [phase, setPhase] = useState(2),
    [lag, setLag] = useState(10),
    [late, setLate] = useState(30),
    [idle, setIdle] = useState(true),
    [localK, setLocalK] = useState(1),
    [n, setN] = useState(1),
    [missing, setMissing] = useState(false),
    windows = clickWindowShapes(shape, gap, bridge),
    progress = clickPartitionProgress(phase, lag, late, idle),
    top = clickTopN(localK, n, missing),
    x = (t: number) => 80 + (t + 30) * 3.5;
  const range = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    set: (v: number) => void,
  ) => (
    <label>
      {label}
      <output>{value}</output>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(+e.target.value)}
      />
    </label>
  );
  return (
    <section className="handbook-experiment click-visuals" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">AD CLICKS / ASSIGNMENT, PROGRESS AND CANDIDATES</span>
      {kind === 'click-shapes' ? (
        <>
          <h3 id={id}>Một click có thể đóng góp vào bao nhiêu windows?</h3>
          <p>
            Fixture độc lập dùng bảy unique event times, đã sort và dedup; không có arrival,
            watermark hoặc cleanup. Tumbling rộng 60s; hopping rộng 60s, slide 30s và cho phép
            window bắt đầu trước mốc 0. Session nối khi gap nhỏ hơn threshold, bằng threshold thì
            tách. Đây là quy ước minh họa, không mô phỏng trigger/merge/retraction của engine.
          </p>
          <div className="worksheet-choices">
            {(['tumbling', 'hopping', 'session'] as const).map((v) => (
              <button
                type="button"
                className="secondary"
                key={v}
                aria-pressed={shape === v}
                onClick={() => setShape(v)}
              >
                {v === 'tumbling'
                  ? 'Tumbling 60s'
                  : v === 'hopping'
                    ? 'Hopping 60s / 30s'
                    : 'Session / gap'}
              </button>
            ))}
          </div>
          {shape === 'session' && (
            <div className="worksheet-inputs">
              {range('Session gap / seconds', gap, 10, 30, 10, setGap)}
            </div>
          )}
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={bridge}
              onChange={(e) => {
                setBridge(e.target.checked);
                if (!e.target.checked && selected === 'bridge') setSelected('e3');
              }}
            />
            Thêm bridge event tại t=34s
          </label>
          <div className="worksheet-choices">
            {windows.events.map((e) => (
              <button
                type="button"
                className="secondary"
                key={e.id}
                aria-pressed={selected === e.id}
                onClick={() => setSelected(e.id)}
              >
                {e.id} / {e.time}s
              </button>
            ))}
          </div>
          <div
            className="click-shapes-timeline"
            role="region"
            tabIndex={0}
            aria-label="Window membership diagram"
          >
            <svg
              viewBox={`0 0 800 ${95 + windows.windows.length * 42}`}
              role="img"
              aria-label="Selected click membership across event-time windows"
            >
              <title>Window boundaries, unique event times and selected-event membership</title>
              {[-30, 0, 30, 60, 90, 120, 150].map((t) => (
                <g key={t}>
                  <line
                    className="click-shape-grid"
                    x1={x(t)}
                    x2={x(t)}
                    y1="30"
                    y2={80 + windows.windows.length * 42}
                  />
                  <text x={x(t)} y="20" textAnchor="middle">
                    {t}s
                  </text>
                </g>
              ))}
              {windows.events.map((e) => (
                <circle
                  key={e.id}
                  cx={x(e.time)}
                  cy="40"
                  r={selected === e.id ? 7 : 4}
                  className={selected === e.id ? 'click-shape-selected' : 'click-shape-dot'}
                >
                  <title>{`${e.id} / ${e.time}s`}</title>
                </circle>
              ))}
              {windows.windows.map((w, i) => (
                <g key={w.start} data-member={w.ids.includes(selected)}>
                  <text x="4" y={80 + i * 42}>
                    [{w.start},{w.end})
                  </text>
                  <rect
                    x={x(w.start)}
                    y={62 + i * 42}
                    width={(w.end - w.start) * 3.5}
                    height="28"
                    rx="5"
                  />
                  <text x={x(w.start) + 8} y={81 + i * 42}>
                    {w.ids.length}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Unique fixture events</dt>
              <dd>{windows.events.length}</dd>
            </div>
            <div>
              <dt>Window contributions</dt>
              <dd>{windows.contributions}</dd>
            </div>
            <div>
              <dt>Windows containing selected event</dt>
              <dd>{windows.windows.filter((w) => w.ids.includes(selected)).length}</dd>
            </div>
            <div>
              <dt>Window groups</dt>
              <dd>{windows.windows.length}</dd>
            </div>
          </dl>
          <p>
            Thanh được nhấn chứa selected event; số trong thanh là số IDs đóng góp. Hopping có hai
            memberships mỗi event trong fixture này, không phải duplicate click. Session gap=20s:
            bridge 34s nối hai nhóm đầu thành [5,90); tổng unique tăng từ 7 lên 8, không cộng nhầm
            hai snapshot session.
          </p>
          <details>
            <summary>Window membership transcript</summary>
            <ul>
              {windows.windows.map((w) => (
                <li key={w.start}>
                  [{w.start},{w.end}): {w.ids.join(', ')}
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : kind === 'click-progress' ? (
        <>
          <h3 id={id}>Một partition im lặng giữ watermark lại thế nào?</h3>
          <p>
            Fixture độc lập có hai input và window [0,60), ban đầu đã giữ một click tại t=40. P0
            tiến từ max event=70 tới 140; P1 đứng ở 40 rồi trở lại với event=50. Local watermark=max
            event−lag; operator dùng active-input minimum và không lùi. Đánh dấu idle là thao tác
            phase minh họa, không mô phỏng timeout detection hoặc watermark alignment của engine.
          </p>
          <div className="worksheet-inputs">
            {range('Replay phase', phase, 0, 3, 1, setPhase)}
            {range('Partition lag / seconds', lag, 0, 30, 10, setLag)}
            {range('Post-trigger lateness / seconds', late, 0, 120, 30, setLate)}
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={idle} onChange={(e) => setIdle(e.target.checked)} />
            Loại P1 khỏi minimum ở phase idle
          </label>
          <ol className="sync-stage-list">
            {[
              'Both inputs active',
              'P0 advances; P1 quiet',
              'P1 idle decision',
              'P1 returns with event=50',
            ].map((label, i) => (
              <li key={label} data-current={phase === i}>
                {i}: {label}
              </li>
            ))}
          </ol>
          <div className="click-progress-cards">
            {[
              { name: 'P0', wm: progress.p0, idle: false },
              { name: 'P1', wm: progress.p1, idle: progress.idle },
            ].map((p) => (
              <section key={p.name}>
                <h4>
                  {p.name} / {p.idle ? 'idle / excluded' : 'active'}
                </h4>
                <strong>{p.wm}s</strong>
                <div className="click-progress-track" aria-hidden="true">
                  <span style={{ width: `${(p.wm / 150) * 100}%` }} />
                </div>
              </section>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Operator watermark / seconds</dt>
              <dd>{progress.progress}</dd>
            </div>
            <div>
              <dt>Main trigger / state retired</dt>
              <dd>
                {progress.emitted ? 'Yes' : 'No'} / {progress.retired ? 'Yes' : 'No'}
              </dd>
            </div>
            <div>
              <dt>Returning event=50</dt>
              <dd>{progress.returned}</dd>
            </div>
            <div>
              <dt>Retained window count</dt>
              <dd>{progress.count}</dd>
            </div>
          </dl>
          <p>
            Phase 3 xét returning event bằng operator watermark trước khi nhận nó. Với lag=10,
            lateness=30: bỏ idle input giúp progress lên 130, nhưng click=50 khi trở lại đi side
            output; watermark không quay về local P1=40. Tăng lateness lên 120 giữ state để nhận
            late revision. Không bật idleness thì progress chỉ tới 40, event được nhận nhưng window
            chưa emit.
          </p>
          <details>
            <summary>Per-phase progress transcript</summary>
            <ol>
              {progress.frames.map((f) => (
                <li key={f.phase}>
                  {f.phase}: P0={f.p0}s / P1={f.p1}s / {f.idle ? 'P1 excluded' : 'both active'} /
                  operator={f.progress}s
                </li>
              ))}
            </ol>
          </details>
          <p>
            Count này giữ lịch sử để học, không giả state backend còn giữ window sau cleanup. Side
            output vẫn cần retained evidence và recount policy; watermark không chứng minh mọi click
            đã tới.
          </p>
        </>
      ) : (
        <>
          <h3 id={id}>Vì sao local top-N có thể bỏ mất global winner?</h3>
          <p>
            Fixture độc lập: hai shards cùng có partial của ad A. Mỗi partial đã dedup, cùng
            window/rule và frozen view; không mô phỏng transport retries. A=60+60, X=100, Y=100.
            Rank theo count giảm rồi ASCII ad ID tăng. So sánh prune mỗi shard trước khi sum với sum
            đầy đủ trước khi chọn top-N.
          </p>
          <div className="worksheet-inputs">
            {range('Candidates retained per shard', localK, 1, 2, 1, setLocalK)}
            {range('Global N requested', n, 1, 2, 1, setN)}
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={missing}
              onChange={(e) => setMissing(e.target.checked)}
            />
            Shard 1 unavailable / response partial
          </label>
          <div className="click-progress-cards">
            {top.shards.map((s) => (
              <section key={s.index}>
                <h4>
                  Shard {s.index} / {s.available ? 'available' : 'unavailable'}
                </h4>
                <p>
                  {s.available
                    ? 'Fixture partial rows'
                    : 'Fixture evidence only / query cannot read these rows'}
                </p>
                <ul>
                  {s.rows.map((r) => (
                    <li key={r.ad} data-pruned={!s.kept.some((k) => k.ad === r.ad)}>
                      {r.ad}: {r.count} · {s.kept.some((k) => k.ad === r.ad) ? 'kept' : 'pruned'}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <div className="click-topn-comparison">
            {[
              { label: 'Prune → sum → top-N', rows: top.pruned },
              { label: 'Sum available rows → top-N', rows: top.summed },
            ].map((v) => (
              <section key={v.label}>
                <h4>{v.label}</h4>
                <ol>
                  {v.rows.map((r) => (
                    <li key={r.ad}>
                      <strong>{r.ad}</strong> / {r.count}
                      <div className="click-progress-track" aria-hidden="true">
                        <span style={{ width: `${(r.count / 120) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Kept / available partial rows</dt>
              <dd>
                {top.candidateCount} / {top.inputRows}
              </dd>
            </div>
            <div>
              <dt>Response partial</dt>
              <dd>{top.partial ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt>Pruned result matches full fixture</dt>
              <dd>{top.prunedMatchesFull ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
          <p>
            Full-data truth trong fixture: {top.truth.map((r) => `${r.ad}=${r.count}`).join(' · ')}.
            Đây là đáp án đối chiếu cho người học; query không được đọc unavailable shard. Kết quả
            sum cũng chỉ là partial nếu thiếu shard. Giữ hai candidates đủ cho bộ dữ liệu nhỏ này,
            không phải proof cho mọi phân phối.
          </p>
        </>
      )}
    </section>
  );
}
