import { useIslandReady } from '../lib/use-island-ready';
import { useState } from 'react';
import { estimate } from '../lib/models';
export default function Estimator() {
  const islandRef = useIslandReady();
  const [dau, setDAU] = useState(1000000),
    [actions, setActions] = useState(10),
    [peak, setPeak] = useState(5),
    [bytes, setBytes] = useState(1000),
    [days, setDays] = useState(30),
    [replicas, setReplicas] = useState(3);
  const result = estimate(dau, actions, peak, bytes, days);
  const fields: [string, number, (n: number) => void, number, number][] = [
    ['DAU giả định', dau, setDAU, 1, 1000000000],
    ['Operation / user / ngày', actions, setActions, 1, 10000],
    ['Peak factor', peak, setPeak, 1, 100],
    ['Bytes / record', bytes, setBytes, 1, 1000000000],
    ['Retention (ngày)', days, setDays, 1, 3650],
    ['Replication factor', replicas, setReplicas, 1, 10],
  ];
  return (
    <div className="lab-frame" ref={islandRef}>
      <div className="lab-header">
        CAPACITY WORKSHEET <span>GIẢ ĐỊNH CỦA BẠN</span>
      </div>
      <div className="lab-body">
        <p>
          Chọn một loại operation (chẳng hạn tạo message hoặc ghi event). Nếu tính storage, phải
          dùng số record mới mỗi ngày; không dùng lượt đọc thay cho số bản ghi.
        </p>
        <div className="form-grid">
          {fields.map(([label, value, set, min, max]) => (
            <label className="input-field" key={label}>
              {label}
              <input
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isSafeInteger(n) && n >= min && n <= max) set(n);
                }}
              />
            </label>
          ))}
        </div>
        <div className="metric-grid" aria-live="polite">
          <div className="metric">
            <strong>{Math.round(result.average).toLocaleString('vi-VN')}</strong>
            <span>RPS trung bình</span>
          </div>
          <div className="metric">
            <strong>{Math.round(result.peak).toLocaleString('vi-VN')}</strong>
            <span>Peak RPS</span>
          </div>
          <div className="metric">
            <strong>
              {(result.storageGB * replicas).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}{' '}
              GB
            </strong>
            <span>Storage với replication</span>
          </div>
        </div>
        <p>
          daily = DAU × operations. RPS = daily / 86.400. Storage = daily × bytes × retention ×
          replicas; GB theo hệ thập phân. Chưa tính index, metadata, compression, traffic fan-out,
          repair hoặc headroom.
        </p>
      </div>
    </div>
  );
}
