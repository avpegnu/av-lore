import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  tinyCandidates,
  tinyDecode,
  tinyLanguage,
  tinyVocab,
  extractionPresets,
  extractionCheck,
  newTicketFixture,
  closeTicketFixture,
  type ExtractionPreset,
  type TicketFixture,
} from '../lib/prompt-contract-models';
export default function PromptContractPlayground({
  kind,
}: {
  kind: 'prompt-grammar' | 'prompt-validation' | 'prompt-tools';
}) {
  const ref = useIslandReady(),
    id = 'prompt-contract-' + useId().replace(/:/g, '');
  const [constrained, setConstrained] = useState(true),
    [budget, setBudget] = useState(16),
    [step, setStep] = useState(0);
  const [preset, setPreset] = useState<ExtractionPreset>('semantic'),
    [complete, setComplete] = useState(true);
  const [caller, setCaller] = useState<'alpha' | 'beta'>('alpha'),
    [blockers, setBlockers] = useState(0),
    [expected, setExpected] = useState(7),
    [key, setKey] = useState('k1'),
    [lose, setLose] = useState(true),
    [state, setState] = useState<TicketFixture>(newTicketFixture),
    [result, setResult] = useState('READY');
  const decoded = tinyDecode(constrained, budget),
    shown = Math.min(step, decoded.history.length - 1),
    current = decoded.history[Math.max(0, shown)],
    candidates = tinyCandidates(current?.prefix || ''),
    validation = extractionCheck(preset, complete);
  const toggle = (label: string, v: boolean, set: (b: boolean) => void) => (
    <label className="worksheet-toggle">
      <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
  function submit() {
    const x = closeTicketFixture(state, caller, blockers, expected, key);
    setState(x.state);
    setResult(x.result === 'COMMITTED' && lose ? 'COMMITTED_RESPONSE_LOST' : x.result);
  }
  return (
    <section
      ref={ref}
      className="handbook-experiment prompt-contract-playground"
      aria-labelledby={id}
    >
      <span className="eyebrow">PROMPT CONTRACT / STRUCTURE, TRUTH AND AUTHORITY</span>
      <h3 id={id}>
        {kind === 'prompt-grammar'
          ? 'Một token có thể đi qua nhiều grammar boundaries'
          : kind === 'prompt-validation'
            ? 'Đúng schema vẫn có thể sai dữ liệu nguồn'
            : 'Tool proposal không cấp quyền thực thi'}
      </h3>
      <p>
        {kind === 'prompt-grammar'
          ? 'Fixture chỉ có sáu strings hợp lệ: fixed key order, status ok/error và count 0/1/2. Vocabulary gồm text pieces giả lập và character fallbacks, không là tokenizer thật. Một piece được phép khi prefix mới vẫn là prefix của ít nhất một string hợp lệ; EOS chỉ được phép sau complete string. Greedy scores được viết sẵn, không chạy model.'
          : kind === 'prompt-validation'
            ? 'Trusted source của fixture: ticket T42 đang open, priority 2. Schema yêu cầu ticket_id string, status open/closed và priority integer 1..3; đúng ba fields, không extra properties. Validation là handwritten check riêng cho fixture, không general JSON Schema implementation; chỉ dùng các presets đã nêu.'
            : 'Backend giả lập có ticket T42 của tenant alpha, version 7, chưa closed. Proposal luôn yêu cầu close T42 với expected version. Server kiểm caller, durable receipt, version và blocker count trước effect. Receipt và effect commit trong một atomic state transition giả định; không gửi network requests hay sửa dữ liệu thật.'}
      </p>
      {kind === 'prompt-grammar' && (
        <>
          {toggle('Bật grammar mask', constrained, (v) => {
            setConstrained(v);
            setStep(0);
          })}
          <div className="worksheet-inputs">
            <label>
              Ngân sách generation steps<output>{budget}</output>
              <input
                type="range"
                min={2}
                max={20}
                step={1}
                value={budget}
                onChange={(e) => {
                  setBudget(+e.target.value);
                  setStep(0);
                }}
              />
            </label>
          </div>
          <div className="prompt-actions">
            <button
              type="button"
              disabled={shown <= 0}
              onClick={() => setStep(Math.max(0, shown - 1))}
            >
              ← Bước trước
            </button>
            <span>
              {shown + 1} / {decoded.history.length}
            </span>
            <button
              type="button"
              disabled={shown >= decoded.history.length - 1}
              onClick={() => setStep(shown + 1)}
            >
              Bước tiếp →
            </button>
            <button type="button" onClick={() => setStep(decoded.history.length - 1)}>
              Xem bước cuối
            </button>
          </div>
          <div className="prompt-prefix">
            <span>Prefix trước bước đang chọn</span>
            <pre>
              <code>{current?.prefix || '∅'}</code>
            </pre>
            <span>Text piece được chọn</span>
            <pre>
              <code>{JSON.stringify(current?.token)}</code>
            </pre>
          </div>
          <figure className="handbook-table">
            <div
              className="prompt-candidate-table"
              role="region"
              aria-label="Synthetic vocabulary scores and grammar masks"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>Text piece</th>
                    <th>Scripted logit</th>
                    <th>Grammar cho phép?</th>
                    <th>Mask áp dụng</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.token} data-chosen={current?.token === c.token}>
                      <th scope="row">
                        <code>{JSON.stringify(c.token)}</code>
                      </th>
                      <td>{c.logit.toFixed(2)}</td>
                      <td>{c.allowed ? 'YES' : 'NO'}</td>
                      <td>{constrained && !c.allowed ? '−∞' : 'KEEP'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <div className="prompt-prefix">
            <span>Output sau generation budget</span>
            <pre>
              <code>{decoded.prefix}</code>
            </pre>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Kết thúc generation</dt>
              <dd>{decoded.reason}</dd>
            </div>
            <div>
              <dt>String hợp lệ đã hoàn chỉnh?</dt>
              <dd>{decoded.complete ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Allowed / vocabulary tại bước này</dt>
              <dd>
                {current?.allowed} / {tinyVocab.length}
              </dd>
            </div>
            <div>
              <dt>Số strings hoàn chỉnh được phép</dt>
              <dd>{tinyLanguage.length}</dd>
            </div>
          </dl>
          <p className="worksheet-footnote">
            Masking removes incompatible pieces before sampling; real engines also account for
            tokenizer bytes and their supported grammar. A finite-language prefix filter is used
            here instead of a general grammar compiler. Smaller generation limits can stop at a
            valid prefix that is not complete JSON. Local masks constrain structure, not factual
            correctness or tool permissions.
          </p>
        </>
      )}
      {kind === 'prompt-validation' && (
        <>
          <div className="prompt-actions" role="group" aria-label="Extraction output presets">
            {(Object.keys(extractionPresets) as ExtractionPreset[]).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={preset === p}
                onClick={() => setPreset(p)}
              >
                {p}
              </button>
            ))}
          </div>
          {toggle('Envelope báo generation hoàn tất', complete, setComplete)}
          <pre>
            <code>{extractionPresets[preset]}</code>
          </pre>
          <ol className="prompt-validation-flow">
            <li>
              <strong>Envelope / refusal</strong>
              <span>{validation.envelope ? 'CONTINUE' : validation.result}</span>
            </li>
            <li>
              <strong>JSON parsing</strong>
              <span>{!validation.envelope ? 'SKIPPED' : validation.parse ? 'PASS' : 'FAIL'}</span>
            </li>
            <li>
              <strong>Schema check</strong>
              <span>{!validation.parse ? 'SKIPPED' : validation.schema ? 'PASS' : 'FAIL'}</span>
            </li>
            <li>
              <strong>Đối chiếu trusted source</strong>
              <span>
                {!validation.schema ? 'SKIPPED' : validation.truth ? 'MATCH' : 'MISMATCH'}
              </span>
            </li>
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Kết quả validation</dt>
              <dd className="prompt-long-value">{validation.result}</dd>
            </div>
            <div>
              <dt>Đạt schema và đúng fixture?</dt>
              <dd>{validation.schema && validation.truth ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <p className="worksheet-footnote">
            Refusal là envelope outcome riêng trong preset; không thử parse refusal text thành
            domain object. Không salvage JSON bằng cách cắt từ dấu ngoặc đầu/cuối. Schema có thể
            accept status closed, còn trusted fixture cho biết status open. Với tác vụ không có
            nguồn chân lý đáng tin, semantic correctness cần eval/evidence riêng; schema validator
            không tự biết câu trả lời đúng.
          </p>
        </>
      )}
      {kind === 'prompt-tools' && (
        <>
          <div className="prompt-actions" role="group" aria-label="Tool caller">
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
          <div className="prompt-actions" role="group" aria-label="Logical operation key">
            {['k1', 'k2'].map((k) => (
              <button key={k} type="button" aria-pressed={key === k} onClick={() => setKey(k)}>
                Key {k}
              </button>
            ))}
          </div>
          <div className="worksheet-inputs">
            <label>
              Số blockers chưa xử lý<output>{blockers}</output>
              <input
                type="range"
                min={0}
                max={2}
                step={1}
                value={blockers}
                onChange={(e) => setBlockers(+e.target.value)}
              />
            </label>
            <label>
              Expected version của proposal<output>{expected}</output>
              <input
                type="range"
                min={6}
                max={8}
                step={1}
                value={expected}
                onChange={(e) => setExpected(+e.target.value)}
              />
            </label>
          </div>
          {toggle('Mất response sau successful commit', lose, setLose)}
          <div className="prompt-actions">
            <button type="button" onClick={submit}>
              Gửi tool proposal
            </button>
            <button
              type="button"
              onClick={() => {
                setState(newTicketFixture());
                setResult('READY');
              }}
            >
              Đặt lại backend giả lập
            </button>
          </div>
          <ol className="prompt-validation-flow">
            <li>
              <strong>Authorize</strong>
              <span>caller → alpha owner</span>
            </li>
            <li>
              <strong>Receipt</strong>
              <span>tenant + action + ticket + key / fingerprint</span>
            </li>
            <li>
              <strong>Version / business</strong>
              <span>expectedVersion / blockers</span>
            </li>
            <li>
              <strong>Atomic commit</strong>
              <span>effect + result receipt</span>
            </li>
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Kết quả backend</dt>
              <dd className="prompt-long-value">{result}</dd>
            </div>
            <div>
              <dt>Ticket đã đóng / version</dt>
              <dd>
                {state.closed ? 'YES' : 'NO'} / {state.version}
              </dd>
            </div>
            <div>
              <dt>Số effects đã commit</dt>
              <dd>{state.effects}</dd>
            </div>
            <div>
              <dt>Số result receipts đã lưu</dt>
              <dd>{Object.keys(state.receipts).length}</dd>
            </div>
          </dl>
          <p className="worksheet-footnote">
            Màn này hiển thị backend state để học; khi response bị mất, client chỉ thấy timeout cho
            tới retry/reconcile. Retry cùng key và fingerprint trả receipt, không execute lại; đổi
            arguments với key cũ là mismatch. New key không bypass version/authorization. Fixture
            không xử lý real concurrency, persistence, key expiry hoặc distributed transactions;
            production cần atomic storage/enforcement đúng scope.
          </p>
        </>
      )}
    </section>
  );
}
