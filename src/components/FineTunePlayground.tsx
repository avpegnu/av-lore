import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  adapterBudget,
  tuningExperiment,
  distillationCost,
  type AdaptTarget,
  type TuningGap,
} from '../lib/fine-tune-models';
export default function FineTunePlayground({
  kind,
}: {
  kind: 'tune-plan' | 'tune-budget' | 'tune-cost';
}) {
  const ref = useIslandReady(),
    id = 'fine-tune-' + useId().replace(/:/g, '');
  const [gap, setGap] = useState<TuningGap>('fresh-facts'),
    [measured, setMeasured] = useState(false),
    [data, setData] = useState(false),
    [teacher, setTeacher] = useState(false);
  const [large, setLarge] = useState(false),
    [rank, setRank] = useState(16),
    [targets, setTargets] = useState<AdaptTarget[]>(['q', 'v']),
    [master, setMaster] = useState(true),
    [runtime, setRuntime] = useState(8),
    [capacity, setCapacity] = useState(24);
  const [dailyK, setDailyK] = useState(100),
    [teacherPrice, setTeacherPrice] = useState(4),
    [studentPrice, setStudentPrice] = useState(0.8),
    [fallback, setFallback] = useState(10),
    [setup, setSetup] = useState(2400),
    [ops, setOps] = useState(300);
  const plan = tuningExperiment(gap, measured, data, teacher),
    memory = adapterBudget(large, rank, targets, master, runtime),
    cost = distillationCost(dailyK * 1000, teacherPrice, studentPrice, fallback / 100, setup, ops);
  const gapLabels: Record<TuningGap, string> = {
    'fresh-facts': 'Facts thường đổi / cần evidence',
    retrieval: 'Evidence có nhưng retrieval đang miss',
    format: 'Format / task behavior chưa đạt',
    preferences: 'Preference giữa hai outputs',
    cost: 'Teacher làm tốt nhưng serving tốn kém',
    domain: 'Ngôn ngữ / domain shift',
  };
  const labels: Record<string, string> = {
    'baseline-evaluation': 'Đo baseline trước intervention',
    'define-task-slices': 'Xác định task, slices và acceptance criteria',
    'retrieval-freshness': 'Thử retrieval/freshness cho facts',
    'permission-and-evidence': 'Giữ permission và evidence contract',
    'retrieval-diagnosis': 'Debug ingestion/retrieval trước training',
    'ingest-candidates-packing': 'Trace ingest → candidates → packing',
    'prompt-schema-baseline': 'So sánh prompt/schema baseline',
    'sft-comparison': 'Thử SFT trên reviewed targets và holdout',
    'review-targets-and-holdouts': 'Chuẩn bị targets và independent holdout',
    'preference-comparison': 'So sánh preference tuning với reference policy',
    'review-preference-pairs': 'Review preference pairs và agreement',
    'reference-and-regression-evaluation': 'Kiểm reference, quality regressions và slices',
    'student-distillation': 'Thử student distillation có quality gate',
    'measure-cheaper-baselines': 'Đo các cheaper baselines và teacher quality',
    'routing-cache-and-total-cost': 'So sánh routing/cache và total cost',
    'domain-error-analysis': 'Phân loại domain errors bằng eval',
    'compare-retrieval-sft-cpt': 'So sánh retrieval, SFT và continued pretraining',
    'collect-representative-data': 'Thu thập representative data có provenance',
  };
  const controls: [number, (n: number) => void, string, number, number, number][] =
    kind === 'tune-budget'
      ? [
          [rank, setRank, 'LoRA rank r', 4, 128, 4],
          [runtime, setRuntime, 'Runtime memory do bạn cung cấp (GiB)', 0, 32, 2],
          [capacity, setCapacity, 'Device capacity giả định (GiB)', 16, 96, 8],
        ]
      : kind === 'tune-cost'
        ? [
            [dailyK, setDailyK, 'Requests mỗi ngày (nghìn)', 0, 200, 10],
            [teacherPrice, setTeacherPrice, 'Baseline cost / 1000 requests ($)', 1, 8, 1],
            [studentPrice, setStudentPrice, 'Student cost / 1000 requests ($)', 0.2, 2, 0.2],
            [fallback, setFallback, 'Requests cần chạy thêm baseline (%)', 0, 100, 5],
            [setup, setSetup, 'Chi phí project ban đầu ($)', 0, 10000, 200],
            [ops, setOps, 'Ongoing operations mỗi tháng ($)', 0, 1000, 50],
          ]
        : [];
  const toggle = (label: string, v: boolean, set: (b: boolean) => void) => (
    <label className="worksheet-toggle">
      <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
  const dollars = (n: number) =>
    '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
  return (
    <section ref={ref} className="handbook-experiment fine-tune-playground" aria-labelledby={id}>
      <span className="eyebrow">ADAPTATION / EVIDENCE, STATE AND TOTAL COST</span>
      <h3 id={id}>
        {kind === 'tune-plan'
          ? 'Chọn thử nghiệm theo measured gap'
          : kind === 'tune-budget'
            ? 'Tính trainable state trước peak memory'
            : 'Training rẻ chưa chứng minh total cost rẻ'}
      </h3>
      <p>
        {kind === 'tune-plan'
          ? 'Đây là study decision aid, không auto-approval cho deployment. Chọn gap và evidence đã có để xem next experiment; các phương pháp có thể phối hợp. Không giả định mọi dự án bắt buộc đi qua một cost ladder hoặc fine-tuning chắc chắn sửa được gap.'
          : kind === 'tune-budget'
            ? 'Hai hypothetical dense shapes dùng 32/80 layers, hidden 4096/8192, FFN 14336/28672 và GQA KV width 1024; raw parameter budgets 8B/70B. Đây không phải exact model inventory. BF16 trainable state giả định weights 2B + grads 2B + Adam moments 8B, thêm master copy 4B nếu bật.'
            : 'Mọi giá là giả định cho requests có cùng task mix. Một tháng 30 ngày. Student chạy trước, fallback requests trả thêm toàn bộ baseline cost; ongoing ops tính mỗi tháng. Setup là project cost ban đầu; không phải provider token pricing và không dự đoán task quality.'}
      </p>
      {kind === 'tune-plan' && (
        <>
          <div className="tune-actions" role="group" aria-label="Observed gap">
            {(Object.keys(gapLabels) as TuningGap[]).map((g) => (
              <button type="button" key={g} aria-pressed={gap === g} onClick={() => setGap(g)}>
                {gapLabels[g]}
              </button>
            ))}
          </div>
          {toggle('Đã có representative baseline evaluation', measured, setMeasured)}
          {toggle('Đã review task data và independent holdout', data, setData)}
          {toggle('Teacher đã được chứng minh đạt task target', teacher, setTeacher)}
          <div className="tune-plan-result" role="status">
            <span>{plan.state}</span>
            <h4>{labels[plan.experiment]}</h4>
            <p>{labels[plan.companion]}</p>
          </div>
          <p className="worksheet-footnote">
            Flags là assumptions của tình huống học, không thực hiện eval hoặc kiểm dataset.
            Candidate experiment vẫn cần quality, uncertainty, security, latency và maintenance
            gates. Knowledge freshness, permissions và citation behavior không được chuyển thành lời
            hứa trong model weights.
          </p>
        </>
      )}
      {kind === 'tune-budget' && (
        <div className="tune-actions" role="group" aria-label="Hypothetical model shape">
          <button type="button" aria-pressed={!large} onClick={() => setLarge(false)}>
            8B hypothetical
          </button>
          <button type="button" aria-pressed={large} onClick={() => setLarge(true)}>
            70B hypothetical
          </button>
        </div>
      )}
      <div className="worksheet-inputs">
        {controls.map(([v, set, label, min, max, step]) => (
          <label key={label}>
            {label}
            <output>{Number(v.toFixed(2))}</output>
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
      {kind === 'tune-budget' && (
        <>
          <div className="tune-targets" role="group" aria-label="Adapted projection matrices">
            {(['q', 'k', 'v', 'o', 'gate', 'up', 'down'] as AdaptTarget[]).map((t) => (
              <label key={t}>
                <input
                  type="checkbox"
                  checked={targets.includes(t)}
                  onChange={() =>
                    setTargets((a) => (a.includes(t) ? a.filter((x) => x !== t) : [...a, t]))
                  }
                />
                <strong>{t}</strong>
                <span>
                  {t === 'k' || t === 'v'
                    ? `${memory.hidden} × 1024`
                    : t === 'q' || t === 'o'
                      ? `${memory.hidden} × ${memory.hidden}`
                      : t === 'down'
                        ? `${memory.ff} × ${memory.hidden}`
                        : `${memory.hidden} × ${memory.ff}`}
                </span>
              </label>
            ))}
          </div>
          {toggle('Giữ FP32 master copy cho trainable params', master, setMaster)}
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Trainable LoRA parameters</dt>
              <dd>{memory.trainable.toLocaleString('en-US')}</dd>
            </div>
            <div>
              <dt>BF16 adapter payload</dt>
              <dd>{memory.adapterFileMiB.toFixed(2)} MiB</dd>
            </div>
            <div>
              <dt>Bytes / trainable param</dt>
              <dd>{memory.bytesPerTrainable}</dd>
            </div>
            <div>
              <dt>Có trainable targets?</dt>
              <dd>{memory.hasTargets ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <figure className="handbook-table">
            <div
              className="tune-table"
              role="region"
              aria-label="Training state plus supplied runtime budget"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>Method / assumptions</th>
                    <th>State + supplied runtime</th>
                    <th>≤ supplied device capacity?</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Full BF16 training', memory.fullGiB],
                    ['BF16 frozen-base LoRA', memory.loraGiB],
                    ['4-bit frozen-base LoRA', memory.qloraGiB],
                  ].map(([name, g]) => (
                    <tr key={name}>
                      <th scope="row">{name}</th>
                      <td>{(g as number).toFixed(2)} GiB</td>
                      <td>{(g as number) <= capacity ? 'YES' : 'NO'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <p className="worksheet-footnote">
            LoRA params = layers×sum r(d_in+d_out), chỉ selected matrices. Frozen BF16 base = 2
            bytes/param; 4-bit base = 0.5 bytes/param + one 2-byte scale/128 weights giả định, không
            implementation NF4 đầy đủ. Runtime input là supplied budget, không model dự đoán
            activations/attention/workspaces. YES chưa chứng minh training fit: thực tế cần measured
            peaks, sharding/checkpointing/optimizer support. Adapter payload không gồm optimizer
            checkpoint/file metadata.
          </p>
        </>
      )}
      {kind === 'tune-cost' && (
        <>
          <div className="tune-cost-breakdown">
            <article>
              <h4>Baseline / month</h4>
              <strong>{dollars(cost.baseline)}</strong>
            </article>
            <article>
              <h4>Student + fallback + ops</h4>
              <p>
                {dollars(cost.studentInference)} + {dollars(cost.fallbackCost)} + {dollars(ops)}
              </p>
              <strong>{dollars(cost.monthly)}</strong>
            </article>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Monthly savings giả định</dt>
              <dd>{dollars(cost.savings)}</dd>
            </div>
            <div>
              <dt>Setup break-even</dt>
              <dd>
                {cost.breakEvenDays === null ? 'NONE' : cost.breakEvenDays.toFixed(2) + ' days'}
              </dd>
            </div>
            <div>
              <dt>First-year difference sau setup</dt>
              <dd>{dollars(cost.firstYearDifference)}</dd>
            </div>
            <div>
              <dt>Requests / month</dt>
              <dd>{cost.monthRequests.toLocaleString('en-US')}</dd>
            </div>
          </dl>
          <p className="worksheet-footnote">
            Savings = baseline − (student + fallback + monthlyOps). Break-even days =
            setup/savings×30 khi savings dương; NONE nghĩa không có finite break-even với inputs
            này. Chưa mô phỏng capacity, latency tails, quality regressions, retraining cadence hoặc
            volume drift. Add các cost đó vào project/operations trước quyết định; projected savings
            không là quality approval.
          </p>
        </>
      )}
    </section>
  );
}
