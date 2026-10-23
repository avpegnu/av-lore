import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { parallelLayout, pipelineSchedule, expertDispatch } from '../lib/parallelism-models';
export default function ParallelismPlayground({
  kind,
}: {
  kind: 'parallel-layout' | 'parallel-pipeline' | 'parallel-experts';
}) {
  const ref = useIslandReady(),
    id = 'parallel-' + useId().replace(/:/g, '');
  const [tp, setTp] = useState(4),
    [pp, setPp] = useState(1),
    [dp, setDp] = useState(2),
    [tokens, setTokens] = useState(1),
    [bandwidth, setBandwidth] = useState(100),
    [latency, setLatency] = useState(5),
    [spread, setSpread] = useState(false);
  const [stages, setStages] = useState(4),
    [batches, setBatches] = useState(8),
    [slow, setSlow] = useState(1);
  const [skew, setSkew] = useState(false),
    [replicate, setReplicate] = useState(false),
    [capacity, setCapacity] = useState(1),
    [drop, setDrop] = useState(false);
  const layout = parallelLayout(tp, pp, dp, tokens, bandwidth, latency, spread),
    pipeline = pipelineSchedule(stages, batches, Math.min(1, stages - 1), slow),
    experts = expertDispatch(skew, replicate, capacity, drop);
  const controls: [number, (n: number) => void, string, number, number, number][] =
    kind === 'parallel-layout'
      ? [
          [tokens, setTokens, 'Tokens trong collective payload', 1, 2048, 1],
          [bandwidth, setBandwidth, 'Bandwidth hiệu dụng (GB/s)', 25, 200, 25],
          [latency, setLatency, 'Latency mỗi ring round (µs)', 1, 20, 1],
        ]
      : kind === 'parallel-pipeline'
        ? [
            [stages, setStages, 'Số pipeline stages', 1, 8, 1],
            [batches, setBatches, 'Số independent microbatches', 1, 16, 1],
            [slow, setSlow, 'Cost multiplier tại stage được chọn', 1, 4, 1],
          ]
        : [[capacity, setCapacity, 'Capacity factor / expert copy', 0.5, 2, 0.5]];
  const choice = (label: string, v: number, set: (n: number) => void, values: number[]) => (
    <fieldset className="worksheet-choice">
      <legend>{label}</legend>
      {values.map((n) => (
        <button key={n} type="button" aria-pressed={v === n} onClick={() => set(n)}>
          {n}
        </button>
      ))}
    </fieldset>
  );
  const toggle = (text: string, v: boolean, set: (b: boolean) => void) => (
    <label className="worksheet-toggle">
      <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} />
      {text}
    </label>
  );
  return (
    <section ref={ref} className="handbook-experiment parallelism-playground" aria-labelledby={id}>
      <span className="eyebrow">PARALLELISM / PLACEMENT AND COMMUNICATION</span>
      <h3 id={id}>
        {kind === 'parallel-layout'
          ? 'Replica count chưa là failure isolation'
          : kind === 'parallel-pipeline'
            ? 'Xem microbatch đi qua từng stage'
            : 'Giữ logical experts, thay physical placement'}
      </h3>
      <p>
        {kind === 'parallel-layout'
          ? 'Fixture dense 70B BF16, 80 layers, hidden 8192; mỗi rank có 80 GiB và reserve 8 GiB. Weights chia đều theo TP×PP, bỏ qua duplicated tensors và layout overhead. Một node có 8 ranks; packing theo replica, rồi stage, rồi TP shard. Memory fit này chưa kiểm request admission.'
          : kind === 'parallel-pipeline'
            ? 'Forward-only fixture: các microbatches độc lập, tất cả sẵn ở t=0; mỗi stage 10 ms, không có transfer/overlap. Multiplier áp dụng stage 2, hoặc stage 1 nếu chỉ có một stage. Mỗi block được đánh số theo microbatch; khoảng trống là idle time.'
            : 'Fixture một MoE layer: 8 tokens, 4 logical experts, top-2; token t bắt đầu ở GPU t mod 4. Mỗi expert copy giả định 2 GiB, hidden vector 4096 BF16. Replicas của expert 0 có cùng weights/revision, chọn copy ít assignments nhất và ưu tiên GPU local khi hòa. Đây không phải neural network hoặc latency benchmark.'}
      </p>
      {kind === 'parallel-layout' && (
        <div className="parallel-choices">
          {choice('Tensor parallel degree', tp, setTp, [1, 2, 4, 8, 16])}
          {choice('Pipeline parallel degree', pp, setPp, [1, 2, 4])}
          {choice('Data replicas', dp, setDp, [1, 2, 4])}
        </div>
      )}
      <div className="worksheet-inputs">
        {controls.map(([v, set, label, min, max, step]) => (
          <label key={label}>
            {label}
            <output>{v}</output>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={v}
              onChange={(e) => set(+e.target.value)}
            />
          </label>
        ))}
      </div>
      {kind === 'parallel-layout' && (
        <>
          {toggle('Đặt mỗi replica bắt đầu ở node riêng', spread, setSpread)}
          <div
            className="parallel-node-map"
            tabIndex={0}
            role="img"
            aria-label="Rank placement by node, replica and pipeline stage"
          >
            {layout.nodeIds.map((n) => (
              <div key={n}>
                <h4>Node {n}</h4>
                <div className="parallel-rank-grid">
                  {layout.ranks
                    .filter((r) => r.node === n)
                    .map((r) => (
                      <span key={r.rank}>
                        R{r.rank}
                        <small>
                          DP{r.replica} · PP{r.stage} · TP{r.shard}
                        </small>
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Tổng GPU ranks</dt>
              <dd>{layout.gpuCount}</dd>
            </div>
            <div>
              <dt>Weights mỗi rank</dt>
              <dd>{layout.weightsGiB.toFixed(2)} GiB</dd>
            </div>
            <div>
              <dt>Weights + reserve fit?</dt>
              <dd>{layout.memoryFits ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Replica sống sau worst node loss</dt>
              <dd>{layout.worstSurvivors}</dd>
            </div>
            <div>
              <dt>Collectives mỗi stage (no overlap)</dt>
              <dd>{layout.stageCommMs.toFixed(3)} ms</dd>
            </div>
            <div>
              <dt>Activation qua các PP boundaries</dt>
              <dd>{(layout.boundaryBytes / 2 ** 20).toFixed(3)} MiB</dd>
            </div>
          </dl>
          <p className="worksheet-footnote">
            Ring model: payload = tokens×8192×2 bytes; mỗi all-reduce truyền 2(TP−1)/TP×payload
            bytes/rank và tốn 2(TP−1) latency rounds. Hai all-reduces/layer × 80/PP layers trong
            chosen forward layout; TP=1 không có collective. PP volume giả định một full activation
            đi qua mỗi boundary, chưa tính implementation sharding. Đây chỉ là communication
            arithmetic, không cộng thành predicted TPOT. Node loss không mô phỏng restart, spare
            capacity hoặc shared service failures.
          </p>
        </>
      )}
      {kind === 'parallel-pipeline' && (
        <>
          <div
            className="parallel-timeline"
            tabIndex={0}
            role="img"
            aria-label="Forward-only pipeline timeline in milliseconds"
          >
            {pipeline.costs.map((cost, s) => (
              <div className="parallel-stage-row" key={s}>
                <span>
                  Stage {s + 1}
                  <small>{cost} ms</small>
                </span>
                <div className="parallel-stage-track">
                  {pipeline.tasks
                    .filter((t) => t.stage === s)
                    .map((t) => (
                      <span
                        key={t.batch}
                        style={{
                          left: `${(t.start / pipeline.makespan) * 100}%`,
                          width: `${((t.end - t.start) / pipeline.makespan) * 100}%`,
                        }}
                        title={`Microbatch ${t.batch + 1}: ${t.start}–${t.end} ms`}
                      >
                        {t.batch + 1}
                      </span>
                    ))}
                </div>
              </div>
            ))}
            <p>0 → {pipeline.makespan} ms</p>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>First microbatch hoàn tất</dt>
              <dd>{pipeline.firstComplete} ms</dd>
            </div>
            <div>
              <dt>Hoàn tất tất cả microbatches</dt>
              <dd>{pipeline.makespan} ms</dd>
            </div>
            <div>
              <dt>Average stage utilization</dt>
              <dd>{(pipeline.utilization * 100).toFixed(1)}%</dd>
            </div>
            <div>
              <dt>Ideal balanced utilization</dt>
              <dd>{(pipeline.balancedUtilization * 100).toFixed(1)}%</dd>
            </div>
          </dl>
          <p className="worksheet-footnote">
            start[s,b] = max(end[s−1,b], end[s,b−1]); end = start + stageCost. Balanced formula
            m/(m+p−1) chỉ áp dụng equal-cost stages của fixture. Một sequence autoregressive phải
            đợi token trước hoàn tất rồi mới có input cho token tiếp theo; không coi các
            microbatches ở đây là các future tokens đã biết.
          </p>
        </>
      )}
      {kind === 'parallel-experts' && (
        <>
          {toggle('Skew: mọi token chọn expert 0', skew, setSkew)}
          {toggle('Thêm expert 0 copies ở GPU 1, 2, 3', replicate, setReplicate)}
          {toggle('Drop expert contribution khi hết capacity', drop, setDrop)}
          <div className="parallel-expert-grid">
            {[0, 1, 2, 3].map((g) => (
              <div key={g}>
                <h4>GPU {g}</h4>
                {experts.copies
                  .filter((c) => c.gpu === g)
                  .map((c) => (
                    <p key={c.expert}>
                      E{c.expert} <strong>{c.load}</strong> / {experts.capacity}
                    </p>
                  ))}
              </div>
            ))}
          </div>
          <figure className="handbook-table">
            <div
              className="parallel-dispatch-table"
              role="region"
              aria-label="Token to expert dispatch assignments"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>Token / origin</th>
                    <th>Logical expert</th>
                    <th>Physical GPU</th>
                    <th>Capacity result</th>
                  </tr>
                </thead>
                <tbody>
                  {experts.assignments.map((a, i) => (
                    <tr key={i}>
                      <th scope="row">
                        {a.token} / GPU{a.origin}
                      </th>
                      <td>E{a.expert}</td>
                      <td>GPU{a.gpu}</td>
                      <td>{a.dropped ? 'DROPPED' : a.queued ? 'QUEUED' : 'FIRST WAVE'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>GPU work counts (kept)</dt>
              <dd className="parallel-list-value">{experts.gpuLoads.join(' / ')}</dd>
            </div>
            <div>
              <dt>Physical expert weights</dt>
              <dd>{experts.physicalGiB} GiB</dd>
            </div>
            <div>
              <dt>Remote dispatch + return</dt>
              <dd>{(experts.transferBytes / 1024).toFixed(0)} KiB</dd>
            </div>
            <div>
              <dt>Queued / dropped contributions</dt>
              <dd>
                {experts.queued} / {experts.dropped}
              </dd>
            </div>
            <div>
              <dt>Max capacity waves</dt>
              <dd>{experts.waves}</dd>
            </div>
            <div>
              <dt>Đủ 16 selected contributions?</dt>
              <dd>{experts.dropped === 0 ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <p className="worksheet-footnote">
            Capacity/copy = ceil(factor×16/4). Copy loads hiển thị toàn bộ demand, kể cả dropped;
            GPU work counts và transfer chỉ tính kept contributions. Queue preserves selected
            experts nhưng tăng số waves; drop bỏ contribution và đổi phép tính của model. Dispatch
            bytes chỉ tính kept remote vectors đi/về, bỏ headers, routing metadata, topology và
            combine costs. Physical replicas không đổi top-2 expert IDs.
          </p>
        </>
      )}
    </section>
  );
}
