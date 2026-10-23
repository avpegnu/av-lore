import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  agentWorkflow,
  agentContextCost,
  agentEffectReplay,
  type AgentFailure,
  type AgentApproval,
} from '../lib/agent-runtime-models';
export default function AgentRuntimePlayground({
  kind,
}: {
  kind: 'agent-loop' | 'agent-effect' | 'agent-context';
}) {
  const ref = useIslandReady(),
    id = 'agent-runtime-' + useId().replace(/:/g, '');
  const [maxTurns, setMaxTurns] = useState(8),
    [tokenBudget, setTokenBudget] = useState(8000),
    [failure, setFailure] = useState<AgentFailure>('none'),
    [approval, setApproval] = useState<AgentApproval>('pending'),
    [authorized, setAuthorized] = useState(true);
  const [durable, setDurable] = useState(true),
    [dedup, setDedup] = useState(true),
    [matching, setMatching] = useState(true),
    [fresh, setFresh] = useState(true),
    [effectAuthorized, setEffectAuthorized] = useState(true),
    [cancelled, setCancelled] = useState(false);
  const [turns, setTurns] = useState(6),
    [base, setBase] = useState(1000),
    [growth, setGrowth] = useState(200),
    [window, setWindow] = useState(3);
  const run = agentWorkflow(maxTurns, tokenBudget, failure, approval, authorized),
    effect = agentEffectReplay(durable, dedup, matching, fresh, effectAuthorized, cancelled),
    context = agentContextCost(turns, base, growth, window);
  const format = (n: number) => n.toLocaleString('en-US');
  const slider = (
    label: string,
    v: number,
    set: (v: number) => void,
    min: number,
    max: number,
    step: number,
  ) => (
    <label key={label}>
      {label}
      <output>{format(v)}</output>
      <input
        type="range"
        value={v}
        min={min}
        max={max}
        step={step}
        onChange={(e) => set(+e.target.value)}
      />
    </label>
  );
  const toggle = (label: string, v: boolean, set: (v: boolean) => void) => (
    <label className="worksheet-toggle">
      <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
  const configure = (fn: () => void) => {
    fn();
    setApproval('pending');
  };
  return (
    <section
      ref={ref}
      className="handbook-experiment agent-runtime-playground"
      aria-labelledby={id}
    >
      <span className="eyebrow">AGENTS / CONTROL, EFFECTS AND CONTEXT</span>
      <h3 id={id}>
        {kind === 'agent-loop'
          ? 'Theo dõi từng model turn và điểm dừng'
          : kind === 'agent-effect'
            ? 'Crash sau commit: checkpoint chưa đủ chống duplicate'
            : 'Tính tổng input tokens qua nhiều turns'}
      </h3>
      <p>
        {kind === 'agent-loop'
          ? 'Fixture xử lý ticket: read_ticket → get_order → issue_refund → kiểm final outcome. Không gọi LLM/API hoặc refund thật. Mỗi model turn dùng input context hiện tại và reserve 100 output tokens; code kiểm budget trước turn. Thay cấu hình bắt đầu một scenario mới và xóa approval cũ.'
          : kind === 'agent-effect'
            ? 'Fixture dispatch cùng refund $50, sink commit nhưng response đầu bị mất. Recovery thử lại; có durable intent mới giữ được request identity. Các toggles cho thấy stable key và sink-side dedup là hai điều kiện riêng, không phải một promise từ checkpoint. Không thực hiện giao dịch thật.'
            : 'Mỗi turn có fixed base context và một lượng history tăng thêm. So sánh full history với giữ K turns gần nhất; không mô phỏng tokenizer, summarization quality, cache billing hoặc model accuracy. Bỏ history có thể mất evidence, nên quality cần được đánh giá riêng.'}
      </p>
      {kind === 'agent-loop' && (
        <>
          <div className="worksheet-inputs">
            {slider('Model-turn limit', maxTurns, (v) => configure(() => setMaxTurns(v)), 1, 10, 1)}
            {slider(
              'Token reservation budget',
              tokenBudget,
              (v) => configure(() => setTokenBudget(v)),
              1000,
              10000,
              500,
            )}
          </div>
          <div className="agent-actions" role="group" aria-label="Read-tool failure mode">
            {(['none', 'once', 'persistent'] as AgentFailure[]).map((f) => (
              <button
                type="button"
                key={f}
                aria-pressed={failure === f}
                onClick={() => configure(() => setFailure(f))}
              >
                {f === 'none'
                  ? 'Read thành công'
                  : f === 'once'
                    ? 'Read timeout một lần'
                    : 'Read timeout liên tục'}
              </button>
            ))}
          </div>
          {toggle('Principal có quyền issue_refund theo policy', authorized, (v) =>
            configure(() => setAuthorized(v)),
          )}
          <div className="agent-run-status" role="status">
            <strong>{run.state}</strong>
            <p>
              {approval === 'pending'
                ? 'Approval đang pending; policy kiểm quyền độc lập với approval.'
                : approval === 'approved'
                  ? 'Approval chỉ dùng cho scenario hiện tại; thay cấu hình sẽ reset.'
                  : 'Human đã reject action trong scenario này.'}
            </p>
          </div>
          <div className="agent-actions" role="group" aria-label="Scenario approval decision">
            <button type="button" onClick={() => setApproval('approved')}>
              Phê duyệt refund của scenario
            </button>
            <button type="button" onClick={() => setApproval('rejected')}>
              Từ chối refund
            </button>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Model turns đã chạy</dt>
              <dd>{run.turns.length}</dd>
            </div>
            <div>
              <dt>Input + output reservations</dt>
              <dd>{format(run.spent)}</dd>
            </div>
            <div>
              <dt>Committed effects</dt>
              <dd>{run.effects}</dd>
            </div>
            <div>
              <dt>Loop state</dt>
              <dd>{run.state}</dd>
            </div>
          </dl>
          <ol className="agent-event-list" aria-label="Synthetic runtime events">
            {run.events.map((e, i) => (
              <li key={i}>
                <span>Turn {e.turn}</span>
                <strong>{e.code}</strong>
                <code>{e.tool}</code>
              </li>
            ))}
          </ol>
          <p className="worksheet-footnote">
            Giới hạn turns/tokens dừng work mới, không undo effect đã commit. Persistent read error
            dừng sau 3 attempts. Không áp retry rule này cho unknown write outcome: writes cần
            receipt/idempotency/reconciliation. Approval pending thực tế nên persist và nhường
            worker; waits vẫn có storage/operations cost.
          </p>
        </>
      )}
      {kind === 'agent-effect' && (
        <>
          {toggle('Persist exact intent/key trước dispatch', durable, setDurable)}
          {toggle('Sink có atomic receipt + effect dedup', dedup, setDedup)}
          {toggle('Approval khớp exact target/amount/principal', matching, setMatching)}
          {toggle('Approval còn hiệu lực', fresh, setFresh)}
          {toggle('Authorization hiện tại cho phép action', effectAuthorized, setEffectAuthorized)}
          {toggle('Cancel run sau response bị mất', cancelled, setCancelled)}
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Recovery state</dt>
              <dd>{effect.state}</dd>
            </div>
            <div>
              <dt>Effects thật trong fixture</dt>
              <dd>{effect.effects}</dd>
            </div>
          </dl>
          <ol className="agent-event-list" aria-label="Lost response recovery events">
            {effect.events.map((e, i) => (
              <li key={i}>
                <span>{e.phase}</span>
                <strong>{e.outcome}</strong>
                <code>{e.key}</code>
              </li>
            ))}
          </ol>
          <p className="worksheet-footnote">
            Fixture giả định receipts không expire và atomic với effect. Production cần
            tenant-scoped identity, payload hash, retention và lookup/reconciliation contract.
            Cancel không đảo ngược prior commit. Nếu không chứng minh được outcome, giữ
            RECONCILE_REQUIRED thay retry blind hoặc báo không có effect.
          </p>
        </>
      )}
      {kind === 'agent-context' && (
        <>
          <div className="worksheet-inputs">
            {slider('Số model turns', turns, setTurns, 2, 20, 1)}
            {slider('Base context tokens / turn', base, setBase, 500, 3000, 250)}
            {slider('History tokens thêm sau mỗi turn', growth, setGrowth, 0, 1000, 100)}
            {slider('Recent turns giữ lại K', window, setWindow, 0, 10, 1)}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Full-history input total</dt>
              <dd>{format(context.full)}</dd>
            </div>
            <div>
              <dt>Bounded-window input total</dt>
              <dd>{format(context.window)}</dd>
            </div>
            <div>
              <dt>Input tokens chênh lệch</dt>
              <dd>{format(context.full - context.window)}</dd>
            </div>
            <div>
              <dt>Quality impact</dt>
              <dd>NOT_MODELED</dd>
            </div>
          </dl>
          <div className="agent-context-bars" aria-label="Input context per model turn">
            {context.rows.map((r) => (
              <article key={r.turn}>
                <h4>Turn {r.turn}</h4>
                <div>
                  <span>Full</span>
                  <i style={{ width: (r.full / context.rows.at(-1)!.full) * 100 + '%' }} />
                  <strong>{format(r.full)}</strong>
                </div>
                <div>
                  <span>Window</span>
                  <i style={{ width: (r.window / context.rows.at(-1)!.full) * 100 + '%' }} />
                  <strong>{format(r.window)}</strong>
                </div>
              </article>
            ))}
          </div>
          <p className="worksheet-footnote">
            Full input = n×base + history×n(n−1)/2. Khi history=0, input total tăng tuyến tính.
            Bounded windows thay đổi growth; prompt caching có thể đổi billed cost mà không đổi
            logical input tokens. Output, tool costs, reasoning usage, summaries, retries và latency
            không được tính trong worksheet này.
          </p>
        </>
      )}
    </section>
  );
}
