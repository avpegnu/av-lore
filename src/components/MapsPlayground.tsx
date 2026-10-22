import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { tileBudget, viewportTiles, routeSearch, roadNodes, blendedEta } from '../lib/maps-models';
export default function MapsPlayground({
  kind,
}: {
  kind: 'maps-tiles' | 'maps-routing' | 'maps-eta';
}) {
  const ref = useIslandReady(),
    id = 'maps-' + useId().replace(/:/g, '');
  const [zoom, setZoom] = useState(5),
    [tileKB, setTileKB] = useState(25),
    [pan, setPan] = useState(0),
    [version, setVersion] = useState('v1'),
    [style, setStyle] = useState(false);
  const [cache, setCache] = useState(() => new Set(viewportTiles(5, 0, 'v1').unique)),
    [fresh, setFresh] = useState(() => viewportTiles(5, 0, 'v1').unique);
  const [algorithm, setAlgorithm] = useState<'dijkstra' | 'astar'>('astar'),
    [congestion, setCongestion] = useState(1),
    [closed, setClosed] = useState(false),
    [step, setStep] = useState(40);
  const [age, setAge] = useState(0),
    [samples, setSamples] = useState(20),
    [live, setLive] = useState(20);
  const budget = tileBudget(zoom, tileKB),
    view = viewportTiles(zoom, pan, version),
    route = routeSearch(algorithm, congestion, closed),
    other = routeSearch(algorithm === 'astar' ? 'dijkstra' : 'astar', congestion, closed),
    visibleSteps = Math.min(step, route.order.length),
    visited = new Set(route.order.slice(0, visibleSteps)),
    finished = visibleSteps === route.order.length,
    eta = blendedEta(age, samples, live);
  const load = (z: number, p: number, v: string) => {
    const next = viewportTiles(z, p, v).unique;
    setFresh(next.filter((k) => !cache.has(k)));
    setCache(new Set([...cache, ...next]));
    setZoom(z);
    setPan(p);
    setVersion(v);
  };
  const x = (n: number) => 60 + roadNodes[n].x * 86,
    y = (n: number) => 60 + roadNodes[n].y * 90,
    fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 3 });
  return (
    <section className="handbook-experiment maps-playground" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">MAPS / VIEWPORTS, ROUTING AND EVIDENCE</span>
      {kind === 'maps-tiles' && (
        <>
          <h3 id={id}>Một viewport nhỏ giữa hàng nghìn tỷ tiles</h3>
          <p>
            Đây là lưới giả định với tiles 256 px và viewport 768 ×512 px lệch khỏi tile boundaries.
            Chỉ fetch các keys giao viewport; x wrap quanh thế giới, y clip ở biên. Keys chứa map
            version. Cache trong bài thử không có eviction và không tải bản đồ thật.
          </p>
          <div className="worksheet-inputs">
            <label>
              Zoom / z<output>{zoom}</output>
              <input
                type="range"
                min="0"
                max="21"
                value={zoom}
                onChange={(e) => load(+e.target.value, 0, version)}
              />
            </label>
            <label>
              Tile payload giả định / KB<output>{tileKB}</output>
              <input
                type="range"
                min="1"
                max="100"
                value={tileKB}
                onChange={(e) => setTileKB(+e.target.value)}
              />
            </label>
          </div>
          <div className="worksheet-actions">
            <button type="button" disabled={pan <= -8} onClick={() => load(zoom, pan - 1, version)}>
              ← Pan một tile
            </button>
            <button type="button" disabled={pan >= 8} onClick={() => load(zoom, pan + 1, version)}>
              Pan một tile →
            </button>
            <button type="button" onClick={() => load(zoom, pan, version === 'v1' ? 'v2' : 'v1')}>
              Đổi map version
            </button>
            <button
              type="button"
              onClick={() => {
                setStyle(!style);
                load(zoom, pan, version);
              }}
            >
              Đổi vector style
            </button>
          </div>
          <p>
            Version <strong>{version}</strong> · Pan <strong>{pan}</strong> · Style{' '}
            <strong>{style ? 'B' : 'A'}</strong>. Viền đậm là viewport; tile có nét đứt cần tải mới
            trong thao tác vừa rồi. Tiles ở ngoài viewport không được vẽ; màu style không thay data
            keys.
          </p>
          <div
            className="maps-chart"
            tabIndex={0}
            role="region"
            aria-label="Synthetic viewport tile cache"
          >
            <svg
              viewBox="0 0 680 520"
              role="img"
              aria-label="Visible versioned tile keys with viewport boundary"
              data-style={style ? 'b' : 'a'}
            >
              <title>Only intersected tiles are requested; map versions separate cache keys</title>
              {view.tiles.map((t) => (
                <g key={`${t.dx}/${t.dy}`} data-fresh={fresh.includes(t.key)} className="maps-tile">
                  <rect
                    x={30 + (t.dx + 1) * 150}
                    y={25 + (t.dy + 1) * 150}
                    width="150"
                    height="150"
                  />
                  <text x={105 + (t.dx + 1) * 150} y={70 + (t.dy + 1) * 150} textAnchor="middle">
                    z {zoom}
                  </text>
                  <text x={105 + (t.dx + 1) * 150} y={92 + (t.dy + 1) * 150} textAnchor="middle">
                    x {t.x}
                  </text>
                  <text x={105 + (t.dx + 1) * 150} y={116 + (t.dy + 1) * 150} textAnchor="middle">
                    y {t.y}
                  </text>
                  <text x={105 + (t.dx + 1) * 150} y={144 + (t.dy + 1) * 150} textAnchor="middle">
                    {version}
                  </text>
                </g>
              ))}
              <rect x="67.5" y="100" width="450" height="300" className="maps-viewport" />
              <text x="30" y="507">
                768 ×512 px / horizontal wrap, vertical clip
              </text>
            </svg>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Tiles của zoom hiện tại / toàn thế giới</dt>
              <dd>{fmt(budget.level)}</dd>
            </div>
            <div>
              <dt>Tổng tiles / z0 tới z</dt>
              <dd>{fmt(budget.pyramid)}</dd>
            </div>
            <div>
              <dt>Payload dense pyramid giả định / PB</dt>
              <dd>{fmt(budget.naivePB)}</dd>
            </div>
            <div>
              <dt>Số keys duy nhất trong viewport</dt>
              <dd>{view.unique.length}</dd>
            </div>
            <div>
              <dt>Tiles tải mới / thao tác vừa rồi</dt>
              <dd>{fresh.length}</dd>
            </div>
            <div>
              <dt>Cache hits / thao tác vừa rồi</dt>
              <dd>{view.unique.length - fresh.length}</dd>
            </div>
            <div>
              <dt>Keys đang giữ trong cache mô phỏng</dt>
              <dd>{cache.size}</dd>
            </div>
          </dl>
          <details>
            <summary>Danh sách keys và giả định cache</summary>
            <ul>
              {view.unique.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
            <p>
              At zoom ≥3, pan một tile giữ lại 9 keys và tải 3 keys mới ở lượt đầu. Đổi sang version
              chưa có trong cache tải lại toàn viewport; đổi style giữ cùng vector data. Real
              clients còn cần glyphs, sprites, style/source compatibility, cache quota và prefetch
              policy. Full-pyramid bytes dùng payload cố định; chưa có sparse generation,
              compression variation hoặc dedup.
            </p>
          </details>
        </>
      )}
      {kind === 'maps-routing' && (
        <>
          <h3 id={id}>Dijkstra và A*: cùng bài toán, khác thứ tự khám phá</h3>
          <p>
            Đồ thị giả định có 40 nodes, roads hai chiều và hai cầu qua một ranh giới. Mỗi cạnh dài
            1 km; thời gian không âm được cố định suốt query. A* dùng straight-line distance chia
            speed bound 60 km/h. Đây là lower bound nhất quán trong mô hình; không giả định A* luôn
            thắng ở mọi graph.
          </p>
          <div className="worksheet-actions">
            {(['dijkstra', 'astar'] as const).map((a) => (
              <button
                type="button"
                key={a}
                aria-pressed={algorithm === a}
                onClick={() => {
                  setAlgorithm(a);
                  setStep(40);
                }}
              >
                {a === 'astar' ? 'A*' : 'Dijkstra'}
              </button>
            ))}
          </div>
          <div className="worksheet-inputs">
            <label>
              Thời gian cạnh bị congestion / phút<output>{congestion}</output>
              <input
                type="range"
                min="1"
                max="6"
                value={congestion}
                onChange={(e) => {
                  setCongestion(+e.target.value);
                  setStep(40);
                }}
              />
            </label>
            <label>
              Replay các nodes đã settled
              <output>
                {visibleSteps} / {route.order.length}
              </output>
              <input
                type="range"
                min="0"
                max={route.order.length}
                value={visibleSteps}
                onChange={(e) => setStep(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={closed}
              onChange={(e) => {
                setClosed(e.target.checked);
                setStep(40);
              }}
            />
            Đóng cầu giữa: hard constraint
          </label>
          <div
            className="maps-chart"
            tabIndex={0}
            role="region"
            aria-label="Shortest-path search replay"
          >
            <svg
              viewBox="0 0 740 510"
              role="img"
              aria-label="Road graph with settled nodes and final shortest path"
            >
              <title>Two-way synthetic road graph with fixed travel-time weights</title>
              <line x1="361" x2="361" y1="25" y2="455" className="maps-river" />
              {route.edges.map((e) => (
                <g key={`${e.from}/${e.to}`}>
                  <line
                    x1={x(e.from)}
                    x2={x(e.to)}
                    y1={y(e.from)}
                    y2={y(e.to)}
                    className="maps-road"
                    data-busy={e.busy}
                  />
                  <text
                    x={(x(e.from) + x(e.to)) / 2 + (e.from % 8 === e.to % 8 ? 13 : 0)}
                    y={(y(e.from) + y(e.to)) / 2 + (e.from % 8 === e.to % 8 ? 5 : -9)}
                    textAnchor={e.from % 8 === e.to % 8 ? 'start' : 'middle'}
                  >
                    {e.minutes}
                  </text>
                </g>
              ))}
              {finished &&
                route.path
                  .slice(1)
                  .map((to, i) => (
                    <line
                      key={to}
                      x1={x(route.path[i])}
                      y1={y(route.path[i])}
                      x2={x(to)}
                      y2={y(to)}
                      className="maps-path"
                    />
                  ))}
              {roadNodes.map((n) => (
                <g key={n.id} className="maps-node" data-settled={visited.has(n.id)}>
                  <circle cx={x(n.id)} cy={y(n.id)} r="17" />
                  <text x={x(n.id)} y={y(n.id) + 5} textAnchor="middle">
                    {n.id === 16 ? 'S' : n.id === 23 ? 'G' : n.id}
                  </text>
                </g>
              ))}
              <text x="30" y="495">
                S =16 / G =23 · edge labels: minutes
              </text>
            </svg>
          </div>
          <p>
            Node có viền đậm đã settled trong replay. Đường liền đậm xuất hiện khi tìm xong. Cầu bị
            đóng được loại khỏi graph, không gán một speed thấp rồi vẫn cho route đi qua. Kiểu vẽ
            này chưa mô phỏng turns, one-way restrictions hoặc time-dependent edges.
          </p>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Shortest travel time / phút</dt>
              <dd>{route.minutes.toFixed(1)}</dd>
            </div>
            <div>
              <dt>Nodes settled / thuật toán đang chọn</dt>
              <dd>{route.order.length}</dd>
            </div>
            <div>
              <dt>Nodes settled / thuật toán còn lại</dt>
              <dd>{other.order.length}</dd>
            </div>
            <div>
              <dt>Cùng minimum cost?</dt>
              <dd>{Math.abs(route.minutes - other.minutes) < 1e-9 ? 'YES' : 'NO'}</dd>
            </div>
          </dl>
          <details>
            <summary>Search order và final path</summary>
            <p>{route.order.slice(0, visibleSteps).join(' → ') || '—'}</p>
            <p>{finished ? route.path.join(' → ') : '—'}</p>
            <p>
              Heuristic phải dùng cùng đơn vị với cost. Trong graph này, mỗi km tốn ít nhất một phút
              nên straight-line km là lower bound theo phút; traffic chỉ tăng cost. Không dùng km
              trực tiếp làm heuristic cho cost seconds trong graph thực khi chưa có conversion/bound
              đúng.
            </p>
          </details>
        </>
      )}
      {kind === 'maps-eta' && (
        <>
          <h3 id={id}>Traffic cũ hoặc ít probes nên được tin đến mức nào?</h3>
          <p>
            Một đoạn đường giả định dài 10 km, historical speed 40 km/h. Bài thử dùng trust = min(1,
            samples/20) ×exp(−age/300), hết hạn sau 600 giây. Đây là policy minh họa, không model
            ETA đã được train hay uncertainty estimate.
          </p>
          <div className="worksheet-inputs">
            <label>
              Tuổi probes / giây<output>{age}</output>
              <input
                type="range"
                min="0"
                max="900"
                step="30"
                value={age}
                onChange={(e) => setAge(+e.target.value)}
              />
            </label>
            <label>
              Số probes<output>{samples}</output>
              <input
                type="range"
                min="0"
                max="40"
                value={samples}
                onChange={(e) => setSamples(+e.target.value)}
              />
            </label>
            <label>
              Tốc độ live / km/h<output>{live}</output>
              <input
                type="range"
                min="5"
                max="80"
                value={live}
                onChange={(e) => setLive(+e.target.value)}
              />
            </label>
          </div>
          <div className="maps-trust">
            <span>Live weight {fmt(eta.trust * 100)}%</span>
            <div role="img" aria-label={`Live evidence weight: ${fmt(eta.trust * 100)}%`}>
              <i style={{ width: `${eta.trust * 100}%` }} />
            </div>
            <span>Historical weight {fmt((1 - eta.trust) * 100)}%</span>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Tốc độ sau blend / km/h</dt>
              <dd>{eta.speed.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Thời gian đi / phút</dt>
              <dd>{eta.minutes.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Chỉ dùng history / phút</dt>
              <dd>15.00</dd>
            </div>
          </dl>
          <p>
            Khi samples =0 hoặc age trên 600 giây, model trở về historical speed. Công thức đang
            blend speed rồi lấy time =distance/speed; nó không tương đương average travel times và
            chưa dự báo traffic tại lúc xe tới từng segment. Road closure và legal restrictions luôn
            là hard constraints riêng, không được mở lại chỉ vì historical fallback có speed dương.
          </p>
        </>
      )}
      {kind !== 'maps-eta' && (
        <p className="maps-pan-hint">
          ↔ Trên màn hình nhỏ, có thể cuộn ngang sơ đồ; vùng sơ đồ nhận focus để cuộn bằng bàn phím.
          Các kết quả và transcript bên dưới vẫn đọc được theo chiều dọc.
        </p>
      )}
    </section>
  );
}
