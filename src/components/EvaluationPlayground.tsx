import { useId, useMemo, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  pairedEvaluation,
  judgeOrderProbabilities,
  evaluationGates,
  type PairCounts,
  type EvaluationScenario,
} from '../lib/evaluation-models';

export default function EvaluationPlayground({
  kind,
}: {
  kind: 'eval-pairs' | 'eval-judge' | 'eval-gates';
}) {
  const ref = useIslandReady(),
    id = 'evaluation-' + useId().replace(/:/g, '');
  const [counts, setCounts] = useState<PairCounts>({ both: 50, gain: 12, loss: 8, neither: 30 });
  const [truth, setTruth] = useState(0.6),
    [bias, setBias] = useState(0.4),
    [accuracy, setAccuracy] = useState(0.8);
  const [scenario, setScenario] = useState<EvaluationScenario>('slice-regression'),
    [minimum, setMinimum] = useState(30),
    [calibrated, setCalibrated] = useState(true),
    [records, setRecords] = useState(true),
    [reviewed, setReviewed] = useState(false);
  const pair = useMemo(() => pairedEvaluation(counts), [counts]),
    judge = judgeOrderProbabilities(truth, bias, accuracy),
    gate = evaluationGates(scenario, minimum, calibrated, records, reviewed);
  const p = (v: number) => (100 * v).toFixed(1) + '%',
    pp = (v: number) => (v > 0 ? '+' : '') + (100 * v).toFixed(1) + ' pp';
  const labels: Record<keyof PairCounts, string> = {
    both: 'Cả hai pass',
    gain: 'Chỉ candidate pass',
    loss: 'Chỉ baseline pass',
    neither: 'Cả hai fail',
  };
  const histogram = Array.from({ length: 21 }, () => 0);
  const axis = pair
    ? Math.max(0.1, Math.ceil(Math.max(...pair.samples.map(Math.abs)) / 0.05) * 0.05)
    : 0.1;
  if (pair)
    for (const v of pair.samples)
      histogram[Math.min(20, Math.max(0, Math.round(((v + axis) / (2 * axis)) * 20)))]++;
  const peak = Math.max(...histogram, 1),
    pos = (v: number) => ((v + axis) / (2 * axis)) * 100;
  const slider = (
    label: string,
    v: number,
    set: (v: number) => void,
    min: number,
    max: number,
    step: number,
    percent = false,
  ) => (
    <label key={label}>
      {label}
      <output>{percent ? p(v) : v}</output>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => set(+e.target.value)}
      />
    </label>
  );
  const toggle = (label: string, v: boolean, set: (b: boolean) => void) => (
    <label className="worksheet-toggle">
      <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
  return (
    <section ref={ref} className="handbook-experiment evaluation-playground" aria-labelledby={id}>
      <span className="eyebrow">EVALUATION / MEASURE, QUALIFY, MONITOR</span>
      <h3 id={id}>
        {kind === 'eval-pairs'
          ? 'Cùng điểm trung bình, khác paired uncertainty'
          : kind === 'eval-judge'
            ? 'Đổi thứ tự để thấy bias, không để giấu disagreement'
            : 'Điểm tổng tăng chưa đủ vượt quality gates'}
      </h3>
      <p>
        {kind === 'eval-pairs'
          ? 'Chỉnh số case trong bốn nhóm của cùng một bộ paired outcomes. Lab thực hiện 2000 percentile bootstrap resamples của case gốc, với seed cố định; mỗi case là một đơn vị độc lập theo giả định. Đây là dữ liệu minh họa, không chạy model thật.'
          : kind === 'eval-judge'
            ? 'Mô hình xác suất minh họa: mỗi lần judge chọn answer đứng đầu với xác suất b; nếu không, nó chọn true winner với xác suất q. Hai lượt độc lập conditional on true winner. Không gọi LLM, không dự đoán bias của một model thật; true winner chỉ được biết trong fixture này.'
            : 'Fixture có hai slices, cùng baseline/candidate cases và threshold minh họa −5 pp cho observed quality drop. Sample-count floor chỉ là policy input, không là power analysis. Các flags là assumptions, không tự chạy calibration, holdout hoặc kiểm telemetry.'}
      </p>
      {kind === 'eval-pairs' && (
        <>
          <div className="eval-actions" role="group" aria-label="Paired outcome presets">
            <button
              type="button"
              onClick={() => setCounts({ both: 50, gain: 12, loss: 8, neither: 30 })}
            >
              Nhiều discordant pairs
            </button>
            <button
              type="button"
              onClick={() => setCounts({ both: 58, gain: 4, loss: 0, neither: 38 })}
            >
              Cùng scores, ít discordance
            </button>
            <button
              type="button"
              onClick={() => setCounts({ both: 50, gain: 0, loss: 0, neither: 50 })}
            >
              Không observed differences
            </button>
          </div>
          <div className="worksheet-inputs">
            {(Object.keys(labels) as (keyof PairCounts)[]).map((key) =>
              slider(
                labels[key],
                counts[key],
                (v) => setCounts((c) => ({ ...c, [key]: v })),
                0,
                80,
                2,
              ),
            )}
          </div>
          <div className="eval-outcomes" aria-label="Observed paired case counts">
            {(Object.keys(labels) as (keyof PairCounts)[]).map((key) => (
              <article key={key}>
                <h4>{labels[key]}</h4>
                <strong>{counts[key]}</strong>
                <span>{key === 'gain' ? '+1' : key === 'loss' ? '−1' : '0'} delta / case</span>
              </article>
            ))}
          </div>
          {pair ? (
            <>
              <dl className="worksheet-results" aria-live="polite">
                <div>
                  <dt>Baseline pass rate</dt>
                  <dd>{p(pair.baseline)}</dd>
                </div>
                <div>
                  <dt>Candidate pass rate</dt>
                  <dd>{p(pair.candidate)}</dd>
                </div>
                <div>
                  <dt>Observed B − A</dt>
                  <dd>{pp(pair.delta)}</dd>
                </div>
                <div>
                  <dt>Paired cases / discordant</dt>
                  <dd>
                    {pair.n} / {pair.discordant}
                  </dd>
                </div>
              </dl>
              <figure
                className="eval-bootstrap"
                aria-label="Paired bootstrap distribution and percentile interval"
              >
                <figcaption>
                  95% percentile bootstrap interval:{' '}
                  <strong>
                    {pp(pair.lo)} → {pp(pair.hi)}
                  </strong>
                </figcaption>
                <div className="eval-histogram" aria-hidden="true">
                  {histogram.map((n, i) => (
                    <i key={i} style={{ height: (n / peak) * 100 + '%' }} />
                  ))}
                </div>
                <div className="eval-interval" aria-hidden="true">
                  <i
                    style={{ left: pos(pair.lo) + '%', width: pos(pair.hi) - pos(pair.lo) + '%' }}
                  />
                  <b style={{ left: pos(pair.delta) + '%' }} />
                </div>
                <div className="eval-axis">
                  <span>{pp(-axis)}</span>
                  <span>0 pp</span>
                  <span>{pp(axis)}</span>
                </div>
                <p>
                  {pair.degenerate
                    ? 'DEGENERATE: resampling không tạo thêm failure modes chưa có trong sample. Khoảng hẹp hoặc [0,0] không chứng minh hai hệ thống tương đương trên population.'
                    : 'Khoảng này mô tả uncertainty theo paired resampling assumptions. Bao gồm 0 không chứng minh không có effect; loại 0 không tự chứng minh practical value, absence of bias hoặc đủ điều kiện deploy.'}
                </p>
              </figure>
            </>
          ) : (
            <p role="status">NO_DATA: thêm cases trước khi tính rates hoặc interval.</p>
          )}
          <p className="worksheet-footnote">
            Không nhân bản cùng case để giả tăng sample size. Với nhiều lượt từ cùng user/document,
            chọn cluster-resampling hoặc thiết kế phù hợp. Lab không bao gồm judge error, dataset
            bias, multiple comparisons, uncertainty do repeated model sampling hoặc production
            drift.
          </p>
        </>
      )}
      {kind === 'eval-judge' && (
        <>
          <div className="worksheet-inputs">
            {slider('Tỷ lệ fixture có B là true winner', truth, setTruth, 0.2, 0.8, 0.05, true)}
            {slider('Xác suất chọn answer đầu theo vị trí b', bias, setBias, 0, 1, 0.1, true)}
            {slider('Độ chính xác khi dùng nội dung q', accuracy, setAccuracy, 0.5, 1, 0.05, true)}
          </div>
          <div className="eval-judge-bars">
            {[
              ['B đứng đầu', judge.first],
              ['B đứng thứ hai', judge.second],
              ['Trung bình hai thứ tự', judge.orderAverage],
            ].map(([label, value]) => (
              <article key={label as string}>
                <h4>{label}</h4>
                <div>
                  <i style={{ width: (value as number) * 100 + '%' }} />
                  <b style={{ left: truth * 100 + '%' }} />
                </div>
                <strong>{p(value as number)}</strong>
              </article>
            ))}
          </div>
          <p className="worksheet-footnote">
            Vạch đứng = tỷ lệ true B trong fixture. Trung bình thứ tự có thể giảm position effect
            nhưng không sửa mọi content error, verbosity bias, prompt injection hoặc correlated
            judge mistakes.
          </p>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>B thắng cả hai / toàn bộ pairs</dt>
              <dd>{p(judge.bothB)}</dd>
            </div>
            <div>
              <dt>A thắng cả hai / toàn bộ pairs</dt>
              <dd>{p(judge.bothA)}</dd>
            </div>
            <div>
              <dt>Unresolved / toàn bộ pairs</dt>
              <dd>{p(judge.unresolved)}</dd>
            </div>
            <div>
              <dt>B wins / consistent-only subset</dt>
              <dd>{judge.consistentOnlyB === null ? 'NONE' : p(judge.consistentOnlyB)}</dd>
            </div>
          </dl>
          <p>
            Không loại unresolved pairs khỏi báo cáo rồi gọi consistent-only rate là truth.
            Disagreement không đồng nghĩa hai answers ngang chất lượng. Giữ denominator, review
            disagreement và calibrate bằng human-labeled task slices; chính humans cũng có
            uncertainty và disagreement.
          </p>
        </>
      )}
      {kind === 'eval-gates' && (
        <>
          <div className="eval-actions" role="group" aria-label="Evaluation release scenarios">
            {(['slice-regression', 'privacy-failure', 'clean'] as EvaluationScenario[]).map((s) => (
              <button
                type="button"
                key={s}
                aria-pressed={scenario === s}
                onClick={() => setScenario(s)}
              >
                {s === 'slice-regression'
                  ? 'Average tăng, enterprise giảm'
                  : s === 'privacy-failure'
                    ? 'Quality tăng, có unauthorized disclosure'
                    : 'Không observed gate failure'}
              </button>
            ))}
          </div>
          <div className="worksheet-inputs">
            {slider('Minimum cases / slice theo policy', minimum, setMinimum, 10, 50, 10)}
          </div>
          {toggle('Judge đã được calibrate cho task slices', calibrated, setCalibrated)}
          {toggle('Run records đầy đủ, không silently drop lỗi', records, setRecords)}
          {toggle('Đã review uncertainty và independent holdout', reviewed, setReviewed)}
          <figure className="handbook-table">
            <div
              className="eval-table"
              role="region"
              aria-label="Quality per slice and combined score"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>Slice</th>
                    <th>Cases</th>
                    <th>Baseline</th>
                    <th>Candidate</th>
                    <th>Observed delta</th>
                  </tr>
                </thead>
                <tbody>
                  {gate.slices.map((s) => (
                    <tr key={s.name}>
                      <th scope="row">{s.name}</th>
                      <td>{s.n}</td>
                      <td>
                        {s.a}/{s.n}
                      </td>
                      <td>
                        {s.b}/{s.n}
                      </td>
                      <td>{pp((s.b - s.a) / s.n)}</td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row">Combined</th>
                    <td>100</td>
                    <td>{gate.slices.reduce((n, s) => n + s.a, 0)}/100</td>
                    <td>{gate.slices.reduce((n, s) => n + s.b, 0)}/100</td>
                    <td>{pp(gate.overallDelta)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </figure>
          <div className="eval-gate-status" role="status">
            <strong>{gate.state}</strong>
            <p>
              Observed disclosure events: {scenario === 'privacy-failure' ? 1 : 0} · policy maximum:
              0
            </p>
            <h4>Failed gates</h4>
            <p>{gate.failures.join(' · ') || 'NONE'}</p>
            <h4>Missing evidence</h4>
            <p>{gate.missingEvidence.join(' · ') || 'NONE'}</p>
          </div>
          <p className="worksheet-footnote">
            CANARY_CANDIDATE chỉ là trạng thái của fixture, chưa là quyết định deploy. Thực tế còn
            có paired intervals, severity, label quality, latency/cost và online guardrails;
            threshold phải định trước theo risk. Không hạ sample floor sau khi xem kết quả chỉ để
            vượt gate.
          </p>
        </>
      )}
    </section>
  );
}
