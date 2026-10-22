import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { cardinalityBudget, gaugeRollup, gaugeSamples, alertReplay } from '../lib/metrics-models';
export default function MetricsPlayground({
  kind,
}: {
  kind: 'metrics-cardinality' | 'metrics-rollup' | 'metrics-alert';
}) {
  const ref = useIslandReady(),
    id = 'metrics-' + useId().replace(/:/g, '');
  const [coverage, setCoverage] = useState(100),
    [interval, setIntervalSeconds] = useState(10),
    [ids, setIds] = useState(false),
    [exponent, setExponent] = useState(4),
    [width, setWidth] = useState(10),
    [extrema, setExtrema] = useState(true),
    [clock, setClock] = useState(14),
    [threshold, setThreshold] = useState(5),
    [duration, setDuration] = useState(3),
    [missing, setMissing] = useState(false);
  const budget = cardinalityBudget(ids ? 10 ** exponent : 1, coverage, interval),
    rollup = gaugeRollup(width),
    alert = alertReplay(clock, threshold, duration, missing),
    fmt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const gx = (i: number) => 50 + (i / 22) * 660,
    gy = (v: number) => 245 - (v / 120) * 200,
    ax = (t: number) => 50 + (t / 19) * 660,
    ay = (v: number) => 220 - (v / 20) * 170;
  return (
    <section className="handbook-experiment metrics-playground" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">METRICS / IDENTITY, ROLLUPS AND ALERT EVIDENCE</span>
      {kind === 'metrics-cardinality' && (
        <>
          <h3 id={id}>Thêm một label có thể tạo bao nhiêu series?</h3>
          <p>
            Base Cartesian bound là 30 services ×4 methods ×8 status values ×3 regions =2880
            combinations. Coverage slider giả định tỷ lệ combinations thực sự xuất hiện, không đo
            production. Hash user IDs vẫn giữ cardinality nếu mỗi ID còn một giá trị riêng.
          </p>
          <div className="worksheet-inputs">
            <label>
              Tỷ lệ combinations thực sự xuất hiện / %<output>{coverage}</output>
              <input
                type="range"
                min="0"
                max="100"
                value={coverage}
                onChange={(e) => setCoverage(+e.target.value)}
              />
            </label>
            <label>
              Chu kỳ lấy mẫu / giây<output>{interval}</output>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={interval}
                onChange={(e) => setIntervalSeconds(+e.target.value)}
              />
            </label>
            <label>
              Số giá trị label thêm / 10^x
              <output>
                {exponent} / {fmt(10 ** exponent)}
              </output>
              <input
                type="range"
                min="3"
                max="6"
                disabled={!ids}
                value={exponent}
                onChange={(e) => setExponent(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={ids} onChange={(e) => setIds(e.target.checked)} />
            Thêm high-cardinality user label
          </label>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Combinations có thể có / upper bound</dt>
              <dd>{fmt(budget.potential)}</dd>
            </div>
            <div>
              <dt>Active series theo giả định</dt>
              <dd>{fmt(budget.observed)}</dd>
            </div>
            <div>
              <dt>Logical samples / giây</dt>
              <dd>{fmt(budget.samplesPerSecond)}</dd>
            </div>
            <div>
              <dt>Raw sample payload / GB mỗi ngày</dt>
              <dd>{fmt(budget.rawGB)}</dd>
            </div>
            <div>
              <dt>Payload nén giả định / GB mỗi ngày</dt>
              <dd>{fmt(budget.compressedGB)}</dd>
            </div>
            <div>
              <dt>15 ngày ×2 bản sao / TB</dt>
              <dd>{fmt(budget.hotTB)}</dd>
            </div>
            <div>
              <dt>Head theo giả định / GB</dt>
              <dd>{fmt(budget.headGB)}</dd>
            </div>
          </dl>
          <p>
            Byte assumptions là raw16 B/sample, compressed2 B/sample và head2000 B/active series.
            Chưa tính index, WAL, histogram layout, churn, compaction hoặc HA ingest duplication.
            Đây là budget arithmetic, không benchmark TSDB hoặc compression guarantee.
          </p>
        </>
      )}
      {kind === 'metrics-rollup' && (
        <>
          <h3 id={id}>Average có che spike và làm sai global mean không?</h3>
          <p>
            23 gauge samples cách đều, gồm spike100 và last bucket có thể ít samples hơn. Mỗi bucket
            lưu min/max/sum/count. Weighted mean dùng sum toàn bộ chia count toàn bộ; average của
            các bucket means không đúng khi counts khác. Không mô phỏng time weighting khi sample
            gaps hoặc counter resets.
          </p>
          <div className="worksheet-inputs">
            <label>
              Số samples mỗi bucket<output>{width}</output>
              <input
                type="range"
                min="1"
                max="10"
                value={width}
                onChange={(e) => setWidth(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={extrema}
              onChange={(e) => setExtrema(e.target.checked)}
            />
            Giữ min/max bên cạnh average
          </label>
          <div
            className="metrics-chart"
            tabIndex={0}
            role="region"
            aria-label="Gauge samples and downsampled means"
          >
            <svg
              viewBox="0 0 760 300"
              role="img"
              aria-label="Solid raw samples, dashed bucket means and optional extrema"
            >
              <title>Regular gauge samples versus downsampled summaries</title>
              {[0, 40, 80, 120].map((v) => (
                <g key={v}>
                  <line x1="50" x2="710" y1={gy(v)} y2={gy(v)} className="metrics-grid" />
                  <text x="40" y={gy(v) + 5} textAnchor="end">
                    {v}
                  </text>
                </g>
              ))}
              {extrema &&
                rollup.buckets.map((b) => (
                  <g key={b.start}>
                    <line
                      x1={gx((b.start + b.end - 1) / 2)}
                      x2={gx((b.start + b.end - 1) / 2)}
                      y1={gy(b.min)}
                      y2={gy(b.max)}
                      className="metrics-extrema"
                    />
                    <circle
                      cx={gx((b.start + b.end - 1) / 2)}
                      cy={gy(b.max)}
                      r="4"
                      className="metrics-max"
                    />
                  </g>
                ))}
              <polyline
                points={gaugeSamples.map((v, i) => `${gx(i)},${gy(v)}`).join(' ')}
                className="metrics-raw"
              />
              <polyline
                points={rollup.buckets
                  .map((b) => `${gx((b.start + b.end - 1) / 2)},${gy(b.mean)}`)
                  .join(' ')}
                className="metrics-mean"
              />
              <text x="50" y="280">
                Sample index 0
              </text>
              <text x="710" y="280" textAnchor="end">
                22
              </text>
            </svg>
          </div>
          <p>
            Nét liền là raw gauge; nét đứt là bucket mean. Thanh min/max và dấu chấm max chỉ có khi
            bật retention đó. Average-only không thể tái tạo peak100 từ mean19; chart không là
            histogram của request latencies.
          </p>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Số raw samples</dt>
              <dd>{rollup.count}</dd>
            </div>
            <div>
              <dt>Mean đúng từ tổng sum / count</dt>
              <dd>{rollup.weightedMean.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Mean không trọng số của bucket means</dt>
              <dd>{rollup.meanOfMeans.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Bucket average cao nhất</dt>
              <dd>{rollup.maxAverage.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Peak giữ được theo policy đã chọn</dt>
              <dd>{extrema ? rollup.retainedMax : '—'}</dd>
            </div>
          </dl>
          <details>
            <summary>Xem min / max / sum / count từng bucket</summary>
            <figure className="handbook-table">
              <div role="region" tabIndex={0} aria-label="Gauge rollup bucket values">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Sample range</th>
                      <th scope="col">Min/max</th>
                      <th scope="col">Sum/count</th>
                      <th scope="col">Mean</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rollup.buckets.map((b) => (
                      <tr key={b.start}>
                        <td>
                          [{b.start},{b.end})
                        </td>
                        <td>
                          {b.min}/{b.max}
                        </td>
                        <td>
                          {b.sum}/{b.count}
                        </td>
                        <td>{b.mean.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </figure>
          </details>
          <p>
            Min/max/sum/count chưa đủ để dựng arbitrary percentile hoặc counter rate với resets.
            Muốn merge latency distributions cần compatible histogram/sketch semantics;
            time-weighted gauge average cần duration/gap policy riêng.
          </p>
        </>
      )}
      {kind === 'metrics-alert' && (
        <>
          <h3 id={id}>Alert for: 3m có nghĩa là ba lần true liên tiếp?</h3>
          <p>
            Rule input là error-rate % đã tính sẵn, evaluation mỗi phút. Spike t2–3 ngắn; t7–14
            sustained. Pending bắt đầu tại first true evaluation, firing khi elapsed time đạt for.
            Missing toggle tạo absent expression result tại t10 và reset pending trong model; đây
            không đồng nghĩa một scrape mất sẽ luôn làm PromQL mất sample ngay.
          </p>
          <div className="worksheet-inputs">
            <label>
              Thời điểm evaluation / phút<output>{clock}</output>
              <input
                type="range"
                min="0"
                max="19"
                value={clock}
                onChange={(e) => setClock(+e.target.value)}
              />
            </label>
            <label>
              Ngưỡng error / %<output>{threshold}</output>
              <input
                type="range"
                min="1"
                max="20"
                value={threshold}
                onChange={(e) => setThreshold(+e.target.value)}
              />
            </label>
            <label>
              Thời gian for / phút<output>{duration}</output>
              <input
                type="range"
                min="0"
                max="5"
                value={duration}
                onChange={(e) => setDuration(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={missing}
              onChange={(e) => setMissing(e.target.checked)}
            />
            Rule expression không có dữ liệu ở t10
          </label>
          <div
            className="metrics-chart"
            tabIndex={0}
            role="region"
            aria-label="Error-rate rule evaluations and alert states"
          >
            <svg
              viewBox="0 0 760 320"
              role="img"
              aria-label="Error rate, threshold and pending firing state markers"
            >
              <title>Error-rate input with elapsed-duration alert evaluation</title>
              {[0, 5, 10, 15, 20].map((v) => (
                <g key={v}>
                  <line x1="50" x2="710" y1={ay(v)} y2={ay(v)} className="metrics-grid" />
                  <text x="40" y={ay(v) + 5} textAnchor="end">
                    {v}%
                  </text>
                </g>
              ))}
              <line
                x1="50"
                x2="710"
                y1={ay(threshold)}
                y2={ay(threshold)}
                className="metrics-threshold"
              />
              {alert.rows.map((r, i) => (
                <g key={r.time}>
                  {r.rate !== null && (
                    <circle cx={ax(r.time)} cy={ay(r.rate)} r="4" className="metrics-max" />
                  )}
                  {i > 0 && r.rate !== null && alert.rows[i - 1].rate !== null && (
                    <line
                      x1={ax(i - 1)}
                      x2={ax(i)}
                      y1={ay(alert.rows[i - 1].rate!)}
                      y2={ay(r.rate)}
                      className="metrics-raw"
                    />
                  )}
                  <rect
                    x={ax(r.time) - 12}
                    y="250"
                    width="24"
                    height="24"
                    className="metrics-alert-state"
                    data-state={r.state}
                  />
                  <text x={ax(r.time)} y="267" textAnchor="middle">
                    {r.state === 'FIRING'
                      ? 'F'
                      : r.state === 'PENDING'
                        ? 'P'
                        : r.state === 'NO_DATA'
                          ? '?'
                          : '—'}
                  </text>
                  <text x={ax(r.time)} y="295" textAnchor="middle">
                    {r.time}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <p>
            Markers: P pending, F firing, ? no data, — inactive. Threshold là nét đứt; gap không
            được vẽ thành error0. Notification grouping, query errors, lookback/staleness và
            keep_firing_for không được mô phỏng.
          </p>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Trạng thái rule hiện tại</dt>
              <dd>{alert.state}</dd>
            </div>
            <div>
              <dt>Phút firing đầu tiên</dt>
              <dd>{alert.firstFiring ?? '—'}</dd>
            </div>
            <div>
              <dt>Số evaluations đã firing</dt>
              <dd>{alert.firingEvaluations}</dd>
            </div>
            <div>
              <dt>Số evaluations thiếu dữ liệu</dt>
              <dd>{alert.noData}</dd>
            </div>
          </dl>
          <details>
            <summary>Xem evidence: thời điểm, input và trạng thái</summary>
            <ol>
              {alert.rows.map((r) => (
                <li key={r.time}>
                  t{r.time}: {r.rate === null ? 'NO_DATA' : r.rate + '%'} / {r.state} / pendingSince{' '}
                  {r.since ?? '—'}
                </li>
              ))}
            </ol>
          </details>
          <p>
            Absent data cần telemetry-health policy riêng, không tự là good zero. Alert label
            identity phải stable; đặt changing current value vào labels có thể tạo instance mới và
            reset for. SLO burn-rate/multi-window rules là thiết kế bổ sung, không chỉ tăng for để
            im mọi page.
          </p>
        </>
      )}
    </section>
  );
}
