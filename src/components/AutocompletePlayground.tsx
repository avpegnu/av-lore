import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  suggestionLookup,
  suggestionCorpus,
  suggestionRace,
  suggestionRequests,
} from '../lib/autocomplete-models';
export default function AutocompletePlayground({
  kind,
}: {
  kind: 'prefix-index' | 'suggestion-race';
}) {
  const ref = useIslandReady(),
    id = 'autocomplete-' + useId().replace(/:/g, '');
  const [query, setQuery] = useState('ca'),
    [k, setK] = useState(3),
    [fold, setFold] = useState(false),
    [mode, setMode] = useState<'cached' | 'overfetch' | 'build-filter'>('cached'),
    [time, setTime] = useState(190),
    [guard, setGuard] = useState(false);
  const result = suggestionLookup(query, k, fold, mode),
    race = suggestionRace(time, guard);
  return (
    <section className="handbook-experiment" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">AUTOCOMPLETE / PREFIXES AND REQUEST GENERATIONS</span>
      {kind === 'prefix-index' && (
        <>
          <h3 id={id}>Đi từ prefix tới danh sách đã xếp hạng</h3>
          <p>
            Corpus nhỏ được dựng lại trong browser để minh họa cấu trúc, không benchmark serving.
            Một term retired có score cao nhưng bị block. Đổi candidate budget để thấy filter sau
            top-K có thể trả thiếu kết quả.
          </p>
          <div className="worksheet-inputs">
            <label>
              Top-K requested<output>{k}</output>
              <input
                type="range"
                min={1}
                max={5}
                value={k}
                onChange={(e) => setK(+e.target.value)}
              />
            </label>
            <label>
              Prefix
              <input
                type="text"
                value={query}
                maxLength={24}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={fold} onChange={(e) => setFold(e.target.checked)} />
            Fold dấu tiếng Việt theo policy mẫu
          </label>
          <div className="worksheet-choices">
            {(['cached', 'overfetch', 'build-filter'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className="secondary"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
              >
                {m === 'cached'
                  ? 'Top-K rồi filter'
                  : m === 'overfetch'
                    ? 'Overfetch 2K rồi filter'
                    : 'Loại term khi build'}
              </button>
            ))}
          </div>
          <ol className="prefix-walk">
            {result.path.map((step, i) => (
              <li key={i}>
                <code translate="no">{step.prefix}</code>
                <span>matches: {step.matches}</span>
                <span translate="no">next: {step.next.join(' · ') || '—'}</span>
              </li>
            ))}
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Matching terms / current index</dt>
              <dd>{result.matched}</dd>
            </div>
            <div>
              <dt>Candidates fetched</dt>
              <dd>{result.candidates.length}</dd>
            </div>
            <div>
              <dt>Suggestions returned</dt>
              <dd>{result.results.length}</dd>
            </div>
            <div>
              <dt>Requested K</dt>
              <dd>{k}</dd>
            </div>
          </dl>
          <ol className="suggestion-results">
            {result.results.map((s) => (
              <li key={s.id}>
                <code translate="no">{s.text}</code>
                <span>score {s.score}</span>
              </li>
            ))}
          </ol>
          {!result.results.length && <p>Không có suggestion phù hợp.</p>}
          <details>
            <summary>Xem corpus và score mẫu</summary>
            <ul>
              {suggestionCorpus.map((s) => (
                <li key={s.id}>
                  <code translate="no">{s.text}</code> / {s.score}
                  {s.blocked ? ' / blocked' : ''}
                </li>
              ))}
            </ul>
          </details>
          <p>
            NFC làm các biểu diễn canonically equivalent giống nhau; bỏ dấu và đổi đ → d là policy
            bổ sung của ví dụ, không phải Unicode normalization mặc định. Ví dụ không làm fuzzy
            match; overfetch hữu hạn vẫn có thể trả ít hơn K nếu nhiều candidate bị filter.
          </p>
        </>
      )}
      {kind === 'suggestion-race' && (
        <>
          <h3 id={id}>Response cũ về sau có ghi đè từ đang gõ không?</h3>
          <p>
            Ba request được gửi cho c, ca và cat. Request c chậm nhất. Kéo clock hoặc bật generation
            guard; đây là replay theo timestamp, không gọi network thật. Guard chỉ apply response
            của generation hiện tại và clear kết quả cũ khi input đổi.
          </p>
          <div className="worksheet-inputs">
            <label>
              Replay clock / ms<output>{time}</output>
              <input
                type="range"
                min={0}
                max={350}
                step={10}
                value={time}
                onChange={(e) => setTime(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={guard} onChange={(e) => setGuard(e.target.checked)} />
            Chỉ apply response khớp input generation
          </label>
          <ol className="suggestion-request-list">
            {suggestionRequests.map((r) => (
              <li key={r.id} data-complete={r.complete <= time}>
                <code>
                  #{r.id} / {r.prefix}
                </code>
                <span>
                  send {r.sent} ms → complete {r.complete} ms
                </span>
                <strong>
                  {r.complete <= time ? 'Arrived' : r.sent <= time ? 'In flight' : 'Not sent'}
                </strong>
              </li>
            ))}
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Current input</dt>
              <dd>{race.current || '—'}</dd>
            </div>
            <div>
              <dt>Displayed result for prefix</dt>
              <dd>{race.displayed}</dd>
            </div>
            <div>
              <dt>Responses arrived</dt>
              <dd>{race.arrived.length}</dd>
            </div>
            <div>
              <dt>Stale UI overwrite</dt>
              <dd>{race.stale ? 1 : 0}</dd>
            </div>
          </dl>
          <p>
            Abort request là tối ưu tài nguyên, không thay generation check vì response/callback vẫn
            có thể race. Guard phải đổi ngay lúc input thay đổi, không chỉ khi debounce timer gửi
            request mới; query, locale, tenant và personalization context cũng thuộc identity.
          </p>
        </>
      )}
    </section>
  );
}
