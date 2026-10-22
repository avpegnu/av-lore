import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { searchIndex, searchCorpus, searchFanout, searchFreshness } from '../lib/search-models';
export default function SearchPlayground({
  kind,
}: {
  kind: 'search-index' | 'search-fanout' | 'search-refresh';
}) {
  const ref = useIslandReady(),
    id = 'search-' + useId().replace(/:/g, ''),
    [query, setQuery] = useState('cache redis'),
    [and, setAnd] = useState(true),
    [b, setB] = useState(0.75),
    [before, setBefore] = useState(true),
    [k, setK] = useState(2),
    [shards, setShards] = useState(64),
    [slow, setSlow] = useState(1),
    [hedge, setHedge] = useState(false),
    [delay, setDelay] = useState(30),
    [deadline, setDeadline] = useState(80),
    [partial, setPartial] = useState(false),
    [stage, setStage] = useState(4),
    [guard, setGuard] = useState(true);
  const index = searchIndex(query, and, b, before, k),
    fan = searchFanout(shards, slow, hedge, delay, deadline, partial),
    fresh = searchFreshness(stage, guard);
  return (
    <section className="handbook-experiment search-playground" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">SEARCH / CANDIDATES, LATENCY AND VISIBILITY</span>
      {kind === 'search-index' && (
        <>
          <h3 id={id}>Nhìn posting lists trước khi nhìn score</h3>
          <p>
            Năm documents tiếng Anh là fixture công khai cho lab; d2 cố ý được đánh dấu private đối
            với simulated caller. Analyzer chỉ lowercase và tách ASCII words, không
            stemming/synonyms hoặc xử lý tiếng Việt. BM25 minh họa dùng k1=1.2, b điều chỉnh được và
            shared corpus statistics; đây không phải byte-identical Lucene scorer. Query terms trùng
            được dedup trong fixture.
          </p>
          <label className="search-query">
            Query
            <input
              type="text"
              maxLength={120}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={and} onChange={(e) => setAnd(e.target.checked)} />
            Match mọi query term bằng AND
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={before} onChange={(e) => setBefore(e.target.checked)} />
            Lọc authorized documents trước top-K
          </label>
          <div className="worksheet-inputs">
            <label>
              Length normalization b<output>{b.toFixed(2)}</output>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={b}
                onChange={(e) => setB(+e.target.value)}
              />
            </label>
          </div>
          <div className="search-actions">
            {[2, 3, 5].map((n) => (
              <button
                type="button"
                key={n}
                data-k={n}
                aria-pressed={k === n}
                onClick={() => setK(n)}
              >
                K = {n}
              </button>
            ))}
          </div>
          <div className="search-postings">
            {index.postings.map((p) => (
              <section key={p.term}>
                <h4>
                  {p.term} · df {p.rows.length}
                </h4>
                {p.rows.map((r) => (
                  <p key={r.id}>
                    {r.id}: tf {r.tf} · positions [{r.positions.join(', ')}]
                  </p>
                ))}
              </section>
            ))}
          </div>
          <figure className="handbook-table">
            <div tabIndex={0} role="region" aria-label="Synthetic search corpus">
              <table>
                <thead>
                  <tr>
                    {['Document', 'Text', 'Access'].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {searchCorpus.map((d) => (
                    <tr key={d.id}>
                      <td>{d.id}</td>
                      <td>{d.text}</td>
                      <td>{d.public ? 'PUBLIC' : 'PRIVATE_FIXTURE'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Analyzed terms / mode</dt>
              <dd>
                {index.terms.join(', ') || '—'} / {and ? 'AND' : 'OR'}
              </dd>
            </div>
            <div>
              <dt>Selected candidate IDs</dt>
              <dd>{index.candidates.map((d) => d.id).join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Returned authorized IDs</dt>
              <dd>{index.results.map((d) => d.id).join(', ') || '—'}</dd>
            </div>
          </dl>
          <div className="search-results">
            {index.results.map((d) => (
              <article key={d.id}>
                <h4>
                  {d.id} · {d.score.toFixed(4)}
                </h4>
                <p>{d.text}</p>
                <details>
                  <summary>Score explanation</summary>
                  {d.parts.map((p) => (
                    <p key={p.term}>
                      {p.term}: tf={p.tf}, df={p.df}, idf={p.idf.toFixed(4)}, contribution=
                      {p.score.toFixed(4)}
                    </p>
                  ))}
                </details>
              </article>
            ))}
          </div>
          <p>
            Default cache redis/AND/K2: prefilter trả d5 và d1. Chuyển filter sau top-K chỉ còn d5
            vì d2 đã chiếm candidate slot; bỏ private payload ở cuối không sửa được lost recall.
            Production còn enforce quyền hiện hành tại cache/hydration/snippet, không chỉ một cached
            ACL trong index. Fixture private text hiển thị để học, không phải ví dụ leak dữ liệu
            thật.
          </p>
        </>
      )}
      {kind === 'search-fanout' && (
        <>
          <h3 id={id}>Tail probability và request trace là hai cách nhìn</h3>
          <p>
            Panel probability giả định N shards có cùng xác suất slow độc lập: P(any
            slow)=1−(1−p)^N. Correlated overload/GC/network phá giả định này. Bảng trace riêng luôn
            có bốn shard requests với thời gian cố định; không phải benchmark và không tăng số rows
            theo N. Hedge tạo thêm request nếu primary còn pending tại delay, dùng min(primary,
            delay+backup).
          </p>
          <div className="worksheet-inputs">
            <label>
              Analytical shard count N<output>{shards}</output>
              <input
                type="range"
                min="1"
                max="128"
                value={shards}
                onChange={(e) => setShards(+e.target.value)}
              />
            </label>
            <label>
              Per-shard slow probability, %<output>{slow}</output>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={slow}
                onChange={(e) => setSlow(+e.target.value)}
              />
            </label>
            <label>
              Hedge delay, ms<output>{delay}</output>
              <input
                type="range"
                min="0"
                max="150"
                value={delay}
                onChange={(e) => setDelay(+e.target.value)}
              />
            </label>
            <label>
              Query deadline, ms<output>{deadline}</output>
              <input
                type="range"
                min="20"
                max="250"
                value={deadline}
                onChange={(e) => setDeadline(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={hedge} onChange={(e) => setHedge(e.target.checked)} />
            Bật hedging trong trace bốn shards
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={partial}
              onChange={(e) => setPartial(e.target.checked)}
            />
            Cho phép explicit partial results khi hết deadline
          </label>
          <figure className="handbook-table">
            <div tabIndex={0} role="region" aria-label="Fixed shard request trace">
              <table>
                <thead>
                  <tr>
                    {['Shard', 'Primary ms', 'Backup service ms', 'Finish ms', 'At deadline'].map(
                      (h) => (
                        <th key={h}>{h}</th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {fan.rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.primary}</td>
                      <td>{r.backup}</td>
                      <td>{r.done}</td>
                      <td>{r.returned ? 'RETURNED' : 'MISSING'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Any slow probability</dt>
              <dd>{(fan.anySlowProbability * 100).toFixed(2)}%</dd>
            </div>
            <div>
              <dt>Four-shard trace status</dt>
              <dd>{fan.status}</dd>
            </div>
            <div>
              <dt>Usable shard responses</dt>
              <dd>{fan.usable} / 4</dd>
            </div>
            <div>
              <dt>Trace query duration, ms</dt>
              <dd>{fan.duration}</dd>
            </div>
            <div>
              <dt>Extra hedge requests</dt>
              <dd>{fan.extraRequests}</dd>
            </div>
          </dl>
          <p>
            Default deadline 80 không hedge: thiếu shard 3 nên fail closed; bật partial trả 3/4
            nhưng không được gọi là complete global top-K. Hedge delay 30 giúp trace hoàn tất 75 ms,
            đổi lại thêm 3 requests. Replica correlation, cancellation delay và saturation cost
            không được đo trong fixture; production cần hedge budget và fair admission để không
            khuếch đại overload.
          </p>
        </>
      )}
      {kind === 'search-refresh' && (
        <>
          <h3 id={id}>Refresh, merge và version guard không cùng nhiệm vụ</h3>
          <p>
            Document D ban đầu v1 chứa cache. Source delete v2 được accepted vào recoverable
            ingest/write path; reader cũ vẫn thấy v1 tới refresh. Sau đó late update v1 tới. Version
            guard giữ v2 để reject stale event; nếu tắt guard, lần refresh sau revive deleted
            content. Lab giả định persistence boundary đã được bảo vệ, không mô phỏng fsync hoặc
            crash recovery thật.
          </p>
          <div className="worksheet-inputs">
            <label>
              Index lifecycle step<output>{stage} / 5</output>
              <input
                type="range"
                min="0"
                max="5"
                value={stage}
                onChange={(e) => setStage(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={guard} onChange={(e) => setGuard(e.target.checked)} />
            Giữ per-document version/tombstone guard
          </label>
          <ol className="search-timeline">
            {[
              'Reader v1 searchable',
              'Delete v2 accepted; chưa refresh',
              'Refresh: reader không thấy D',
              'Late update v1 tới writer',
              'Refresh sau late update',
              'Merge reclaim obsolete physical bodies',
            ].map((s, i) => (
              <li key={s} aria-current={stage === i ? 'step' : undefined}>
                <strong>#{i}</strong> {s}
              </li>
            ))}
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Source version / exists</dt>
              <dd>
                {fresh.sourceVersion} / {fresh.sourceExists ? 'YES' : 'NO'}
              </dd>
            </div>
            <div>
              <dt>Visible document version / searchable</dt>
              <dd>
                {fresh.readerVersion} / {fresh.searchable ? 'YES' : 'NO'}
              </dd>
            </div>
            <div>
              <dt>Late event handling</dt>
              <dd>{fresh.lateEvent}</dd>
            </div>
            <div>
              <dt>Physical body copies</dt>
              <dd>{fresh.physicalBodyCopies}</dd>
            </div>
            <div>
              <dt>Retained version guard</dt>
              <dd>{fresh.retainedVersionGuard ?? '—'}</dd>
            </div>
          </dl>
          <p>
            Ở bước 2 delete đã invisible nhưng old body còn trên disk; tới merge mới reclaim theo
            reader-safe policy. Không được suy search visibility đồng nghĩa bytes đã xóa khỏi mọi
            replica/backup. Guard metadata vẫn cần theo supported replay window hoặc rebuild
            protocol; xóa tombstone quá sớm có thể revive stale events. Refresh publish reader,
            không phải per-write durability ACK.
          </p>
        </>
      )}
    </section>
  );
}
