import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  productionStream,
  responseCacheDecision,
  productionCacheCost,
  type StreamFailure,
  type RestartPolicy,
  type CacheCase,
} from '../lib/production-app-models';
export default function ProductionAppPlayground({
  kind,
}: {
  kind: 'prod-stream' | 'prod-cache' | 'prod-cost';
}) {
  const ref = useIslandReady(),
    id = 'production-app-' + useId().replace(/:/g, '');
  const [failure, setFailure] = useState<StreamFailure>('mid-stream'),
    [policy, setPolicy] = useState<RestartPolicy>('stop'),
    [qualified, setQualified] = useState(true),
    [disconnect, setDisconnect] = useState(0);
  const [scenario, setScenario] = useState<CacheCase>('paraphrase'),
    [semantic, setSemantic] = useState(true),
    [threshold, setThreshold] = useState(0.9),
    [tenant, setTenant] = useState(true),
    [versions, setVersions] = useState(true),
    [permission, setPermission] = useState(true);
  const [requestK, setRequestK] = useState(100),
    [semanticEnabled, setSemanticEnabled] = useState(true),
    [exact, setExact] = useState(0.2),
    [semanticHit, setSemanticHit] = useState(0.1),
    [falseHit, setFalseHit] = useState(0.02),
    [prefix, setPrefix] = useState(0.6),
    [prefixReads, setPrefixReads] = useState(0.8);
  const stream = productionStream(failure, policy, qualified, disconnect),
    cache = responseCacheDecision(scenario, semantic, threshold, tenant, versions, permission),
    cost = productionCacheCost(
      requestK * 1000,
      exact,
      semanticHit,
      falseHit,
      prefix,
      prefixReads,
      semanticEnabled,
    );
  const format = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 }),
    money = (n: number) =>
      '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
      <output>{percent ? (v * 100).toFixed(1) + '%' : format(v)}</output>
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
  const toggle = (label: string, v: boolean, set: (v: boolean) => void) => (
    <label className="worksheet-toggle">
      <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
  const cases: Record<CacheCase, string> = {
    paraphrase: 'Paraphrase cùng intent',
    'different-intent': 'Intent khác nhưng similarity cao',
    'other-tenant': 'Query từ tenant khác',
    'source-update': 'Source đã cập nhật v5',
    'permission-revoked': 'Permission đã bị revoke',
  };
  return (
    <section
      ref={ref}
      className="handbook-experiment production-app-playground"
      data-kind={kind}
      aria-labelledby={id}
    >
      <span className="eyebrow">PRODUCTION / STREAMS, CACHE AND ECONOMICS</span>
      <h3 id={id}>
        {kind === 'prod-stream'
          ? 'First content, partial failure và visible restart'
          : kind === 'prod-cache'
            ? 'Cache hit cần đúng identity, quyền và intent'
            : 'Tách response hits khỏi prefix reuse'}
      </h3>
      <p>
        {kind === 'prod-stream'
          ? 'Timeline là fixture cố định, không benchmark hoặc live request. Chọn lỗi và restart policy; model first-content deadline là 3000 ms. Transport heartbeat không phải model output. Disconnect=0 nghĩa không disconnect; các giá trị khác là thời điểm client rời đi.'
          : kind === 'prod-cache'
            ? 'Entry chứa refund window 30 ngày của tenant alpha, evidence v4. Query paraphrase có similarity 0.94; intent khác có similarity 0.96. Scores là fixture, không chạy embedding model. Kiểm tenant/dependencies/current permissions trước serve; similarity cao không tự chứng minh đúng câu hỏi.'
            : 'Một window có N requests, mỗi model call dùng 2000 input và 400 output tokens. Giá giả định: uncached input $2/M, cached prefix read $0.5/M, output $8/M; semantic lookup embed 80 query tokens ở $0.02/M. Đây không phải giá provider, latency model hoặc dự báo quality.'}
      </p>
      {kind === 'prod-stream' && (
        <>
          <div className="prod-actions" role="group" aria-label="Stream failure scenario">
            {(['none', 'before-content', 'slow-first', 'mid-stream'] as StreamFailure[]).map(
              (f) => (
                <button
                  type="button"
                  key={f}
                  aria-pressed={failure === f}
                  onClick={() => setFailure(f)}
                >
                  {f === 'none'
                    ? 'Primary hoàn tất'
                    : f === 'before-content'
                      ? 'Lỗi trước content'
                      : f === 'slow-first'
                        ? 'First content quá chậm'
                        : 'Lỗi giữa stream'}
                </button>
              ),
            )}
          </div>
          <div className="prod-actions" role="group" aria-label="Restart policy">
            {(['stop', 'explicit-restart', 'unsafe-splice'] as RestartPolicy[]).map((p) => (
              <button
                type="button"
                key={p}
                aria-pressed={policy === p}
                onClick={() => setPolicy(p)}
              >
                {p === 'stop'
                  ? 'Giữ partial, báo lỗi'
                  : p === 'explicit-restart'
                    ? 'Restart có generation mới'
                    : 'Demo lỗi: splice âm thầm'}
              </button>
            ))}
          </div>
          {toggle('Fallback đã được qualify cho task/data scope', qualified, setQualified)}
          <div className="worksheet-inputs">
            {slider(
              'Client disconnect tại ms (0 = không)',
              disconnect,
              setDisconnect,
              0,
              5000,
              500,
            )}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Stream state</dt>
              <dd>{stream.state}</dd>
            </div>
            <div>
              <dt>Visible generation</dt>
              <dd>{stream.generation}</dd>
            </div>
            <div>
              <dt>Usage evidence</dt>
              <dd>{stream.usage}</dd>
            </div>
          </dl>
          <div className="prod-visible-output">
            <h4>Output user nhìn thấy</h4>
            <p>{stream.visible || 'NO_CONTENT'}</p>
          </div>
          <ol className="prod-timeline" aria-label="Synthetic streaming events">
            {stream.events.map((e, i) => (
              <li key={i}>
                <span>
                  {e.at} ms · G{e.generation}
                </span>
                <strong>{e.code}</strong>
                {e.text && <code>{e.text}</code>}
              </li>
            ))}
          </ol>
          <p className="worksheet-footnote">
            CANCEL_REQUESTED không chứng minh provider đã ngừng generate/bill; reconcile usage theo
            actual contract. Demo không có tool side effects. Nếu production request có
            tools/writes, first visible content chưa phải effect commit boundary; retry phải kiểm
            idempotency/receipts riêng.
          </p>
        </>
      )}
      {kind === 'prod-cache' && (
        <>
          <div className="prod-actions" role="group" aria-label="Response cache scenario">
            {(Object.keys(cases) as CacheCase[]).map((c) => (
              <button
                type="button"
                key={c}
                aria-pressed={scenario === c}
                onClick={() => setScenario(c)}
              >
                {cases[c]}
              </button>
            ))}
          </div>
          {toggle('Dùng semantic matching thay exact input', semantic, setSemantic)}
          {toggle('Bind tenant scope trong cache identity', tenant, setTenant)}
          {toggle('Bind source/policy dependency revisions', versions, setVersions)}
          {toggle('Kiểm current permission trước trả cached answer', permission, setPermission)}
          <div className="worksheet-inputs">
            {slider('Semantic similarity threshold', threshold, setThreshold, 0.8, 1, 0.01)}
          </div>
          <div className="prod-cache-pair">
            <article>
              <h4>Cached evidence</h4>
              <p>tenant alpha · refund · v4</p>
              <strong>30 days</strong>
            </article>
            <article>
              <h4>Current query scenario</h4>
              <p>{cases[scenario]}</p>
              <strong>source v{cache.sourceVersion}</strong>
            </article>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Fixture similarity</dt>
              <dd>{cache.similarity.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Matched / serve</dt>
              <dd>
                {cache.matched ? 'YES' : 'NO'} / {cache.served ? 'YES' : 'NO'}
              </dd>
            </div>
            <div>
              <dt>Identity / access blocked</dt>
              <dd>
                {cache.identityBlocked ? 'YES' : 'NO'} / {cache.accessBlocked ? 'YES' : 'NO'}
              </dd>
            </div>
            <div>
              <dt>Observed fixture outcome</dt>
              <dd>{cache.outcome}</dd>
            </div>
          </dl>
          <p className="worksheet-footnote">
            Threshold 0.95 có thể chặn đúng paraphrase 0.94 nhưng vẫn accept sai intent 0.96. Đây là
            counterexample, không distribution estimate. Exact response caching cũng stale/leak nếu
            identity hoặc authorization thiếu; không cache/replay arbitrary side effects như một
            answer.
          </p>
        </>
      )}
      {kind === 'prod-cost' && (
        <>
          {toggle('Bật semantic lookup sau exact miss', semanticEnabled, setSemanticEnabled)}
          <div className="worksheet-inputs">
            {slider('Requests trong window (nghìn)', requestK, setRequestK, 0, 1000, 10)}
            {slider('Exact response hit / tất cả requests', exact, setExact, 0, 1, 0.1, true)}
            {slider('Semantic hits / exact misses', semanticHit, setSemanticHit, 0, 0.6, 0.1, true)}
            {slider('Wrong answers / semantic hits', falseHit, setFalseHit, 0, 0.1, 0.01, true)}
            {slider('Prefix fraction / model input', prefix, setPrefix, 0, 1, 0.1, true)}
            {slider(
              'Cache-read share / prefix tokens',
              prefixReads,
              setPrefixReads,
              0,
              1,
              0.1,
              true,
            )}
          </div>
          <div className="prod-request-lanes">
            {[
              ['Exact response', cost.exact],
              ['Semantic response', cost.semantic],
              ['Model calls', cost.calls],
            ].map(([label, n]) => (
              <article key={label as string}>
                <h4>{label}</h4>
                <div>
                  <i
                    style={{ width: (requestK ? (Number(n) / (requestK * 1000)) * 100 : 0) + '%' }}
                  />
                </div>
                <strong>{format(n as number)}</strong>
              </article>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Model + lookup cost / window</dt>
              <dd>{money(cost.total)}</dd>
            </div>
            <div>
              <dt>No-cache baseline / window</dt>
              <dd>{money(cost.baseline)}</dd>
            </div>
            <div>
              <dt>Expected wrong semantic answers</dt>
              <dd>{format(cost.wrongSemantic)}</dd>
            </div>
            <div>
              <dt>Generated output tokens</dt>
              <dd>{format(cost.outputTokens)}</dd>
            </div>
          </dl>
          <figure className="handbook-table">
            <div
              className="prod-cost-table"
              role="region"
              aria-label="Hypothetical cache cost breakdown"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>Cost component</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Input: uncached + prefix reads</th>
                    <td>{money(cost.inputCost)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Generated output</th>
                    <td>{money(cost.outputCost)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Query embedding lookup</th>
                    <td>{money(cost.lookupCost)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Prefix read tokens</th>
                    <td>{format(cost.prefixReadTokens)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </figure>
          <p className="worksheet-footnote">
            Semantic hit rate là conditional trên exact misses, không cộng trực tiếp hai hit
            percentages. Lookup vẫn tốn phí khi bật nhưng không có hit; tắt lookup mới bỏ khoản phí
            này. Prefix reuse không tránh output generation. Worksheet chưa tính cache
            writes/storage, invalidation, retrieval/rerank, retries, routing quality, provider
            minimums hoặc human review; giả định exact hits correct và semantic false-hit rate do
            bạn cung cấp. Không suy savings là quality approval.
          </p>
        </>
      )}
    </section>
  );
}
