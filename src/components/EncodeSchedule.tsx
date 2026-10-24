import { useState } from 'react';
import { encodeSchedule } from '../lib/encode-schedule';
import '../styles/encode-schedule.css';

export default function EncodeSchedule() {
  const [minutes, setMinutes] = useState(10),
    [segments, setSegments] = useState(8),
    [workers, setWorkers] = useState(8),
    [overhead, setOverhead] = useState(2);
  const run = encodeSchedule(minutes, segments, workers, overhead),
    serial = encodeSchedule(minutes, segments, 1, overhead);
  const range = (
    label: string,
    value: number,
    min: number,
    max: number,
    apply: (value: number) => void,
  ) => (
    <label>
      {label}
      <output>{value}</output>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => apply(+e.target.value)}
      />
    </label>
  );
  return (
    <div className="encode-schedule">
      <h4>Chia task và thêm worker: wall time khác tổng compute</h4>
      <p>
        Mô hình scheduling riêng, không phải benchmark encoder. Mỗi source-minute cần 2
        worker-second probe, 20/40/80 để encode low/mid/high, 5 cho audio; package cần 1
        worker-second mỗi source-minute cộng 5 giây. Encode chia đều tại boundary hợp lệ, mỗi task
        cộng overhead được nhập. Scheduler chọn task ready dài nhất trước; chưa mô phỏng I/O, retry,
        codec hay publish gate.
      </p>
      <div className="worksheet-inputs">
        {range('Source duration / minutes', minutes, 1, 60, setMinutes)}
        {range('Segments / rendition', segments, 1, 16, setSegments)}
        {range('Worker pool', workers, 1, 32, setWorkers)}
        {range('Encode overhead / task / seconds', overhead, 0, 10, setOverhead)}
      </div>
      <div className="encode-gantt" role="img" aria-label="Lịch task probe encode audio package">
        {(['probe', 'low', 'mid', 'high', 'audio', 'package'] as const).map((stage) => {
          const rows = run.tasks.filter((t) => t.stage === stage),
            lanes = Math.max(...rows.map((t) => t.lane)) + 1;
          return (
            <div className="encode-stage" key={stage}>
              <strong>{stage}</strong>
              <div className="encode-track" style={{ height: 12 + lanes * 13 }}>
                {rows.map((t) => (
                  <span
                    key={t.id}
                    data-encode-task={t.id}
                    style={{
                      left: `${(t.start / run.makespan) * 100}%`,
                      width: `${(t.duration / run.makespan) * 100}%`,
                      top: 6 + t.lane * 13,
                    }}
                    title={`${t.id}: ${t.start.toFixed(2)}–${t.end.toFixed(2)}s / worker ${t.worker + 1}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
        <div className="encode-axis">
          <span>0 s</span>
          <span>{(run.makespan / 2).toFixed(1)} s</span>
          <span>{run.makespan.toFixed(1)} s</span>
        </div>
      </div>
      <dl className="worksheet-results" aria-live="polite">
        <div>
          <dt>All tasks finish / seconds</dt>
          <dd data-encode-makespan>{run.makespan.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Total work / worker-seconds</dt>
          <dd data-encode-work>{run.workerSeconds.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Speedup / same tasks, one worker</dt>
          <dd data-encode-speedup>{(serial.makespan / run.makespan).toFixed(2)}×</dd>
        </div>
        <div>
          <dt>Lower bound / seconds</dt>
          <dd data-encode-bound>{run.lowerBound.toFixed(2)}</dd>
        </div>
      </dl>
      <p>
        Lower bound lấy max(total work / workers, critical path) dưới đúng giả định của mô hình;
        scheduler không được bảo đảm tối ưu. Overhead bằng 0 chỉ giữ work không đổi trong fixture,
        không chứng minh parallel encoding ngoài thực tế không có overhead. Hoàn tất các task này
        chưa có nghĩa video đã qua mọi publish gate hoặc viewer đã thấy first frame.
      </p>
      <details>
        <summary>Xem lịch task và worker dạng bảng</summary>
        <div
          className="encode-task-table"
          role="region"
          tabIndex={0}
          aria-label="Bảng task và dependency encode"
        >
          <table>
            <thead>
              <tr>
                {['Task', 'Worker', 'Start / s', 'End / s', 'Dependencies'].map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {run.tasks.map((t) => (
                <tr key={t.id}>
                  <th scope="row">{t.id}</th>
                  <td>{t.worker + 1}</td>
                  <td>{t.start.toFixed(2)}</td>
                  <td>{t.end.toFixed(2)}</td>
                  <td>{t.dependencies.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
