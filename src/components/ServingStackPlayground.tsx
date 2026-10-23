import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  routingPolicies,
  adapterAdmission,
  servingEconomics,
  type RoutePolicy,
  type AdapterId,
} from '../lib/serving-stack-models';
export default function ServingStackPlayground({
  kind,
}: {
  kind: 'stack-routing' | 'stack-adapters' | 'stack-economics';
}) {
  const ref = useIslandReady(),
    id = 'stack-' + useId().replace(/:/g, '');
  const [easy, setEasy] = useState(70),
    [accuracy, setAccuracy] = useState(80),
    [recall, setRecall] = useState(80),
    [alarm, setAlarm] = useState(10),
    [quality, setQuality] = useState(90),
    [deadline, setDeadline] = useState(2.5),
    [policy, setPolicy] = useState<RoutePolicy>('cascade');
  const [target, setTarget] = useState<AdapterId>('C'),
    [caller, setCaller] = useState<'alpha' | 'beta'>('alpha'),
    [capacity, setCapacity] = useState(6),
    [pinA, setPinA] = useState(true),
    [pinB, setPinB] = useState(false);
  const [gpus, setGpus] = useState(8),
    [price, setPrice] = useState(3),
    [tps, setTps] = useState(10000),
    [busy, setBusy] = useState(40),
    [windowBasis, setWindowBasis] = useState(false),
    [overhead, setOverhead] = useState(0),
    [qualifying, setQualifying] = useState(80);
  const routes = routingPolicies(easy / 100, accuracy / 100, recall / 100, alarm / 100),
    selected = routes.policies.find((p) => p.id === policy)!,
    adapters = adapterAdmission(target, capacity, caller, pinA, pinB),
    econ = servingEconomics(gpus, price, tps, busy / 100, windowBasis, overhead, qualifying / 100);
  const controls: [number, (n: number) => void, string, number, number, number][] =
    kind === 'stack-routing'
      ? [
          [easy, setEasy, 'Easy requests trong fixture (%)', 0, 100, 5],
          [accuracy, setAccuracy, 'Router accuracy mỗi task class (%)', 0, 100, 5],
          [recall, setRecall, 'Verifier recall khi small sai (%)', 0, 100, 5],
          [alarm, setAlarm, 'False escalation khi small đúng (%)', 0, 100, 5],
          [quality, setQuality, 'Synthetic accuracy target (%)', 70, 100, 1],
          [deadline, setDeadline, 'Buffered answer p95 budget (s)', 0.5, 3, 0.1],
        ]
      : kind === 'stack-adapters'
        ? [[capacity, setCapacity, 'Adapter memory budget (GiB)', 4, 8, 1]]
        : [
            [gpus, setGpus, 'GPU count trong cost budget', 1, 16, 1],
            [price, setPrice, 'Giá giả định mỗi GPU-hour ($)', 1, 8, 1],
            [tps, setTps, 'Output tokens/s ở basis đã chọn', 1000, 20000, 1000],
            [busy, setBusy, 'Busy duty fraction (%)', 0, 100, 5],
            [overhead, setOverhead, 'Chi phí khác mỗi giờ ($)', 0, 24, 1],
            [qualifying, setQualifying, 'Output từ requests đạt SLO (%)', 0, 100, 5],
          ];
  const toggle = (label: string, v: boolean, set: (v: boolean) => void) => (
    <label className="worksheet-toggle">
      <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
  const percent = (v: number) => (v * 100).toFixed(2) + '%',
    money = (v: number | null) => (v === null ? 'NONE' : '$' + v.toFixed(2));
  return (
    <section
      ref={ref}
      className="handbook-experiment serving-stack-playground"
      aria-labelledby={id}
    >
      <span className="eyebrow">SERVING STACK / QUALITY, RESIDENCY AND COST</span>
      <h3 id={id}>
        {kind === 'stack-routing'
          ? 'Một verifier yếu có thể làm cascade tệ hơn'
          : kind === 'stack-adapters'
            ? 'Resident adapter vẫn cần đúng tenant và base revision'
            : 'Tính cùng một measurement window, đừng nhân busy hai lần'}
      </h3>
      <p>
        {kind === 'stack-routing'
          ? 'Fixture có hai task classes và joint outcomes của small/large model. Easy: both correct 85%, small-only 5%, large-only 8%, both wrong 2%; hard: 35/10/45/10%. Đây là ground-truth labels giả lập cho offline evaluation, không phải thông tin runtime biết sẵn. Router accuracy giống nhau ở hai classes và độc lập với outcomes trong mỗi class.'
          : 'stack-adapters' === kind
            ? 'Snapshot độc lập mỗi lần đổi control: base v1 đang resident; adapter A/v1/alpha và B/v1/beta có size 2 GiB, C/v1/alpha có size 3 GiB, D/v2/alpha có size 1 GiB. Ban đầu A, B ở GPU; A cũ hơn B theo fixed LRU. Các sizes đều giả định, adapter budget không chứa base weights/KV.'
            : 'Giá và throughput đều giả định. Busy basis: input là output tokens/s trong busy periods, nhân duty fraction để ra whole-window rate. Window basis: input đã đo trên cả window, không nhân duty fraction lần nữa. Qualifying share đếm output thuộc requests đạt SLO đã định nghĩa; không coi GPU utilization là duty fraction.'}
      </p>
      {kind === 'stack-routing' && (
        <div className="stack-actions" role="group" aria-label="Routing policy">
          {(['small', 'large', 'router', 'cascade'] as RoutePolicy[]).map((p) => (
            <button key={p} type="button" aria-pressed={policy === p} onClick={() => setPolicy(p)}>
              {p}
            </button>
          ))}
        </div>
      )}
      {kind === 'stack-adapters' && (
        <>
          <div className="stack-actions" role="group" aria-label="Adapter selection">
            {(['A', 'B', 'C', 'D'] as AdapterId[]).map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={target === a}
                onClick={() => setTarget(a)}
              >
                Adapter {a}
              </button>
            ))}
          </div>
          <div className="stack-actions" role="group" aria-label="Calling tenant">
            {(['alpha', 'beta'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={caller === t}
                onClick={() => setCaller(t)}
              >
                Tenant {t}
              </button>
            ))}
          </div>
        </>
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
      {kind === 'stack-routing' && (
        <>
          <figure className="handbook-table">
            <div
              className="stack-table"
              role="region"
              tabIndex={0}
              aria-label="Routing policies under shared synthetic assumptions"
            >
              <table>
                <thead>
                  <tr>
                    <th>Policy</th>
                    <th>Synthetic accuracy</th>
                    <th>Cost units</th>
                    <th>Mean / p95 seconds</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.policies.map((p) => (
                    <tr key={p.id} data-selected={policy === p.id}>
                      <th scope="row">{p.id}</th>
                      <td>{percent(p.quality)}</td>
                      <td>{p.cost.toFixed(3)}</td>
                      <td>
                        {p.meanSec.toFixed(3)} / {p.p95Sec.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Selected synthetic accuracy</dt>
              <dd>{percent(selected.quality)}</dd>
            </div>
            <div>
              <dt>Selected cost units/request</dt>
              <dd>{selected.cost.toFixed(3)}</dd>
            </div>
            <div>
              <dt>Requests gọi large model</dt>
              <dd>{percent(selected.largeShare)}</dd>
            </div>
            <div>
              <dt>Accuracy / p95 budget met?</dt>
              <dd>
                {selected.quality * 100 + 1e-9 >= quality ? 'YES' : 'NO'} /{' '}
                {selected.p95Sec <= deadline + 1e-9 ? 'YES' : 'NO'}
              </dd>
            </div>
            <div>
              <dt>Cascade recovered / regressed mass</dt>
              <dd className="stack-long-value">
                {percent(routes.recovered)} / {percent(routes.regressed)}
              </dd>
            </div>
            <div>
              <dt>Buffered answer p95</dt>
              <dd>{selected.p95Sec.toFixed(2)} s</dd>
            </div>
          </dl>
          <p className="worksheet-footnote">
            Small costs 1 unit/0.5 s; large 8 units/2 s; router 0.05 unit/0.05 s; verifier 0.2
            unit/0.1 s. Cascade luôn chạy small + verifier, rồi large nếu escalate; large output
            thay small output. p95 là exact quantile của discrete serial paths, không có
            queue/concurrency và không là TTFT/ITL. False escalation có thể đổi small-only correct
            thành wrong. Confidence sliders là synthetic error rates, không phải model tự biết đáp
            án đúng.
          </p>
        </>
      )}
      {kind === 'stack-adapters' && (
        <>
          {toggle('A đang được active request pin', pinA, setPinA)}
          {toggle('B đang được active request pin', pinB, setPinB)}
          <div
            className="stack-adapter-map"
            role="img"
            aria-label="Adapter residency before and after guarded admission"
          >
            <article>
              <h4>Before</h4>
              <p>A/v1/alpha · 2 GiB</p>
              <p>B/v1/beta · 2 GiB</p>
            </article>
            <span aria-hidden="true">→</span>
            <article>
              <h4>After</h4>
              {adapters.resident.map((a) => (
                <p key={a}>
                  Adapter {a} · {a === 'C' ? 3 : 2} GiB
                </p>
              ))}
              <p>
                {adapters.usedGiB} / {capacity} GiB
              </p>
            </article>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Admission result</dt>
              <dd>{adapters.status}</dd>
            </div>
            <div>
              <dt>Evicted adapters</dt>
              <dd>{adapters.evicted.join(', ') || 'NONE'}</dd>
            </div>
            <div>
              <dt>Adapter bytes loaded</dt>
              <dd>{adapters.loadGiB} GiB</dd>
            </div>
            <div>
              <dt>Illustrative transfer + setup</dt>
              <dd>{adapters.transferMs.toFixed(1)} ms</dd>
            </div>
          </dl>
          <p className="worksheet-footnote">
            Kiểm authorization rồi base compatibility trước HIT/load. Plan eviction atomically,
            không evict pinned adapters; WAIT giữ snapshot ban đầu. LOAD chỉ đếm GiB cần đưa lên GPU
            qua link giả định 8 GB/s + 20 ms setup, không gồm download/verification/collective
            initialization. Request refs cần pin exact adapter revision tới safe kernel completion;
            đây chỉ là admission arithmetic.
          </p>
        </>
      )}
      {kind === 'stack-economics' && (
        <>
          {toggle('Input throughput đã là whole-window rate', windowBasis, setWindowBasis)}
          <div
            className="stack-cost-flow"
            role="img"
            aria-label="Hourly cost divided by observed output and qualifying output"
          >
            <span>{money(econ.hourly)} / h</span>
            <span aria-hidden="true">÷</span>
            <span>
              {econ.observedTps.toFixed(0)} output tok/s
              <br />× 3600 s/h
            </span>
            <span aria-hidden="true">×</span>
            <span>1,000,000 tokens</span>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Whole-window output tokens/s</dt>
              <dd>{econ.observedTps.toFixed(0)}</dd>
            </div>
            <div>
              <dt>Output tokens/s từ SLO requests</dt>
              <dd>{econ.sloTps.toFixed(0)}</dd>
            </div>
            <div>
              <dt>Cost / 1M output tokens</dt>
              <dd>{money(econ.millionCost)}</dd>
            </div>
            <div>
              <dt>Cost / 1M SLO-qualified output tokens</dt>
              <dd>{money(econ.sloMillionCost)}</dd>
            </div>
          </dl>
          <p className="worksheet-footnote">
            Cost = hourlySpend / (wholeWindowTokensPerSecond×3600) × 1,000,000. Hourly spend = GPU
            count×GPU hourly price + other hourly cost. SLO denominator chỉ giữ tokens thuộc
            qualifying requests; NONE nghĩa denominator bằng 0. Input/prefill tokens, model
            tokenizers, failed work và provider billing cần báo riêng; đây là internal cost
            arithmetic, không bảng giá API.
          </p>
        </>
      )}
    </section>
  );
}
