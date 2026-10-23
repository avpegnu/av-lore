import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  enterpriseRetrieval,
  enterpriseRevocation,
  enterpriseIndexCutover,
  type RetrievalMode,
  type RevocationTiming,
} from '../lib/enterprise-rag-models';
export default function EnterpriseRagPlayground({
  kind,
}: {
  kind: 'enterprise-access' | 'enterprise-revoke' | 'enterprise-migrate';
}) {
  const ref = useIslandReady(),
    id = 'enterprise-rag-' + useId().replace(/:/g, '');
  const [k, setK] = useState(2),
    [mode, setMode] = useState<RetrievalMode>('top-k-then-filter'),
    [miss, setMiss] = useState(false);
  const [timing, setTiming] = useState<RevocationTiming>('before-model'),
    [rerank, setRerank] = useState(true),
    [model, setModel] = useState(true),
    [answer, setAnswer] = useState(true);
  const [backfill, setBackfill] = useState(100),
    [cursor, setCursor] = useState(110),
    [paired, setPaired] = useState(true),
    [evals, setEvals] = useState(true),
    [force, setForce] = useState(false);
  const users = enterpriseRetrieval(k, mode, miss),
    revoke = enterpriseRevocation(timing, rerank, model, answer),
    migration = enterpriseIndexCutover(backfill, cursor, paired, evals, force);
  const toggle = (label: string, v: boolean, set: (v: boolean) => void) => (
    <label className="worksheet-toggle">
      <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
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
      <output>{v}</output>
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
  return (
    <section
      ref={ref}
      className="handbook-experiment enterprise-rag-playground"
      aria-labelledby={id}
    >
      <span className="eyebrow">ENTERPRISE RAG / IDENTITY, FRESHNESS AND CUTOVER</span>
      <h3 id={id}>
        {kind === 'enterprise-access'
          ? 'Cùng ranked corpus, ba principal scopes'
          : kind === 'enterprise-revoke'
            ? 'Quyền bị revoke giữa retrieval và answer'
            : 'Cutover index phải ghép đúng data và query space'}
      </h3>
      <p>
        {kind === 'enterprise-access'
          ? 'Fixture có 6 ranked records, một record thuộc tenant beta bị loại ở mọi mode; ba users thuộc tenant alpha. Scores/relevance labels được gán sẵn, không là ANN benchmark. Recall ở đây = authorized relevant records được trả / tất cả authorized relevant records, không phải tỷ lệ trên min(k,relevant).'
          : kind === 'enterprise-revoke'
            ? 'Một passage đang được phép ở retrieval, sau đó authoritative access bị revoke tại boundary đã chọn. Lab kiểm riêng reranker, generator và answer delivery; không có model/provider thật. “Blocked ở cuối” có thể vẫn để unauthorized data tới upstream processor trước đó.'
            : 'Fixture có một fixed change-log watermark 120 và hai embedding spaces E1/E2. Chọn backfill progress, caught-up cursor và readiness flags. Đây là study model, không tự chạy migration hoặc chứng minh mọi partition/replica đã caught up trong distributed system thật.'}
      </p>
      {kind === 'enterprise-access' && (
        <>
          <div className="enterprise-actions" role="group" aria-label="Permission filter placement">
            {(
              ['eligible-first', 'top-k-then-filter', 'no-permission-filter'] as RetrievalMode[]
            ).map((m) => (
              <button type="button" key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>
                {m === 'eligible-first'
                  ? 'Filter eligible rồi chọn top-k'
                  : m === 'top-k-then-filter'
                    ? 'Top-k rồi filter trước processing'
                    : 'Demo lỗi: không check permissions'}
              </button>
            ))}
          </div>
          <div className="worksheet-inputs">{slider('Top-k records', k, setK, 1, 5, 1)}</div>
          {toggle('Giả lập candidate retrieval miss record GUIDE', miss, setMiss)}
          <div className="enterprise-user-grid">
            {users.map((u) => (
              <article key={u.user}>
                <h4>{u.user}</h4>
                <p>groups: {u.groups.join(', ')}</p>
                <ol>
                  {u.shown.map((d) => (
                    <li key={d.id} data-unauthorized={!d.allowed}>
                      <strong>{d.id}</strong>
                      <span>score {d.score.toFixed(2)}</span>
                      <span>
                        {d.allowed ? 'AUTHORIZED' : 'UNAUTHORIZED'} ·{' '}
                        {d.relevant ? 'relevant' : 'not relevant'}
                      </span>
                    </li>
                  ))}
                </ol>
                {u.shown.length === 0 && <p>NO_ELIGIBLE_RESULT</p>}
                <dl>
                  <div>
                    <dt>Recall / relevant</dt>
                    <dd>
                      {u.recall === null ? 'NONE' : (u.recall * 100).toFixed(0) + '%'} ·{' '}
                      {u.relevantFound}/{u.relevantTotal}
                    </dd>
                  </div>
                  <div>
                    <dt>Unauthorized / dropped</dt>
                    <dd>
                      {u.leaked} / {u.dropped}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <p className="worksheet-footnote">
            Eligible-first không tạo lại relevant candidates mà ANN/retrieval đã bỏ sót. Postfilter
            trước mọi unauthorized processing có thể bảo vệ data theo assumptions nhưng underfill;
            filter ở UI sau model quá muộn. Lab giả định permission metadata hiện tại;
            race/staleness được tách ở lab kế tiếp.
          </p>
        </>
      )}
      {kind === 'enterprise-revoke' && (
        <>
          <div className="enterprise-actions" role="group" aria-label="Revocation timing">
            {(['before-rerank', 'before-model', 'after-model'] as RevocationTiming[]).map((t) => (
              <button
                type="button"
                key={t}
                aria-pressed={timing === t}
                onClick={() => setTiming(t)}
              >
                {t === 'before-rerank'
                  ? 'Revoke trước rerank'
                  : t === 'before-model'
                    ? 'Revoke trước generator'
                    : 'Revoke sau generator'}
              </button>
            ))}
          </div>
          {toggle('Current access check trước reranker', rerank, setRerank)}
          {toggle('Current access check trước generator', model, setModel)}
          {toggle('Current access check trước answer/cache/share delivery', answer, setAnswer)}
          <dl className="worksheet-results" aria-live="polite">
            <div className="enterprise-long-state">
              <dt>Query state</dt>
              <dd>{revoke.state}</dd>
            </div>
            <div>
              <dt>Unauthorized upstream exposure</dt>
              <dd>{revoke.upstreamDisclosure ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Unauthorized user disclosure</dt>
              <dd>{revoke.userDisclosure ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <ol className="enterprise-events" aria-label="Current permission boundaries">
            {revoke.events.map((e, i) => (
              <li key={i}>
                <h4>{e.stage}</h4>
                <p>
                  authorized now: {e.authorized ? 'YES' : 'NO'} · guard: {e.guard ? 'ON' : 'OFF'}
                </p>
                <strong>{e.result}</strong>
              </li>
            ))}
          </ol>
          <p className="worksheet-footnote">
            Source permissions có thể đổi ngay sau một check; cần định linearization/freshness
            contract và fail-closed behavior phù hợp. Already-authorized processing không thể bị
            “unsend” sau revoke. Future turns, stored answers và viewers cần current checks; chỉ xóa
            citation link không xóa facts trong answer.
          </p>
        </>
      )}
      {kind === 'enterprise-migrate' && (
        <>
          <div className="worksheet-inputs">
            {slider('Backfill complete (%)', backfill, setBackfill, 0, 100, 10)}
            {slider('Candidate caught-up log sequence', cursor, setCursor, 100, 120, 1)}
          </div>
          {toggle('Query encoder ghép đúng candidate document space', paired, setPaired)}
          {toggle('Task/retrieval/regression evaluation đã đạt theo giả định', evals, setEvals)}
          {toggle('Demo lỗi: force cutover khi chưa đủ evidence', force, setForce)}
          <dl className="worksheet-results" aria-live="polite">
            <div className="enterprise-long-state">
              <dt>Migration state</dt>
              <dd>{migration.state}</dd>
            </div>
            <div>
              <dt>Active index</dt>
              <dd>{migration.activeIndex}</dd>
            </div>
            <div>
              <dt>Query encoder</dt>
              <dd>{migration.queryEncoder}</dd>
            </div>
            <div>
              <dt>Fixed fixture watermark</dt>
              <dd>{migration.highWatermark}</dd>
            </div>
          </dl>
          <div className="enterprise-readiness" role="status">
            <h4>Readiness gaps</h4>
            <p>{migration.gaps.join(' · ') || 'NONE'}</p>
          </div>
          <p className="worksheet-footnote">
            Production cần generation/source fences, delete/ACL propagation, per-partition
            watermarks, ongoing dual-write/catch-up và atomic compatible profile mapping. Flag evals
            là scenario assumption, không chạy test thật. Keep rollback dependencies/catch-up; “100%
            backfill” không tự có nghĩa current hoặc permission-correct.
          </p>
        </>
      )}
    </section>
  );
}
