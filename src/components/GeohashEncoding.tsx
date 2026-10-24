import { useState } from 'react';
import { geohashCell, geohashNeighbors } from '../lib/geohash-cell';
import '../styles/geohash-encoding.css';
const places = [
  { name: 'Hà Nội', latitude: 21.0285, longitude: 105.8542 },
  { name: 'Meridian boundary', latitude: 0.00001, longitude: -0.00001 },
  { name: 'Dateline', latitude: 0, longitude: 179.999 },
  { name: 'High latitude', latitude: 80, longitude: 0 },
];
export default function GeohashEncoding() {
  const [position, setPosition] = useState(places[0]),
    [precision, setPrecision] = useState(5),
    cell = geohashCell(position.latitude, position.longitude, precision),
    neighbors = geohashNeighbors(position.latitude, position.longitude, precision);
  return (
    <div className="geohash-encoding">
      <h4>Từ longitude/latitude bits tới một geohash prefix</h4>
      <p>
        Mỗi bước chia đôi một khoảng, bắt đầu bằng longitude rồi xen kẽ latitude; chọn nửa trên ghi
        bit 1. Cứ 5 bit tạo một ký tự base32. Chọn địa điểm và precision, rồi chọn ô bên cạnh để
        thấy prefix có thể đổi mạnh dù hai cell sát nhau.
      </p>
      <div className="worksheet-choices geohash-places">
        {places.map((p) => (
          <button className="secondary" type="button" key={p.name} onClick={() => setPosition(p)}>
            {p.name}
          </button>
        ))}
      </div>
      <label className="geohash-precision">
        Precision / characters<output>{precision}</output>
        <input
          type="range"
          min={1}
          max={8}
          value={precision}
          onChange={(e) => setPrecision(+e.target.value)}
        />
      </label>
      <dl className="worksheet-results" aria-live="polite">
        <div>
          <dt>Geohash</dt>
          <dd data-geohash-code translate="no">
            {cell.code}
          </dd>
        </div>
        <div>
          <dt>Latitude, longitude</dt>
          <dd className="geohash-position" translate="no">
            {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
          </dd>
        </div>
        <div>
          <dt>Cell width / degrees</dt>
          <dd data-geohash-width>{(cell.east - cell.west).toFixed(7)}</dd>
        </div>
        <div>
          <dt>Cell height / degrees</dt>
          <dd>{(cell.north - cell.south).toFixed(7)}</dd>
        </div>
      </dl>
      <div className="geohash-neighbors" role="group" aria-label="Các cell geohash lân cận">
        {neighbors.map((n) => (
          <button
            type="button"
            key={n.dx + ',' + n.dy}
            disabled={!n.cell}
            aria-pressed={n.dx === 0 && n.dy === 0}
            onClick={() =>
              setPosition({ name: 'Neighbor', latitude: n.latitude, longitude: n.longitude })
            }
          >
            <span translate="no">{n.cell?.code || '—'}</span>
            <small translate="no">
              {n.dy === 1 ? 'N' : n.dy === -1 ? 'S' : ''}
              {n.dx === 1 ? 'E' : n.dx === -1 ? 'W' : ''}
              {n.dx === 0 && n.dy === 0 ? 'center' : ''}
            </small>
          </button>
        ))}
      </div>
      <p>
        Grid chỉ biểu diễn quan hệ ô theo góc, không theo tỷ lệ kilomet và không phải radius cover.
        Longitude wrap qua dateline; ô vượt pole bị bỏ thay vì duplicate. Các input nằm trong
        [-90,90) và [-180,180); địa điểm vẫn có thể ở sát boundary. Muốn query radius phải dùng
        cover và distance model phù hợp như phần giải thích, không mặc định 9 cell luôn đủ.
      </p>
      <details>
        <summary>Xem từng bit và khoảng được chia đôi</summary>
        <div
          className="geohash-bit-table"
          role="region"
          tabIndex={0}
          aria-label="Các bước encode geohash"
        >
          <table>
            <thead>
              <tr>
                {['Bit', 'Axis', 'Before / degrees', 'Midpoint', 'Choice'].map((x) => (
                  <th key={x} scope="col">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cell.steps.map((s, i) => (
                <tr key={i}>
                  <th scope="row">{i + 1}</th>
                  <td>{s.axis}</td>
                  <td>
                    {s.min.toFixed(6)} … {s.max.toFixed(6)}
                  </td>
                  <td>{s.mid.toFixed(6)}</td>
                  <td>{s.bit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
