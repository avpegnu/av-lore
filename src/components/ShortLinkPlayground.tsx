import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  encodeBase62,
  base62Steps,
  codeSpace,
  redirectReplay,
  type RedirectPolicy,
} from '../lib/short-link-models';
export default function ShortLinkPlayground({ kind }: { kind: 'url-space' | 'redirect-cache' }) {
  const ref = useIslandReady(),
    id = 'short-link-' + useId().replace(/:/g, '');
  const [length, setLength] = useState(7),
    [records, setRecords] = useState(365000),
    [input, setInput] = useState('365000000000');
  const [policy, setPolicy] = useState<RedirectPolicy>('fresh'),
    [ttl, setTtl] = useState(30),
    [updateAt, setUpdateAt] = useState(35),
    [status, setStatus] = useState(302);
  const valid = /^\d{1,20}$/.test(input),
    value = valid ? BigInt(input) : 0n,
    code = encodeBase62(value),
    result = codeSpace(length, records * 1000000),
    timeline = redirectReplay(policy, ttl, updateAt);
  return (
    <section className="handbook-experiment" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">SHORT LINKS / CAPACITY AND CACHE BEHAVIOR</span>
      {kind === 'url-space' && (
        <>
          <h3 id={id}>Mã ngắn chứa được bao nhiêu link?</h3>
          <p>
            Alphabet cố định: 0–9, a–z, A–Z. Đổi chiều dài namespace, số mã đã chiếm và ID để xem
            phép mã hóa. Số record nhập theo triệu; namespace là mã đúng L ký tự, có thể pad số 0
            phía trước.
          </p>
          <div className="worksheet-inputs">
            <label>
              Code length / L<output>{length}</output>
              <input
                type="range"
                min={3}
                max={11}
                value={length}
                onChange={(e) => setLength(+e.target.value)}
              />
            </label>
            <label>
              Occupied codes / million<output>{records.toLocaleString('en-US')}</output>
              <input
                type="range"
                min={1}
                max={500000}
                step={1}
                value={records}
                onChange={(e) => setRecords(+e.target.value)}
              />
            </label>
            <label>
              ID / decimal
              <input
                type="text"
                inputMode="numeric"
                maxLength={20}
                value={input}
                aria-invalid={!valid}
                onChange={(e) => setInput(e.target.value)}
              />
            </label>
          </div>
          {!valid ? (
            <p role="alert">Nhập từ 1 đến 20 chữ số thập phân, không có dấu.</p>
          ) : (
            <>
              <div className="url-encoded">
                <span>Base62</span>
                <code>{code}</code>
                <span>
                  {code.length <= length
                    ? 'ID vừa namespace đang chọn'
                    : 'ID vượt namespace đang chọn'}
                </span>
              </div>
              <details>
                <summary>Xem từng bước chia cho 62</summary>
                <ol>
                  {base62Steps(value).map((s, i) => (
                    <li key={i}>
                      <code>
                        {s.input} ÷ 62 = {s.quotient}; r = {s.remainder} → {s.digit}
                      </code>
                    </li>
                  ))}
                </ol>
                <p>Đọc các ký tự dư từ dưới lên. Đây là encoding, không phải encryption.</p>
              </details>
            </>
          )}
          {records * 1000000 > Number(result.space) && (
            <p role="status">
              Số mã yêu cầu vượt capacity: cấu hình này không thể tồn tại với uniqueness đang yêu
              cầu.
            </p>
          )}
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Namespace / 62^L</dt>
              <dd>{result.space.toLocaleString('en-US')}</dd>
            </div>
            <div>
              <dt>Occupied / %</dt>
              <dd>{(result.occupiedFraction * 100).toFixed(4)}</dd>
            </div>
            <div>
              <dt>Next random draw collision / %</dt>
              <dd>{(result.nextCollision * 100).toFixed(4)}</dd>
            </div>
            <div>
              <dt>Any collision in n raw draws / % ≈</dt>
              <dd>{(result.anyCollision * 100).toFixed(4)}</dd>
            </div>
          </dl>
          <p>
            Hai xác suất trả lời hai câu khác nhau: lần thử kế tiếp trúng một mã đã chiếm, và ít
            nhất một cặp trùng trong n lần sinh chưa dedup. Birthday approximation giả định các lần
            sinh độc lập, uniform và n nhỏ so với namespace; khi số mũ rất lớn, xác suất gần 100%.
            Dù xác suất thấp vẫn cần conditional insert; khi namespace đầy không thể tạo thêm mã
            cùng độ dài.
          </p>
        </>
      )}
      {kind === 'redirect-cache' && (
        <>
          <h3 id={id}>Đổi đích rồi, vì sao trình duyệt vẫn tới URL cũ?</h3>
          <p>
            Một browser bấm cùng link 10 lần ở giây 0, 10, …, 90. Origin đổi đích từ A sang B tại
            thời điểm đã chọn. Replay dùng response Cache-Control tường minh; không mô phỏng
            heuristic freshness hay cache lỗi chuẩn.
          </p>
          <div className="worksheet-inputs">
            <label>
              Freshness TTL / seconds<output>{ttl}</output>
              <input
                type="range"
                min={1}
                max={120}
                value={ttl}
                onChange={(e) => setTtl(+e.target.value)}
              />
            </label>
            <label>
              Target changes at / seconds<output>{updateAt}</output>
              <input
                type="range"
                min={5}
                max={85}
                step={5}
                value={updateAt}
                onChange={(e) => setUpdateAt(+e.target.value)}
              />
            </label>
          </div>
          <div className="worksheet-choices">
            {(['fresh', 'no-cache', 'no-store'] as const).map((p) => (
              <button
                type="button"
                className="secondary"
                key={p}
                aria-pressed={policy === p}
                onClick={() => setPolicy(p)}
              >
                {p === 'fresh' ? 'max-age=' + ttl : p}
              </button>
            ))}
          </div>
          <div className="worksheet-choices">
            {[301, 302].map((s) => (
              <button
                type="button"
                className="secondary"
                key={s}
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <pre>
            <code>{`HTTP/1.1 ${status} ${status === 301 ? 'Moved Permanently' : 'Found'}\nLocation: https://target.example/A\nCache-Control: ${policy === 'fresh' ? 'public, max-age=' + ttl : policy}`}</code>
          </pre>
          <ol className="redirect-replay">
            {timeline.events.map((e) => (
              <li key={e.at} data-stale={e.stale}>
                <strong>t={e.at}s</strong>
                <span>{e.origin ? 'Origin' : 'Browser cache'}</span>
                <code>→ {e.target}</code>
                {e.stale && <span>Đích cũ</span>}
              </li>
            ))}
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Origin requests / 10</dt>
              <dd>{timeline.originRequests}</dd>
            </div>
            <div>
              <dt>Old-target redirects / 10</dt>
              <dd>{timeline.staleRequests}</dd>
            </div>
          </dl>
          <p>
            Đổi 301 ↔ 302 với cùng max-age không xóa cache. no-cache vẫn cho lưu nhưng phải validate
            trước khi reuse; mô hình tính cả request validation là chạm origin. no-store không cho
            lưu response mới. Xóa cache CDN không xóa được response đã cache trên browser; đổi
            policy ở origin cũng không thu hồi bản đang còn fresh.
          </p>
        </>
      )}
    </section>
  );
}
