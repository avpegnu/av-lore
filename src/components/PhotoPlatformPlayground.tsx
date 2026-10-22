import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { photoIds, photoPublication, storyEligibility } from '../lib/photo-platform-models';
export default function PhotoPlatformPlayground({
  kind,
}: {
  kind: 'photo-ids' | 'photo-publish' | 'photo-stories';
}) {
  const ref = useIslandReady(),
    id = 'photo-' + useId().replace(/:/g, '');
  const [count, setCount] = useState(1100),
    [guard, setGuard] = useState(true),
    [owners, setOwners] = useState(false),
    [rollback, setRollback] = useState(false),
    [shard, setShard] = useState(1341),
    [hosts, setHosts] = useState(4);
  const [stage, setStage] = useState(6),
    [early, setEarly] = useState(false),
    [intent, setIntent] = useState(true),
    [versions, setVersions] = useState(true);
  const [hour, setHour] = useState(23),
    [delay, setDelay] = useState(3),
    [expiry, setExpiry] = useState(true),
    [watermark, setWatermark] = useState(false),
    [archive, setArchive] = useState(true);
  const ids = photoIds(count, guard, owners, rollback, shard),
    pub = photoPublication(stage, early, intent, versions),
    story = storyEligibility(hour, delay, expiry, watermark, archive);
  return (
    <section ref={ref} className="handbook-experiment photo-playground" aria-labelledby={id}>
      <span className="eyebrow">PHOTO PLATFORM / IDENTITY, PUBLICATION AND EXPIRY</span>
      {kind === 'photo-ids' && (
        <>
          <h3 id={id}>Một ID cần nhiều hơn phép bit shift</h3>
          <p>
            Fixture đặt timestamp ở 2³⁵ + 1 ms từ epoch tùy chọn, shard 13 bits và sequence 10 bits.
            Cùng burst có thể vượt 1024 IDs/ms. Guard đặt trước logical timestamps: production phải
            chờ wall clock bắt kịp trước khi phát ID; đây không là allocator chạy thực.
          </p>
          <div className="worksheet-inputs">
            <label>
              Requests / burst<output>{count}</output>
              <input
                type="range"
                min="1"
                max="1300"
                value={count}
                onChange={(e) => setCount(+e.target.value)}
              />
            </label>
            <label>
              Logical shard<output>{shard}</output>
              <input
                type="range"
                min="0"
                max="8191"
                value={shard}
                onChange={(e) => setShard(+e.target.value)}
              />
            </label>
            <label>
              Physical hosts<output>{hosts}</output>
              <input
                type="range"
                min="2"
                max="16"
                step="2"
                value={hosts}
                onChange={(e) => setHosts(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={guard} onChange={(e) => setGuard(e.target.checked)} />
            Guard overflow và clock rollback bằng monotonic reservation
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={owners} onChange={(e) => setOwners(e.target.checked)} />
            Hai owners cùng shard, cùng sequence state
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={rollback}
              onChange={(e) => setRollback(e.target.checked)}
            />
            Wall clock lùi 1 ms giữa burst
          </label>
          <figure className="photo-bit-fields">
            <div role="region" tabIndex={0} aria-label="Time, shard and sequence bit fields">
              {ids.bits.map((bits, i) => (
                <section key={i}>
                  <strong>{['TIME / 41', 'SHARD / 13', 'SEQUENCE / 10'][i]}</strong>
                  <code>{bits}</code>
                </section>
              ))}
            </div>
            <figcaption>
              Logical shard → physical host dùng range map minh họa; đổi hosts không đổi ID hoặc
              logical shard. Một migration thật phải copy/catch up, fence owner và cập nhật routing
              epoch.
            </figcaption>
          </figure>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Reserved IDs</dt>
              <dd>{ids.issued}</dd>
            </div>
            <div>
              <dt>Duplicate IDs</dt>
              <dd>{ids.duplicates}</dd>
            </div>
            <div>
              <dt>Requests phải chờ wall clock</dt>
              <dd>{ids.deferred}</dd>
            </div>
            <div>
              <dt>Decoded shard / host</dt>
              <dd>
                {ids.shard} / {Math.floor((ids.shard * hosts) / 8192) + 1}
              </dd>
            </div>
            <div>
              <dt>Decoded time / sequence</dt>
              <dd>
                {ids.time} / {ids.sequence}
              </dd>
            </div>
            <div>
              <dt>Number làm mất bits?</dt>
              <dd>{ids.numberLoss ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Fits positive signed bigint?</dt>
              <dd>{ids.signedPositive ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>IDs đi lùi?</dt>
              <dd>{ids.backwards ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <p className="photo-identifier">
            <code>{ids.latest}</code>
          </p>
          <p className="muted">
            Serialize ID thành decimal string qua JSON. Local sequence guard không bảo vệ hai
            owners, restart mất state hoặc clock rollback vượt retention. Full 41-bit time window
            dài khoảng 69.7 năm; signed positive 64-bit với layout này chỉ dùng khoảng 34.8 năm
            trước sign bit. Sort theo ID không chứng minh commit order hay causality.
          </p>
        </>
      )}
      {kind === 'photo-publish' && (
        <>
          <h3 id={id}>Upload xong chưa đồng nghĩa bài đã publish an toàn</h3>
          <p>
            Đi qua blob upload, validation, commit metadata, derivative ready, delete và worker cũ
            đến muộn. Outbox toggle biểu diễn durable intent có hay bị mất trong crash gap; worker
            chỉ chạy nếu có intent. Generation guard tách khỏi readiness guard.
          </p>
          <label>
            Publication step<output>{stage} / 6</output>
            <input
              type="range"
              min="0"
              max="6"
              value={stage}
              onChange={(e) => setStage(+e.target.value)}
            />
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={early} onChange={(e) => setEarly(e.target.checked)} />
            Cho public visibility trước khi rendition ready
          </label>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={intent} onChange={(e) => setIntent(e.target.checked)} />
            Commit metadata và durable processing intent cùng boundary
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={versions}
              onChange={(e) => setVersions(e.target.checked)}
            />
            Reject stale worker bằng generation/tombstone
          </label>
          <ol className="platform-history">
            {[
              '0 / Empty',
              '1 / Blob uploaded',
              '2 / Validated',
              '3 / Metadata commit',
              '4 / Rendition ready',
              '5 / Delete version 2',
              '6 / Late worker version 1',
            ].map((s, i) => (
              <li key={s} data-active={stage === i} data-past={stage > i}>
                {s}
              </li>
            ))}
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Metadata state</dt>
              <dd>{pub.state}</dd>
            </div>
            <div>
              <dt>Publicly visible</dt>
              <dd>{pub.visible ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Generation</dt>
              <dd>{pub.generation}</dd>
            </div>
            <div>
              <dt>Visible without ready media?</dt>
              <dd>{pub.brokenReference ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Deleted post resurrected?</dt>
              <dd>{pub.resurrected ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Stuck processing?</dt>
              <dd>{pub.stuckProcessing ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <p>
            <code>{pub.history.join(' → ') || '—'}</code>
          </p>
          <p className="muted">
            Delete ở đây chặn serving, không chứng minh đã physical-purge CDN, originals, backups
            hay mọi derived index. Worker outputs cần immutable generation keys và checks trước
            publish. Orphan uploads cần lifecycle cleanup sau grace period; retry finalize cần cùng
            idempotency identity.
          </p>
        </>
      )}
      {kind === 'photo-stories' && (
        <>
          <h3 id={id}>Stories: expiry, cache và seen state là ba việc khác nhau</h3>
          <p>
            Bốn story IDs 100–103 hết hạn ở hour 24; 103 đã bị delete. Viewer đã xem 100 và 102, còn
            101 chưa xem vì playback out-of-order. Cache cleanup có thể chậm. Lab kiểm tra
            eligibility tại read time và so exact seen set với max-ID watermark.
          </p>
          <div className="worksheet-inputs">
            <label>
              Server hour<output>{hour}</output>
              <input
                type="range"
                min="23"
                max="28"
                value={hour}
                onChange={(e) => setHour(+e.target.value)}
              />
            </label>
            <label>
              Cache cleanup delay<output>{delay} h</output>
              <input
                type="range"
                min="0"
                max="4"
                value={delay}
                onChange={(e) => setDelay(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={expiry} onChange={(e) => setExpiry(e.target.checked)} />
            Check expires_at bằng server time trước serving
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={watermark}
              onChange={(e) => setWatermark(e.target.checked)}
            />
            Nén seen state thành maximum viewed ID
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={archive}
              onChange={(e) => setArchive(e.target.checked)}
            />
            Giữ archive riêng cho policy đã chọn
          </label>
          <div className="photo-story-cards">
            {story.returned.map((s) => (
              <article key={s.id}>
                <strong>Story {s.id}</strong>
                <p>{s.seen ? 'SEEN' : 'UNSEEN'}</p>
                <span>{hour >= s.expires ? 'EXPIRED' : 'ELIGIBLE'}</span>
              </article>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Cache entries còn lại</dt>
              <dd>{story.cached}</dd>
            </div>
            <div>
              <dt>Returned stories</dt>
              <dd>{story.returned.length}</dd>
            </div>
            <div>
              <dt>Expired stories returned</dt>
              <dd>{story.expiredReturned}</dd>
            </div>
            <div>
              <dt>Unseen story marked seen</dt>
              <dd>{story.falselySeen}</dd>
            </div>
            <div>
              <dt>Archive retained records</dt>
              <dd>{story.archiveRetained}</dd>
            </div>
          </dl>
          <p className="muted">
            Watermark chỉ exact nếu semantics bảo đảm mọi item trước nó đã xem; out-of-order cần
            holes/set hoặc chấp nhận approximate. Archive không làm story hết hạn xuất hiện lại
            trong tray. Cache eviction, product expiry, user deletion và backup retention cần
            contracts riêng; không lấy TTL làm bằng chứng đã xóa mọi bản sao.
          </p>
        </>
      )}
    </section>
  );
}
