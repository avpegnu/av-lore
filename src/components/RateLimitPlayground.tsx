import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  rateReplay,
  rateStreams,
  counterRace,
  type LimitAlgorithm,
} from '../lib/rate-limit-models';
export default function RateLimitPlayground({ kind }: { kind: 'rate-race' | 'counter-race' }) {
  const ref = useIslandReady(),
    id = 'limiter-' + useId().replace(/:/g, '');
  const [limit, setLimit] = useState(6),
    [capacity, setCapacity] = useState(6),
    [windowMs, setWindowMs] = useState(1000),
    [stream, setStream] = useState<keyof typeof rateStreams>('boundary'),
    [contenders, setContenders] = useState(2),
    [atomic, setAtomic] = useState(false);
  const algorithms: [LimitAlgorithm, string][] = [
    ['token', 'Token bucket'],
    ['leaky', 'Leaky bucket queue'],
    ['fixed', 'Fixed window'],
    ['log', 'Sliding log'],
    ['counter', 'Sliding counter'],
  ];
  const race = counterRace(contenders, atomic);
  const replays = algorithms.map(([algorithm, name]) => ({
    algorithm,
    name,
    result: rateReplay(algorithm, rateStreams[stream], limit, capacity, windowMs),
  }));
  const timelineEnd =
    Math.ceil(
      Math.max(
        windowMs * 2,
        ...replays.flatMap(({ result }) => result.events.map((e) => e.releaseAt)),
      ) / windowMs,
    ) * windowMs;
  const x = (at: number) => 64 + (at / timelineEnd) * 560;
  return (
    <section className="handbook-experiment" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">RATE LIMITS / SAME TRAFFIC, DIFFERENT CONTRACTS</span>
      {kind === 'rate-race' && (
        <>
          <h3 id={id}>Năm thuật toán, cùng một traffic</h3>
          <p>
            Chọn limit N và window W. Mỗi request tốn một unit; token bucket refill N/W, leaky queue
            xử lý cùng tốc độ và sức chứa gồm cả request đang phục vụ. Rolling window dùng khoảng
            (t−W, t]. Dữ liệu đầu vào giữ nguyên khi đổi W để so sánh tác động của contract.
          </p>
          <div className="worksheet-inputs">
            <label>
              Limit / window<output>{limit}</output>
              <input
                type="range"
                min={2}
                max={12}
                value={limit}
                onChange={(e) => setLimit(+e.target.value)}
              />
            </label>
            <label>
              Bucket / buffer capacity<output>{capacity}</output>
              <input
                type="range"
                min={2}
                max={16}
                value={capacity}
                onChange={(e) => setCapacity(+e.target.value)}
              />
            </label>
            <label>
              Window / ms<output>{windowMs}</output>
              <input
                type="range"
                min={1000}
                max={5000}
                step={500}
                value={windowMs}
                onChange={(e) => setWindowMs(+e.target.value)}
              />
            </label>
          </div>
          <div className="worksheet-choices">
            {Object.keys(rateStreams).map((s) => (
              <button
                type="button"
                key={s}
                className="secondary"
                aria-pressed={stream === s}
                onClick={() => setStream(s as keyof typeof rateStreams)}
              >
                {s === 'boundary'
                  ? 'Sát ranh giới window'
                  : s === 'steady'
                    ? 'Traffic đều'
                    : 'Các đợt burst'}
              </button>
            ))}
          </div>
          <p>
            Trên cùng trục thời gian: vòng tròn là request được nhận, dấu × là từ chối, hình thoi là
            lúc rời queue. Đường nối thể hiện thời gian trong queue; các vạch dọc mờ là ranh giới
            fixed window. Kéo ngang biểu đồ trên màn hình nhỏ.
          </p>
          <div className="rate-comparison">
            {replays.map(({ algorithm, name, result }) => (
              <div className="rate-algorithm" key={algorithm}>
                <header>
                  <strong>{name}</strong>
                  <span>
                    {result.allowed} / {result.events.length}
                  </span>
                </header>
                <div className="rate-time-region" role="region" aria-label={name} tabIndex={0}>
                  <svg viewBox="0 0 660 112" role="img" aria-label="Thời điểm đến và rời mô hình">
                    <text x="4" y="35">
                      Arrival
                    </text>
                    <text x="4" y="77">
                      Release
                    </text>
                    {Array.from({ length: Math.floor(timelineEnd / windowMs) + 1 }, (_, i) => (
                      <line
                        className="rate-window-boundary"
                        key={i}
                        x1={x(i * windowMs)}
                        x2={x(i * windowMs)}
                        y1="12"
                        y2="88"
                      />
                    ))}
                    {result.events.map((e, i) => (
                      <g key={i}>
                        <title>{`#${i + 1}: arrival=${e.at} ms; ${e.accepted ? 'admitted' : 'rejected'}${e.accepted ? `; release=${e.releaseAt.toFixed(1)} ms` : ''}`}</title>
                        {e.accepted ? (
                          <>
                            <line
                              className="rate-delay-line"
                              x1={x(e.at)}
                              x2={x(e.releaseAt)}
                              y1="32"
                              y2="74"
                            />
                            <circle className="rate-admission" cx={x(e.at)} cy="32" r="4" />
                            <path
                              className="rate-release"
                              d={`M ${x(e.releaseAt)} 69 l 5 5 -5 5 -5 -5 Z`}
                            />
                          </>
                        ) : (
                          <path
                            className="rate-rejection"
                            d={`M ${x(e.at) - 4} 28 l 8 8 m 0 -8 l -8 8`}
                          />
                        )}
                      </g>
                    ))}
                    <text x="64" y="106">
                      0 ms
                    </text>
                    <text x="624" y="106" textAnchor="end">
                      {timelineEnd} ms
                    </text>
                  </svg>
                </div>
                <ol aria-label={name}>
                  {result.events.map((e, i) => (
                    <li
                      key={i}
                      data-allowed={e.accepted}
                      title={`t=${e.at} ms; ${e.accepted ? 'accepted' : 'rejected'}; release=${e.releaseAt.toFixed(1)} ms`}
                    >
                      {e.accepted ? '✓' : '×'}
                    </li>
                  ))}
                </ol>
                <dl>
                  <div>
                    <dt>Max admitted / rolling window</dt>
                    <dd>{result.peakWindow}</dd>
                  </div>
                  <div>
                    <dt>Max queue delay / ms</dt>
                    <dd>{result.maxDelay.toFixed(1)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
          <p>
            ✓ là nhận vào, × là từ chối; leaky queue nhận vào không có nghĩa chạy ngay. Sliding
            counter là xấp xỉ theo phân bố request; chart không biến nó thành strict rolling limit.
            Đây là replay deterministic, không đo performance của server.
          </p>
        </>
      )}
      {kind === 'counter-race' && (
        <>
          <h3 id={id}>Counter báo 5 nhưng có thể đã cho qua hơn 5</h3>
          <p>
            Counter hiện là 4, limit là 5. Các contender cùng đọc state trước khi ghi trong mode
            không atomic. So số request được nhận với giá trị counter cuối.
          </p>
          <div className="worksheet-inputs">
            <label>
              Concurrent contenders<output>{contenders}</output>
              <input
                type="range"
                min={2}
                max={8}
                value={contenders}
                onChange={(e) => setContenders(+e.target.value)}
              />
            </label>
          </div>
          <div className="worksheet-choices">
            <button
              type="button"
              className="secondary"
              aria-pressed={!atomic}
              onClick={() => setAtomic(false)}
            >
              Read → compare → write
            </button>
            <button
              type="button"
              className="secondary"
              aria-pressed={atomic}
              onClick={() => setAtomic(true)}
            >
              Atomic check + spend
            </button>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Requests admitted</dt>
              <dd>{race.allowed}</dd>
            </div>
            <div>
              <dt>Final stored counter</dt>
              <dd>{race.storedCount}</dd>
            </div>
          </dl>
          <p>
            Atomic ở đây là một decision không interleave trên cùng key/state. Replication/failover,
            nhiều key ở nhiều shard và quota billing durable là các vấn đề riêng.
          </p>
        </>
      )}
    </section>
  );
}
