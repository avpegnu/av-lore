import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  gatewayRoute,
  gatewayFailover,
  gatewayAccounting,
  type GatewayFailure,
  type UsageDedup,
} from '../lib/llm-gateway-models';
export default function LlmGatewayPlayground({
  kind,
}: {
  kind: 'gateway-route' | 'gateway-failover' | 'gateway-accounting';
}) {
  const ref = useIslandReady(),
    id = 'llm-gateway-' + useId().replace(/:/g, '');
  const [privateOnly, setPrivate] = useState(false),
    [eu, setEU] = useState(true),
    [tools, setTools] = useState(true),
    [qualified, setQualified] = useState(true),
    [bDown, setBDown] = useState(true),
    [cDown, setCDown] = useState(false),
    [enforce, setEnforce] = useState(true),
    [policy, setPolicy] = useState<'cost' | 'latency'>('cost');
  const [scenario, setScenario] = useState<GatewayFailure>('rate-limit'),
    [deadline, setDeadline] = useState(1500),
    [retryAfter, setRetryAfter] = useState(400),
    [replay, setReplay] = useState(true);
  const [requests, setRequests] = useState(2),
    [reservation, setReservation] = useState(4000),
    [atomic, setAtomic] = useState(true),
    [retry, setRetry] = useState(true),
    [duplicate, setDuplicate] = useState(true),
    [missing, setMissing] = useState(false),
    [dedup, setDedup] = useState<UsageDedup>('attempt');
  const route = gatewayRoute(privateOnly, eu, tools, qualified, bDown, cDown, enforce, policy),
    fail = gatewayFailover(scenario, deadline, retryAfter, replay),
    ledger = gatewayAccounting(requests, reservation, atomic, retry, duplicate, missing, dedup);
  const toggle = (label: string, value: boolean, set: (v: boolean) => void) => (
    <label className="worksheet-toggle">
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
  const slider = (
    label: string,
    value: number,
    set: (v: number) => void,
    min: number,
    max: number,
    step: number,
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
  const failures: Record<GatewayFailure, string> = {
    rejected: 'Connection bị từ chối trước upstream admission',
    'rate-limit': '429 với Retry-After',
    'unknown-timeout': 'Timeout: upstream outcome chưa biết',
    'partial-stream': 'Stream đã lộ một phần output',
    'tool-effect': 'Tool side effect đã commit',
  };
  return (
    <section
      ref={ref}
      className="handbook-experiment llm-gateway-playground"
      data-kind={kind}
      aria-labelledby={id}
    >
      <span className="eyebrow">GATEWAY / ROUTES, ATTEMPTS AND RESERVATIONS</span>
      <h3 id={id}>
        {kind === 'gateway-route'
          ? 'Chọn route sau khi lọc hard constraints'
          : kind === 'gateway-failover'
            ? 'Fallback có deadline và output boundary'
            : 'Reservation và usage có hai loại identity'}
      </h3>
      <p>
        {kind === 'gateway-route'
          ? 'Bốn deployments có metadata, latency và price units được gán sẵn. Đây là fixture tĩnh, không benchmark, giá nhà cung cấp hoặc đánh giá model thật. B/C có thể bị đánh dấu unavailable; D chưa qualified và không hỗ trợ tools. Tắt gates là cố ý minh họa lỗi policy.'
          : kind === 'gateway-failover'
            ? 'Attempt đầu dừng ở 200 ms; fallback cần 450 ms sau thời gian chờ được cấu hình. Replay chỉ được bật cho operation đã được policy cho phép; chưa có output không chứng minh upstream chưa chạy. Không gọi provider hoặc thực hiện tool thật.'
            : 'Budget 10000 token units, prior settled 2000 và prior holds 1500. Concurrent admissions cùng xin reservation; chỉ request đầu được settle trong lab, các request khác còn giữ reservation. Usage A1=1200, A2=800 nếu có retry; duplicate A1 là event lặp, không phải attempt mới. Đây không phải rate-limit refill, giá tiền hoặc billing service thật.'}
      </p>
      {kind === 'gateway-route' && (
        <>
          <div className="gateway-actions" role="group" aria-label="Route preference">
            {(['cost', 'latency'] as const).map((x) => (
              <button
                type="button"
                key={x}
                aria-pressed={policy === x}
                onClick={() => setPolicy(x)}
              >
                {x === 'cost' ? 'Ưu tiên chi phí thấp' : 'Ưu tiên latency thấp'}
              </button>
            ))}
          </div>
          <div className="gateway-toggles">
            {toggle('Chỉ private deployment', privateOnly, setPrivate)}
            {toggle('Chỉ region EU', eu, setEU)}
            {toggle('Yêu cầu tool capability', tools, setTools)}
            {toggle('Yêu cầu eval qualification', qualified, setQualified)}
            {toggle('B unavailable', bDown, setBDown)}
            {toggle('C unavailable', cDown, setCDown)}
            {toggle('Enforce hard constraints trước ranking', enforce, setEnforce)}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div className="gateway-long-state">
              <dt>Route state</dt>
              <dd>{route.state}</dd>
            </div>
            <div>
              <dt>Selected deployment</dt>
              <dd>{route.selected}</dd>
            </div>
            <div>
              <dt>Eligible deployments</dt>
              <dd>{route.candidateCount}</dd>
            </div>
          </dl>
          <ol className="gateway-deployments" aria-label="Deployment eligibility decisions">
            {route.rows.map((d) => (
              <li key={d.id} data-selected={route.selected === d.id}>
                <h4>
                  {d.id} · {d.region} · {d.private ? 'PRIVATE' : 'PUBLIC'}
                </h4>
                <p>
                  {d.price} price units · {d.latency} ms · {d.tools ? 'TOOLS' : 'NO_TOOLS'} ·{' '}
                  {d.qualified ? 'QUALIFIED' : 'UNQUALIFIED'}
                </p>
                <strong>{d.down ? 'UNAVAILABLE' : d.eligible ? 'ELIGIBLE' : 'FILTERED'}</strong>
                <p>{d.reasons.length ? d.reasons.join(' · ') : 'CONSTRAINTS_MATCH'}</p>
              </li>
            ))}
          </ol>
          <p className="worksheet-footnote">
            Ranking chỉ áp trên candidates hợp lệ và còn capacity. Healthy không đồng nghĩa
            qualified; failover không được đổi privacy, region hoặc tool contract. Lab không mô
            phỏng queue, correlation, circuit-breaker recovery hoặc prediction sai.
          </p>
        </>
      )}
      {kind === 'gateway-failover' && (
        <>
          <div className="gateway-actions" role="group" aria-label="Failure boundary scenarios">
            {(Object.keys(failures) as GatewayFailure[]).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={scenario === s}
                onClick={() => setScenario(s)}
              >
                {failures[s]}
              </button>
            ))}
          </div>
          <div className="worksheet-inputs">
            {slider('End-to-end deadline (ms)', deadline, setDeadline, 500, 2500, 100)}
            {slider('Retry-After wait (ms)', retryAfter, setRetryAfter, 0, 1200, 100)}
          </div>
          {toggle('Policy cho phép replay operation này', replay, setReplay)}
          <dl className="worksheet-results" aria-live="polite">
            <div className="gateway-long-state">
              <dt>Recovery state</dt>
              <dd>{fail.state}</dd>
            </div>
            <div>
              <dt>Dispatched attempts</dt>
              <dd>{fail.attempts}</dd>
            </div>
            <div>
              <dt>Elapsed fixture time</dt>
              <dd>{fail.elapsed} ms</dd>
            </div>
            <div>
              <dt>Prior usage unresolved?</dt>
              <dd>{fail.unknownPriorUsage ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <ol className="gateway-events" aria-label="Attempt timeline">
            {fail.events.map((e, i) => (
              <li key={i}>
                <span>{e.at} ms</span>
                <strong>{e.state}</strong>
              </li>
            ))}
          </ol>
          <p className="worksheet-footnote">
            Retry-After là lower bound khi hiện diện và hợp lệ; thêm bounded jitter/backoff và
            attempt budget trong production. Không splice output âm thầm sau khi đã expose; explicit
            resume/replacement protocol là contract khác. Client request ID không tự deduplicate
            upstream execution hoặc tool effects.
          </p>
        </>
      )}
      {kind === 'gateway-accounting' && (
        <>
          <div className="worksheet-inputs">
            {slider('Concurrent admissions', requests, setRequests, 1, 3, 1)}
            {slider(
              'Reservation per request (token units)',
              reservation,
              setReservation,
              2000,
              6000,
              1000,
            )}
          </div>
          {toggle('Atomic shared reservation', atomic, setAtomic)}
          {toggle('Có attempt A2 sau retry', retry, setRetry)}
          {toggle('Usage A1 event đến hai lần', duplicate, setDuplicate)}
          {toggle('Thiếu final usage của A2', missing, setMissing)}
          <div className="gateway-actions" role="group" aria-label="Usage deduplication key">
            {(['attempt', 'request', 'off'] as const).map((d) => (
              <button key={d} type="button" aria-pressed={dedup === d} onClick={() => setDedup(d)}>
                {d === 'attempt'
                  ? 'Dedup theo attempt'
                  : d === 'request'
                    ? 'Dedup chỉ theo request'
                    : 'Không dedup usage'}
              </button>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div className="gateway-long-state">
              <dt>Accounting state</dt>
              <dd>{ledger.state}</dd>
            </div>
            <div>
              <dt>Admitted requests</dt>
              <dd>
                {ledger.admitted} / {requests}
              </dd>
            </div>
            <div>
              <dt>Held at admission</dt>
              <dd>{ledger.held}</dd>
            </div>
            <div>
              <dt>Over-reservation</dt>
              <dd>{ledger.oversubscribed}</dd>
            </div>
            <div>
              <dt>Posted / fixture actual</dt>
              <dd>
                {ledger.posted} / {ledger.actual}
              </dd>
            </div>
            <div>
              <dt>Unresolved hold</dt>
              <dd>{ledger.unresolved}</dd>
            </div>
            <div>
              <dt>Available after settlement</dt>
              <dd>{ledger.availableAfter}</dd>
            </div>
          </dl>
          <ol className="gateway-events" aria-label="Received usage records">
            {ledger.events.map((e, i) => (
              <li key={i}>
                <span>
                  {e.attempt} · {e.usage} token units
                </span>
                <strong>{e.applied ? 'POSTED' : 'DUPLICATE_IGNORED'}</strong>
              </li>
            ))}
          </ol>
          <p className="worksheet-footnote">
            Fixture actual là đáp án được biết trước để học, không phải telemetry provider có sẵn
            khi final usage bị mất. Không giải phóng unresolved hold như usage=0. Production cần
            durable reservations/attempt IDs, idempotent settlement, late corrections, price
            revision và reconciliation; dedup request-only có thể bỏ sót các attempts thực sự bị
            tính phí.
          </p>
        </>
      )}
    </section>
  );
}
