import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { geoPoints, clusteredPoints, gridSearch, quadPartition } from '../lib/proximity-models';
export default function ProximityPlayground({ kind }: { kind: 'geo-cover' | 'geo-quadtree' }) {
  const ref = useIslandReady(),
    id = 'geo-' + useId().replace(/:/g, '');
  const [x, setX] = useState(5),
    [y, setY] = useState(5),
    [radius, setRadius] = useState(2),
    [size, setSize] = useState(2),
    [centerOnly, setCenterOnly] = useState(false),
    [capacity, setCapacity] = useState(2),
    [depth, setDepth] = useState(4),
    [cluster, setCluster] = useState(false);
  const query = gridSearch(x, y, radius, size, centerOnly),
    points = cluster ? [...geoPoints, ...clusteredPoints] : geoPoints,
    leaves = quadPartition(points, capacity, depth);
  const sx = (v: number) => 32 + v * 44,
    sy = (v: number) => 472 - v * 44;
  return (
    <section className="handbook-experiment" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">PROXIMITY / COVERAGE AND DENSITY</span>
      {kind === 'geo-cover' ? (
        <>
          <h3 id={id}>Vòng tròn tìm kiếm có nằm gọn trong một cell?</h3>
          <p>
            Map là mặt phẳng 10 × 10 km minh họa, không phải lat/lon hoặc đường đi thực. Cover lấy
            các fixed cells giao bounding box của radius, rồi lọc Euclidean distance. Geohash/H3
            thật cần spherical covering và xử lý latitude/dateline riêng.
          </p>
          <div className="worksheet-inputs">
            {[
              { name: 'Query X / km', value: x, min: 0, max: 10, step: 0.1, set: setX },
              { name: 'Query Y / km', value: y, min: 0, max: 10, step: 0.1, set: setY },
              { name: 'Radius / km', value: radius, min: 0.5, max: 5, step: 0.5, set: setRadius },
              { name: 'Cell width / km', value: size, min: 1, max: 5, step: 1, set: setSize },
            ].map((c) => (
              <label key={c.name}>
                {c.name}
                <output>{c.value}</output>
                <input
                  type="range"
                  min={c.min}
                  max={c.max}
                  step={c.step}
                  value={c.value}
                  onChange={(e) => c.set(+e.target.value)}
                />
              </label>
            ))}
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={centerOnly}
              onChange={(e) => setCenterOnly(e.target.checked)}
            />
            Chỉ đọc cell chứa query để thấy false negatives
          </label>
          <div className="geo-map">
            <svg viewBox="0 0 504 504" role="img" aria-label="Spatial candidates and exact radius">
              <title>Local planar query with candidate cells and exact distance filtering</title>
              <defs>
                <clipPath id={id + '-clip'}>
                  <rect x="32" y="32" width="440" height="440" />
                </clipPath>
              </defs>
              <g clipPath={'url(#' + id + '-clip)'}>
                <rect x="32" y="32" width="440" height="440" className="geo-ground" />
                {Array.from({ length: Math.ceil(10 / size) }, (_, cx) =>
                  Array.from({ length: Math.ceil(10 / size) }, (_, cy) => (
                    <rect
                      key={cx + ',' + cy}
                      x={sx(cx * size)}
                      y={sy((cy + 1) * size)}
                      width={size * 44}
                      height={size * 44}
                      className="geo-cell"
                      data-covered={query.cells.some((c) => c.x === cx && c.y === cy)}
                    />
                  )),
                )}
                <circle cx={sx(x)} cy={sy(y)} r={radius * 44} className="geo-radius" />
                {geoPoints.map((p) => (
                  <g key={p.id}>
                    <circle
                      cx={sx(p.x)}
                      cy={sy(p.y)}
                      r={query.exact.includes(p) ? 7 : 4}
                      className="geo-point"
                      data-match={query.exact.includes(p)}
                    />
                    <text
                      x={sx(p.x) + (p.id === 'P3' ? -30 : p.id === 'P12' ? -34 : 9)}
                      y={sy(p.y) + (p.id === 'P3' || p.id === 'P12' ? 18 : p.id === 'P4' ? 22 : -9)}
                    >
                      {p.id}
                    </text>
                  </g>
                ))}
                <path
                  d={`M${sx(x) - 9},${sy(y)}h18 M${sx(x)},${sy(y) - 9}v18`}
                  className="geo-cross"
                />
              </g>
              <text x="32" y="495">
                0
              </text>
              <text x="440" y="495">
                10 km
              </text>
            </svg>
          </div>
          <p>
            Ô được tô nền là candidate cells; đường tròn nét đứt là radius; dấu cộng là query. Điểm
            tròn lớn thuộc exact result. Bảng dưới giữ đầy đủ ID và distance để không chỉ dựa vào
            màu.
          </p>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Cover cells / including empty outside map</dt>
              <dd>{query.cells.length}</dd>
            </div>
            <div>
              <dt>Candidate points</dt>
              <dd>{query.candidates.length}</dd>
            </div>
            <div>
              <dt>Exact matches</dt>
              <dd>{query.exact.length}</dd>
            </div>
            <div>
              <dt>Missed in-radius points</dt>
              <dd>{query.missed.length}</dd>
            </div>
          </dl>
          <div className="geo-results">
            <section>
              <h4>Candidate IDs</h4>
              <p>{query.candidates.map((p) => p.id).join(' · ') || '—'}</p>
            </section>
            <section>
              <h4>Exact results / nearest first</h4>
              <ol>
                {query.exact.map((p) => (
                  <li key={p.id}>
                    {p.id} / {query.distance(p).toFixed(2)} km
                  </li>
                ))}
              </ol>
            </section>
          </div>
          <p>
            Exact filtering loại false positives; nó không tìm lại được point chưa được candidate
            stage đọc. Giảm cell size làm tăng cover count nhưng thường giảm candidate
            amplification; đây không phải benchmark latency.
          </p>
        </>
      ) : (
        <>
          <h3 id={id}>Quadtree chia nhỏ nơi có nhiều địa điểm</h3>
          <p>
            Root chứa 12 point, hoặc thêm 16 point trong một cluster. Leaf vượt capacity sẽ split
            thành bốn ô cho tới max depth. Point trùng hoặc quá sát nhau vẫn có thể vượt capacity ở
            depth cap; không split vô hạn.
          </p>
          <div className="worksheet-inputs">
            <label>
              Leaf capacity<output>{capacity}</output>
              <input
                type="range"
                min="1"
                max="8"
                value={capacity}
                onChange={(e) => setCapacity(+e.target.value)}
              />
            </label>
            <label>
              Maximum depth<output>{depth}</output>
              <input
                type="range"
                min="0"
                max="6"
                value={depth}
                onChange={(e) => setDepth(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={cluster}
              onChange={(e) => setCluster(e.target.checked)}
            />
            Thêm cluster 16 point gần nhau
          </label>
          <div className="geo-map">
            <svg viewBox="0 0 504 504" role="img" aria-label="Bounded quadtree leaf partition">
              <title>Adaptive quadtree leaves over a bounded planar region</title>
              <rect x="32" y="32" width="440" height="440" className="geo-ground" />
              {leaves.map((l) => (
                <rect
                  key={l.x + ',' + l.y + ',' + l.size}
                  x={sx(l.x)}
                  y={sy(l.y + l.size)}
                  width={l.size * 44}
                  height={l.size * 44}
                  className="geo-cell"
                  data-covered={l.points.length > 0}
                />
              ))}
              {points.map((p) => (
                <circle key={p.id} cx={sx(p.x)} cy={sy(p.y)} r="4" className="geo-point" />
              ))}
              <text x="32" y="495">
                0
              </text>
              <text x="440" y="495">
                10 km
              </text>
            </svg>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Indexed points</dt>
              <dd>{points.length}</dd>
            </div>
            <div>
              <dt>Leaf count / including empty</dt>
              <dd>{leaves.length}</dd>
            </div>
            <div>
              <dt>Deepest leaf</dt>
              <dd>{Math.max(...leaves.map((l) => l.depth))}</dd>
            </div>
            <div>
              <dt>Over-capacity capped leaves</dt>
              <dd>{leaves.filter((l) => l.points.length > capacity).length}</dd>
            </div>
          </dl>
          <details>
            <summary>Leaf inventory / coordinates and membership</summary>
            <figure className="handbook-table">
              <div tabIndex={0} role="region" aria-label="Quadtree leaf inventory">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Origin X,Y / km</th>
                      <th scope="col">Width / km</th>
                      <th scope="col">Depth</th>
                      <th scope="col">Point IDs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((l) => (
                      <tr key={l.x + ',' + l.y + ',' + l.size}>
                        <td>
                          {l.x.toFixed(3)}, {l.y.toFixed(3)}
                        </td>
                        <td>{l.size.toFixed(3)}</td>
                        <td>{l.depth}</td>
                        <td>{l.points.map((p) => p.id).join(', ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </figure>
          </details>
          <p>
            Leaf geometry và membership được tính lại theo controls. Đây là adaptive partition,
            không là H3/geohash encoder. Search quadtree cần prune node không giao query rồi
            exact-filter points; balancing, persistence và concurrent writes không được mô phỏng.
          </p>
        </>
      )}
    </section>
  );
}
