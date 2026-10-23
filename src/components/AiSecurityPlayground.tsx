import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  disclosurePaths,
  urlBoundaryFixture,
  moderationFixture,
  type UrlScenario,
} from '../lib/ai-security-models';
export default function AiSecurityPlayground({
  kind,
}: {
  kind: 'security-paths' | 'security-url' | 'security-moderation';
}) {
  const ref = useIslandReady(),
    id = 'ai-security-' + useId().replace(/:/g, '');
  const [follows, setFollows] = useState(true),
    [privateData, setPrivateData] = useState(true),
    [send, setSend] = useState(false),
    [recipient, setRecipient] = useState(false),
    [review, setReview] = useState<'not-required' | 'reject' | 'approve'>('reject'),
    [images, setImages] = useState(false),
    [egress, setEgress] = useState(false);
  const [urlCase, setUrlCase] = useState<UrlScenario>('lookalike-host'),
    [host, setHost] = useState(true),
    [connection, setConnection] = useState(true),
    [redirect, setRedirect] = useState(true);
  const [threshold, setThreshold] = useState(0.7),
    [prevalence, setPrevalence] = useState(1);
  const paths = disclosurePaths(follows, privateData, send, recipient, review, images, egress),
    url = urlBoundaryFixture(urlCase, host, connection, redirect),
    moderation = moderationFixture(threshold, prevalence / 100);
  const toggle = (label: string, v: boolean, set: (v: boolean) => void) => (
    <label className="worksheet-toggle">
      <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
  const percent = (v: number | null) => (v === null ? 'NONE' : (v * 100).toFixed(1) + '%');
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
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => set(+e.target.value)}
      />
    </label>
  );
  return (
    <section ref={ref} className="handbook-experiment ai-security-playground" aria-labelledby={id}>
      <span className="eyebrow">SECURITY / DATA, AUTHORITY AND SINKS</span>
      <h3 id={id}>
        {kind === 'security-paths'
          ? 'Tool path và renderer path cần controls riêng'
          : kind === 'security-url'
            ? 'URL parsing chưa chứng minh destination được phép'
            : 'Threshold, confusion matrix và base-rate effect'}
      </h3>
      <p>
        {kind === 'security-paths'
          ? 'Fixture cố ý giả định model đã làm theo untrusted instruction. Toggle đầu là assumption, không là detector hoặc dự báo model behavior. Scenario chỉ có hai đường disclosure: outbound send tool và automatic remote image. Không gửi data, email hoặc network request thật.'
          : kind === 'security-url'
            ? 'Closed fixture dùng reserved .test domains và metadata về address/redirect. URL được parse nhưng không có DNS lookup, fetch hoặc image load. Các stages minh họa những checks độc lập, không cung cấp production SSRF validator.'
            : '12 labeled cases giả định gồm 6 harmful và 6 benign, với fixed scores không phải probabilities được calibrate. Threshold quyết định block khi score ≥ threshold. Expected production precision giả định TPR/FPR giữ nguyên khi đổi prevalence; không dự báo một classifier thật hoặc giải quyết prompt injection.'}
      </p>
      {kind === 'security-paths' && (
        <>
          {toggle('Giả định model làm theo malicious instruction', follows, setFollows)}
          {toggle('Context chứa private data trong scenario', privateData, setPrivateData)}
          {toggle('Runtime có capability send ra ngoài', send, setSend)}
          {toggle('Recipient policy cho phép destination của attack', recipient, setRecipient)}
          <div className="security-actions" role="group" aria-label="Scenario review decision">
            {(['reject', 'approve', 'not-required'] as const).map((r) => (
              <button
                type="button"
                key={r}
                aria-pressed={review === r}
                onClick={() => setReview(r)}
              >
                {r === 'reject'
                  ? 'Human reject'
                  : r === 'approve'
                    ? 'Human approve nhầm'
                    : 'Policy không cần review'}
              </button>
            ))}
          </div>
          {toggle('Renderer tự load remote image', images, setImages)}
          {toggle('Image egress policy cho phép destination của attack', egress, setEgress)}
          <div className="security-state" role="status">
            <strong>{paths.state}</strong>
            <p>Simulated disclosure paths: {paths.leaks} / 2</p>
          </div>
          <div className="security-paths">
            <article>
              <h4>Path A · outbound tool</h4>
              <strong>{paths.tool}</strong>
              <p>Tool capability → recipient policy → review decision → effect</p>
            </article>
            <article>
              <h4>Path B · renderer request</h4>
              <strong>{paths.image}</strong>
              <p>Generated image reference → renderer behavior → egress policy</p>
            </article>
          </div>
          <p className="worksheet-footnote">
            Chặn send tool không tự chặn browser image request; chặn image không tự thu hồi tool
            credentials. Human review có thể sai. NO_SIMULATED_DISCLOSURE chỉ nói về hai paths và
            assumptions của fixture, không chứng minh application secure hoặc model không thể tiết
            lộ training/prior-state data.
          </p>
        </>
      )}
      {kind === 'security-url' && (
        <>
          <div className="security-actions" role="group" aria-label="URL boundary scenarios">
            {(
              [
                'approved-public',
                'lookalike-host',
                'private-resolution',
                'redirect-outside',
              ] as UrlScenario[]
            ).map((s) => (
              <button
                type="button"
                key={s}
                aria-pressed={urlCase === s}
                onClick={() => setUrlCase(s)}
              >
                {s === 'approved-public'
                  ? 'Approved host, public fixture'
                  : s === 'lookalike-host'
                    ? 'Hostname chứa allowed name'
                    : s === 'private-resolution'
                      ? 'Allowed host → private address'
                      : 'Allowed host → redirect ngoài scope'}
              </button>
            ))}
          </div>
          {toggle('Exact parsed hostname policy', host, setHost)}
          {toggle('Validate và bind actual connection destination', connection, setConnection)}
          {toggle('Không follow unchecked redirect target', redirect, setRedirect)}
          <div className="security-url-input">
            <h4>Fixture URL · text only</h4>
            <code>{url.input}</code>
            <p>
              Parsed hostname: <strong>{url.host}</strong>
            </p>
          </div>
          <div className="security-state" role="status">
            <strong>{url.state}</strong>
            <p>
              Simulated initial network admission: {url.networkAttempt ? 'YES' : 'NO'} · actual
              requests: 0
            </p>
          </div>
          <ol className="security-boundaries" aria-label="URL validation boundaries">
            {url.stages.map((s, i) => (
              <li key={i}>
                <span>{s.boundary}</span>
                <strong>{s.result}</strong>
              </li>
            ))}
          </ol>
          <p className="worksheet-footnote">
            Production cần phù hợp schemes/ports/credentials, canonical host, IPv4/IPv6/network
            ranges, DNS rebinding/TOCTOU, redirects, proxy và TLS policies. Kiểm DNS trước rồi
            connect bằng lookup khác có thể bypass. FIXTURE_ALLOW_NOT_PROOF không là chứng nhận URL
            an toàn; giữ network egress controls độc lập.
          </p>
        </>
      )}
      {kind === 'security-moderation' && (
        <>
          <div className="worksheet-inputs">
            {slider('Block threshold (score ≥ threshold)', threshold, setThreshold, 0, 1, 0.05)}
            {slider('Assumed harmful prevalence (%)', prevalence, setPrevalence, 1, 50, 1)}
          </div>
          <figure className="handbook-table">
            <div
              className="security-table"
              role="region"
              aria-label="Moderation confusion matrix"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>True fixture class</th>
                    <th>Blocked</th>
                    <th>Allowed</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Harmful (6)</th>
                    <td>TP: {moderation.tp}</td>
                    <td>FN: {moderation.fn}</td>
                  </tr>
                  <tr>
                    <th scope="row">Benign (6)</th>
                    <td>FP: {moderation.fp}</td>
                    <td>TN: {moderation.tn}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Fixture TPR / recall</dt>
              <dd>{percent(moderation.tpr)}</dd>
            </div>
            <div>
              <dt>Fixture FPR</dt>
              <dd>{percent(moderation.fpr)}</dd>
            </div>
            <div>
              <dt>Precision trên balanced fixture</dt>
              <dd>{percent(moderation.samplePrecision)}</dd>
            </div>
            <div>
              <dt>Expected precision theo prevalence</dt>
              <dd>{percent(moderation.expectedPrecision)}</dd>
            </div>
          </dl>
          <div className="security-base-rate">
            <h4>Expected counts / 10000 requests</h4>
            <p>
              TP: {moderation.expectedTP.toFixed(1)} · FP: {moderation.expectedFP.toFixed(1)}
            </p>
          </div>
          <div
            className="security-case-grid"
            aria-label="Fixed classifier scores and threshold outcomes"
          >
            {moderation.rows.map((r) => (
              <article key={r.id}>
                <h4>
                  {r.id} · {r.harmful ? 'harmful' : 'benign'}
                </h4>
                <span>score {r.score.toFixed(2)}</span>
                <strong>{r.blocked ? 'BLOCK' : 'ALLOW'}</strong>
              </article>
            ))}
          </div>
          <p className="worksheet-footnote">
            Balanced challenge-set precision không tự là production precision. Hạ threshold thường
            tăng both catches và false blocks trên fixed scores; severity, languages/task slices,
            distribution shift và uncertainty vẫn cần evidence. Moderation không thay
            authentication, authorization, sandbox hoặc effect limits.
          </p>
        </>
      )}
    </section>
  );
}
