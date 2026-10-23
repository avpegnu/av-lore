import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  prefillInterference,
  speculativeMass,
  speculativeCost,
  splitServing,
} from '../lib/llm-scheduling-models';
export default function LlmSchedulingPlayground({
  kind,
}: {
  kind: 'batch-interference' | 'spec-mass' | 'spec-cost' | 'batch-handoff';
}) {
  const ref = useIslandReady(),
    id = 'llm-schedule-' + useId().replace(/:/g, '');
  const [promptKi, setPromptKi] = useState(8),
    [chunk, setChunk] = useState(1024),
    [streams, setStreams] = useState(2),
    [gapBudget, setGapBudget] = useState(20),
    [chunked, setChunked] = useState(true),
    [decodeOnly, setDecodeOnly] = useState(false);
  const [qa, setQa] = useState(1),
    [qb, setQb] = useState(1),
    [qc, setQc] = useState(8),
    [residual, setResidual] = useState(true);
  const [alphaPct, setAlphaPct] = useState(80),
    [gamma, setGamma] = useState(4),
    [draftMs, setDraftMs] = useState(1),
    [extraMs, setExtraMs] = useState(1),
    [draftGiB, setDraftGiB] = useState(4);
  const [kvGiB, setKvGiB] = useState(4),
    [link, setLink] = useState(32),
    [monoQueue, setMonoQueue] = useState(20),
    [splitQueue, setSplitQueue] = useState(5),
    [ttftBudget, setTtftBudget] = useState(150);
  const history = prefillInterference(
      promptKi * 1024,
      chunk,
      streams,
      decodeOnly ? 'decode-only' : chunked ? 'chunked' : 'monolithic',
    ),
    mass = speculativeMass([0.6, 0.3, 0.1], [qa, qb, qc], residual),
    cost = speculativeCost(alphaPct / 100, gamma, draftMs, extraMs, draftGiB),
    handoff = splitServing(kvGiB, link, monoQueue, splitQueue, ttftBudget);
  const inputs: [number, (n: number) => void, string, number, number, number][] =
    kind === 'batch-interference'
      ? [
          [promptKi, setPromptKi, 'Độ dài prompt (Ki tokens)', 2, 16, 2],
          [chunk, setChunk, 'Tokens mỗi prefill chunk', 256, 4096, 256],
          [streams, setStreams, 'Decode streams hiện có', 1, 8, 1],
          [gapBudget, setGapBudget, 'Gap target lớn nhất (ms)', 10, 50, 5],
        ]
      : kind === 'spec-mass'
        ? [
            [qa, setQa, 'Draft weight A', 0, 10, 1],
            [qb, setQb, 'Draft weight B', 0, 10, 1],
            [qc, setQc, 'Draft weight C', 0, 10, 1],
          ]
        : kind === 'spec-cost'
          ? [
              [alphaPct, setAlphaPct, 'Acceptance giả định (%)', 0, 100, 5],
              [gamma, setGamma, 'Độ dài draft γ (0 = tắt)', 0, 8, 1],
              [draftMs, setDraftMs, 'Cost mỗi draft step (ms)', 0, 5, 1],
              [extraMs, setExtraMs, 'Verify cost thêm / draft (ms)', 0, 12, 1],
              [draftGiB, setDraftGiB, 'Memory thêm cho draft (GiB)', 0, 8, 1],
            ]
          : [
              [kvGiB, setKvGiB, 'KV payload (GiB)', 1, 8, 1],
              [link, setLink, 'Transfer hiệu dụng (GB/s)', 16, 256, 16],
              [monoQueue, setMonoQueue, 'Queue colocated (ms)', 0, 200, 10],
              [splitQueue, setSplitQueue, 'Queue ở mỗi split pool (ms)', 0, 50, 5],
              [ttftBudget, setTtftBudget, 'TTFT budget (ms)', 100, 300, 10],
            ];
  const pc = (n: number) => (n * 100).toFixed(1) + '%';
  return (
    <section
      ref={ref}
      className="handbook-experiment llm-scheduling-playground"
      aria-labelledby={id}
    >
      <span className="eyebrow">LLM SCHEDULING / LATENCY AND EXACT SAMPLING</span>
      <h3 id={id}>
        {kind === 'batch-interference'
          ? 'Chunk nhỏ bảo vệ stream nhưng có thêm overhead'
          : kind === 'spec-mass'
            ? 'Reject rồi sample lại từ target vẫn có thể bị bias'
            : kind === 'spec-cost'
              ? 'Accept nhiều chưa chắc tổng chi phí rẻ hơn'
              : 'Tách pools phải trả KV handoff và thêm queues'}
      </h3>
      <p>
        {kind === 'batch-interference'
          ? 'Các decode streams có sẵn tiếp tục chạy và không hoàn tất trong fixture. Một prompt mới chờ prefill. Mỗi iteration giả định 2 ms overhead + 1 ms/stream + prefillTokens/128 ms; first token của prompt mới có ở cuối prefill. Mọi stream cũ phát một token khi iteration kết thúc.'
          : kind === 'spec-mass'
            ? 'Tại một token position, target P(A/B/C) = 60/30/10%. Ba sliders là weights không chuẩn hóa của draft Q. Bảng tính exact probability mass cho accept branch và reject branch, không dùng Monte Carlo; ba weights bằng 0 là distribution không hợp lệ.'
            : kind === 'spec-cost'
              ? 'Fixture giả định acceptance độc lập với cùng xác suất α ở mỗi position, output đủ dài và chưa gặp EOS/stop. Baseline là 20 ms/token; verify tốn 20 + γ×extra ms, draft tốn γ×draftStep, thêm 2 ms bookkeeping khi bật. Đây là expected single-sequence arithmetic, không phải loaded throughput benchmark.'
              : 'Colocated TTFT = queue + 70 ms prefill + 20 ms first decode. Split TTFT = queue + 40 ms prefill + KV transfer + queue + 12 ms decode. Transfer tính binary GiB qua decimal GB/s và 2 ms overhead. TPOT giả định colocated 25 ms, split 12 ms; target TPOT là 20 ms. Các constants đều giả lập.'}
      </p>
      <div className="worksheet-inputs">
        {inputs.map(([v, set, label, min, max, step]) => (
          <label key={label}>
            {label}
            <output>{v.toLocaleString('en-US')}</output>
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
      {kind === 'batch-interference' && (
        <>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={chunked}
              onChange={(e) => setChunked(e.target.checked)}
            />
            Chia prompt thành chunks
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={decodeOnly}
              onChange={(e) => setDecodeOnly(e.target.checked)}
            />
            Chỉ chạy decode: để prompt mới chờ
          </label>
          <figure className="handbook-table">
            <div
              className="llm-iteration-table"
              role="region"
              tabIndex={0}
              aria-label="Scheduler iteration history"
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Iteration</th>
                    <th scope="col">Prefill tokens</th>
                    <th scope="col">Decode tokens</th>
                    <th scope="col">Duration ms</th>
                    <th scope="col">Prompt left</th>
                  </tr>
                </thead>
                <tbody>
                  {history.iterations.map((i) => (
                    <tr key={i.index}>
                      <th scope="row">{i.index}</th>
                      <td>{i.prefill}</td>
                      <td>{i.decodeTokens}</td>
                      <td>{i.duration.toFixed(1)}</td>
                      <td>{i.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <div className="llm-iteration-bars" aria-hidden="true">
            {history.iterations.map((i) => (
              <i key={i.index} style={{ height: Math.min(100, (i.duration / 100) * 100) + '%' }} />
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>First token của prompt</dt>
              <dd>
                {history.firstTokenMs === null ? 'WAIT' : history.firstTokenMs.toFixed(1) + ' ms'}
              </dd>
            </div>
            <div>
              <dt>Decode gap lớn nhất</dt>
              <dd>{history.maxDecodeGap.toFixed(1)} ms</dd>
            </div>
            <div>
              <dt>Đạt gap target?</dt>
              <dd>{history.maxDecodeGap <= gapBudget ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Prompt tokens đã xử lý</dt>
              <dd>{history.promptProcessed}</dd>
            </div>
          </dl>
          <p className="muted">
            Decode-only chỉ hiển thị 8 iterations để thấy starvation, không chứng minh prompt sẽ
            tiến về sau. Max gap là một inter-token-latency metric; TPOT trung bình có thể che
            spike. Cost cố định bỏ qua context-dependent attention, GPU kernels, memory/queue
            contention và preemption; token cap không tự bảo đảm latency bound thật.
          </p>
        </>
      )}
      {kind === 'spec-mass' && (
        <>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={residual}
              onChange={(e) => setResidual(e.target.checked)}
            />
            Reject dùng normalized positive residual (P − Q)
          </label>
          {mass ? (
            <>
              <figure className="handbook-table">
                <div role="region" tabIndex={0} aria-label="Exact speculative probability mass">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Token</th>
                        <th scope="col">Target P</th>
                        <th scope="col">Draft Q</th>
                        <th scope="col">Accepted mass</th>
                        <th scope="col">Reject distribution</th>
                        <th scope="col">Output mass</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['A', 'B', 'C'].map((token, i) => (
                        <tr key={token}>
                          <th scope="row">{token}</th>
                          <td>{pc(mass.target[i])}</td>
                          <td>{pc(mass.draft[i])}</td>
                          <td>{pc(mass.accepted[i])}</td>
                          <td>{pc(mass.correction[i])}</td>
                          <td>{pc(mass.output[i])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </figure>
              <div className="llm-mass-bars">
                {['A', 'B', 'C'].map((token, i) => (
                  <article key={token}>
                    <strong>{token}</strong>
                    <div>
                      <span>P {pc(mass.target[i])}</span>
                      <i style={{ width: pc(mass.target[i]) }} />
                    </div>
                    <div>
                      <span>OUT {pc(mass.output[i])}</span>
                      <i style={{ width: pc(mass.output[i]) }} />
                    </div>
                  </article>
                ))}
              </div>
              <dl className="worksheet-results" aria-live="polite">
                <div>
                  <dt>Xác suất accept</dt>
                  <dd>{pc(mass.acceptance)}</dd>
                </div>
                <div>
                  <dt>Xác suất reject</dt>
                  <dd>{pc(mass.rejection)}</dd>
                </div>
                <div>
                  <dt>TV distance: output / target</dt>
                  <dd>{pc(mass.totalVariation)}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="llm-invalid-distribution" role="status">
              INVALID Q: tổng draft weights phải lớn hơn 0.
            </p>
          )}
          <p className="muted">
            TV = 0.5×sum|output − P|; 0 là trùng distribution trong fixture. P và Q phải là
            distributions sau relevant sampling transforms trên cùng conditioned context. Với
            Q(x)=0, draft không đề xuất token đó nhưng residual vẫn có thể tạo nó. Khi P=Q thì
            reject probability bằng 0, nên residual không cần dùng. Equality của distribution không
            đồng nghĩa cùng random seed sẽ tạo cùng sample path.
          </p>
        </>
      )}
      {kind === 'spec-cost' && (
        <>
          <figure className="handbook-table">
            <div role="region" tabIndex={0} aria-label="Speculative length trade-offs">
              <table>
                <thead>
                  <tr>
                    <th scope="col">γ</th>
                    <th scope="col">Expected tokens</th>
                    <th scope="col">Cycle ms</th>
                    <th scope="col">Speed vs baseline</th>
                  </tr>
                </thead>
                <tbody>
                  {cost.choices.map((c) => (
                    <tr key={c.gamma} data-selected={c.gamma === gamma}>
                      <th scope="row">{c.gamma}</th>
                      <td>{c.expectedTokens.toFixed(3)}</td>
                      <td>{c.cycleMs.toFixed(1)}</td>
                      <td>{c.speedup.toFixed(2)}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Expected tokens / target call</dt>
              <dd>{cost.expectedTokens.toFixed(3)}</dd>
            </div>
            <div>
              <dt>Thời gian chu kỳ</dt>
              <dd>{cost.cycleMs.toFixed(1)} ms</dd>
            </div>
            <div>
              <dt>Speed ratio cho một sequence</dt>
              <dd>{cost.speedup.toFixed(2)}×</dd>
            </div>
            <div>
              <dt>KV slots: bật / baseline</dt>
              <dd>
                {cost.slots} / {cost.baselineSlots}
              </dd>
            </div>
            <div>
              <dt>γ tốt nhất còn fit trong fixture</dt>
              <dd>{cost.best.gamma}</dd>
            </div>
            <div>
              <dt>Request hiện tại còn fit?</dt>
              <dd>{cost.canAdmit ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <p className="muted">
            E[tokens] = 1 + α + … + α^γ, không phải α×γ. KV fixture có 8 GiB còn lại và 1
            GiB/sequence; draft memory trừ vào đó khi γ&gt;0. Memory slots không là throughput
            estimate. Best γ tối ưu latency arithmetic trong các lựa chọn còn ít nhất một slot, chưa
            là production goodput policy. Request đang chọn không thể admit nếu hết slot dù speed
            ratio đẹp.
          </p>
        </>
      )}
      {kind === 'batch-handoff' && (
        <>
          <div className="llm-handoff-stages">
            {[
              ['COLOCATED', handoff.monolithic],
              ['SPLIT', handoff.split],
            ].map(([label, parts]) => (
              <article key={String(label)}>
                <strong>{String(label)}</strong>
                <ol>
                  {(parts as number[]).map((ms, i) => (
                    <li key={i}>
                      <span>{i + 1}</span>
                      <b>{ms.toFixed(1)} ms</b>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Chỉ riêng KV transfer</dt>
              <dd>{handoff.transferMs.toFixed(1)} ms</dd>
            </div>
            <div>
              <dt>TTFT: colocated / split</dt>
              <dd>
                {handoff.monolithicTtft.toFixed(1)} / {handoff.splitTtft.toFixed(1)} ms
              </dd>
            </div>
            <div>
              <dt>Colocated đạt cả hai?</dt>
              <dd>{handoff.monolithicMeetsBoth ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Split đạt cả hai?</dt>
              <dd>{handoff.splitMeetsBoth ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <p className="muted">
            Stages split: prefill queue → prefill → transfer → decode queue → first decode. Đây là
            serial/no-overlap fixture với fixed TPOT, không rate/goodput simulator. Chọn deployment
            phải đo contention, transfer overlap, pool imbalance, memory duplication, failover và
            nhiều requests; bandwidth cao không xóa các queues.
          </p>
        </>
      )}
    </section>
  );
}
