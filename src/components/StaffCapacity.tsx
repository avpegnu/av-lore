import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { demandRunway, survivorLoad } from '../lib/staff-reasoning-models';
export default function StaffCapacity() {
  const ref = useIslandReady<HTMLElement>(),
    uid = 'staff-capacity-' + useId().replace(/:/g, '');
  const [current, setCurrent] = useState(60),
    [growth, setGrowth] = useState(10),
    [target, setTarget] = useState(75),
    [regions, setRegions] = useState(2),
    [lost, setLost] = useState(1),
    [normal, setNormal] = useState(35);
  const runway = demandRunway(current / 100, growth / 100, target / 100),
    survivor = survivorLoad(normal / 100, regions, lost, target / 100);
  const round = (n: number) => Math.round(n * 100) / 100;
  return (
    <section
      className="staff-capacity handbook-experiment"
      ref={ref}
      aria-labelledby={uid + '-title'}
    >
      <header>
        <span className="eyebrow">CAPACITY ASSUMPTIONS</span>
        <h3 id={uid + '-title'}>Hai phép tính cần nói kèm giả định</h3>
        <p>
          Mô hình demand/capacity tỷ lệ thuận, cấu hình và workload mix cố định. Tỷ lệ trên 100% là
          demand vượt capacity trong model, không phải CPU thực chạy trên 100%.
        </p>
      </header>
      <div className="staff-capacity-inputs">
        <label>
          Demand/capacity hiện tại <output>{current}%</output>
          <input
            aria-label="Demand/capacity hiện tại"
            type="range"
            min={0}
            max={95}
            step={5}
            value={current}
            onChange={(e) => setCurrent(+e.target.value)}
          />
        </label>
        <label>
          Tăng trưởng demand mỗi tháng <output>{growth}%</output>
          <input
            aria-label="Tăng trưởng demand mỗi tháng"
            type="range"
            min={0}
            max={50}
            step={5}
            value={growth}
            onChange={(e) => setGrowth(+e.target.value)}
          />
        </label>
        <label>
          Ngưỡng demand/capacity mục tiêu <output>{target}%</output>
          <input
            aria-label="Ngưỡng demand/capacity mục tiêu"
            type="range"
            min={50}
            max={95}
            step={5}
            value={target}
            onChange={(e) => setTarget(+e.target.value)}
          />
        </label>
      </div>
      <div className="staff-runway-result" aria-live="polite">
        <strong>
          {runway.months === null ? (
            'Không có điểm vượt ngưỡng trong mô hình này'
          ) : runway.months === 0 ? (
            'Đã chạm hoặc vượt ngưỡng hiện tại'
          ) : (
            <>
              <span>Điểm chạm ngưỡng:</span> {round(runway.months)} <span>tháng</span>
            </>
          )}
        </strong>
        {runway.firstWholeMonth !== null && (
          <p>
            Tháng nguyên đầu tiên chạm/vượt: <b>{runway.firstWholeMonth}</b>
          </p>
        )}
        <p>
          Đây không phải dự báo CPU, p99 hoặc ngày hệ thống sẽ ngừng hoạt động. Bottleneck và
          service cost có thể đổi trước đó.
        </p>
      </div>
      <div
        className="staff-demand-chart"
        role="img"
        aria-label="Demand/capacity theo tháng trong mô hình"
      >
        <div aria-hidden="true">
          {runway.samples.map((s) => (
            <div key={s.month}>
              <span>{s.month}</span>
              <div>
                <i
                  style={{ height: Math.min(100, s.ratio * 100) + '%' }}
                  data-over={s.ratio > target / 100}
                />
              </div>
              <span>{Math.round(s.ratio * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
      <p>Chiều cao cột giới hạn ở 100%; nhãn và bảng giữ giá trị tính được.</p>
      <details className="staff-demand-table">
        <summary>Đọc các giá trị theo tháng</summary>
        <table>
          <thead>
            <tr>
              <th>Tháng</th>
              <th>Modeled demand/capacity</th>
            </tr>
          </thead>
          <tbody>
            {runway.samples.map((s) => (
              <tr key={s.month}>
                <th>{s.month}</th>
                <td>{round(s.ratio * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <hr />
      <h4>Chuyển tải khi mất một số regions</h4>
      <p>
        Giả sử capacity các regions bằng nhau, load cân bằng và toàn bộ load chuyển được. Model chưa
        tính quorum, replication, warmup, network, auth hoặc recovery delay.
      </p>
      <div className="staff-capacity-inputs">
        <label>
          Load bình thường mỗi region <output>{normal}%</output>
          <input
            aria-label="Load bình thường mỗi region"
            type="range"
            min={5}
            max={90}
            step={5}
            value={normal}
            onChange={(e) => setNormal(+e.target.value)}
          />
        </label>
        <label>
          Số regions
          <select
            value={regions}
            onChange={(e) => {
              const n = +e.target.value;
              setRegions(n);
              setLost(Math.min(lost, n - 1));
            }}
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Số regions mất
          <select value={lost} onChange={(e) => setLost(+e.target.value)}>
            {Array.from({ length: regions }, (_, n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="staff-survivor-result" data-fits={survivor.fits} aria-live="polite">
        <strong>
          {round(survivor.ratio * 100)}% <span>demand/capacity trên mỗi survivor</span>
        </strong>
        <p>
          {survivor.fits
            ? 'Không vượt ngưỡng capacity đã chọn trong giả định này.'
            : 'Vượt ngưỡng capacity đã chọn trong giả định này.'}
        </p>
        <p>
          Không phải kết luận hệ thống available. Phải kiểm dependency, dữ liệu, authority và khả
          năng thực hiện failover riêng.
        </p>
      </div>
    </section>
  );
}
