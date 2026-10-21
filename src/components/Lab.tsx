import { useIslandReady } from '../lib/use-island-ready';
import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  base62,
  percentile,
  leftJoin,
  schedule,
  capacity,
  cacheRead,
  queueDelivery,
  stockRace,
  estimate,
} from '../lib/models';
import { scenarios } from '../lib/scenarios';
interface Props {
  kind: string;
  topic: string;
}
function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  const id = useId();
  return (
    <label className="slider-field" htmlFor={id}>
      <span>
        {label}
        <strong>
          {value.toLocaleString('vi-VN')}
          {unit}
        </strong>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
function Toggle({
  children,
  onChange,
  checked,
}: {
  children: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle-field">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}
function Trace({ kind }: { kind: string }) {
  const spec = scenarios[kind];
  const [fault, setFault] = useState(false),
    [step, setStep] = useState(0);
  if (!spec) return <p>Đọc sơ đồ và thử tự giải thích luồng dữ liệu.</p>;
  const steps = fault ? spec.fault : spec.normal;
  return (
    <>
      <h3>{spec.title}</h3>
      <Toggle
        checked={fault}
        onChange={(v) => {
          setFault(v);
          setStep(0);
        }}
      >
        {spec.question}
      </Toggle>
      <ol className="trace-list">
        {steps.map((s, i) => (
          <li key={s} className={i <= step ? 'revealed' : 'pending'}>
            <span>{i + 1}</span>
            <p>{i <= step ? s : 'Chưa thực hiện bước này'}</p>
          </li>
        ))}
      </ol>
      <div className="lab-actions">
        <button
          onClick={() => setStep(Math.min(step + 1, steps.length - 1))}
          disabled={step === steps.length - 1}
        >
          Chạy bước tiếp →
        </button>
        <button className="secondary" onClick={() => setStep(0)}>
          Chạy lại
        </button>
        <span>
          Bước {step + 1}/{steps.length}
        </span>
      </div>
      {step === steps.length - 1 && (
        <div className="lab-result" role="status">
          <strong>{fault ? spec.failure : spec.outcome}</strong>
          <p>{spec.lesson}</p>
        </div>
      )}
    </>
  );
}
function Complexity() {
  const [n, setN] = useState(16);
  return (
    <>
      <h3>Input tăng, lượng công việc tăng ra sao?</h3>
      <Slider label="Số phần tử n" value={n} onChange={setN} min={2} max={1024} step={2} />
      <div className="metric-grid">
        {[
          ['Binary search — số bước tối đa', Math.floor(Math.log2(n)) + 1],
          ['Linear scan — tối đa', n],
          ['Hai vòng lặp đầy đủ', n * n],
        ].map(([label, v]) => (
          <div className="metric" key={label}>
            <strong>{Number(v).toLocaleString('vi-VN')}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p>
        Đếm phép so sánh/tác vụ trong các mô hình đơn giản. Binary search yêu cầu dữ liệu đã sắp
        xếp; n² là hai vòng lặp chạy đủ n lần. Các con số này không phải thời gian benchmark.
      </p>
    </>
  );
}
function Box() {
  const [width, setWidth] = useState(200),
    [padding, setPadding] = useState(16),
    [border, setBorder] = useState(4),
    [borderBox, setBorderBox] = useState(true);
  const outer = borderBox ? width : width + padding * 2 + border * 2;
  return (
    <>
      <h3>Tự thay đổi CSS box model</h3>
      <Toggle checked={borderBox} onChange={setBorderBox}>
        box-sizing: border-box
      </Toggle>
      <Slider label="width" value={width} onChange={setWidth} min={100} max={260} unit="px" />
      <Slider label="padding mỗi phía" value={padding} onChange={setPadding} max={30} unit="px" />
      <Slider label="border mỗi phía" value={border} onChange={setBorder} max={10} unit="px" />
      <div className="box-preview">
        <div
          style={{
            width,
            padding,
            border: `${border}px solid var(--accent)`,
            boxSizing: borderBox ? 'border-box' : 'content-box',
          }}
        >
          Content
        </div>
      </div>
      <output className="lab-result">
        Chiều rộng ngoài (chưa gồm margin): <strong>{outer}px</strong>. Content:{' '}
        {borderBox ? width - 2 * padding - 2 * border : width}px.
      </output>
    </>
  );
}
function EventLoop({ node = false }: { node?: boolean }) {
  const [step, setStep] = useState(0);
  const code =
    "console.log('A');\nsetTimeout(() => console.log('T'), 0);\nPromise.resolve().then(() => console.log('P'));\nconsole.log('B');";
  const steps = [
    'A: synchronous log',
    'B: phần còn lại của synchronous script',
    'P: Promise microtask sau khi stack rỗng',
    'T: timer callback ở task/phases tiếp theo',
  ];
  return (
    <>
      <h3>Đoán thứ tự log trước khi chạy</h3>
      <pre>
        <code>{code}</code>
      </pre>
      <div className="console-output" aria-live="polite">
        {step === 0 ? 'Chưa có output.' : steps.slice(0, step).map((s) => <p key={s}>{s}</p>)}
      </div>
      <div className="lab-actions">
        <button onClick={() => setStep(Math.min(4, step + 1))} disabled={step === 4}>
          Chạy bước tiếp →
        </button>
        <button className="secondary" onClick={() => setStep(0)}>
          Reset
        </button>
      </div>
      <p>
        {node
          ? 'Ví dụ chạy như một script thông thường với Promise đã resolve; không dùng nextTick, setImmediate hoặc I/O callback. Không suy ra thứ tự timer/IO trong mọi ngữ cảnh Node từ demo này.'
          : 'Timer 0ms không chạy ngay lập tức. Microtask queue được xử lý sau khi synchronous script hoàn tất, trước task timer này.'}
      </p>
    </>
  );
}
function ReactState() {
  const [functional, setFunctional] = useState(false),
    [count, setCount] = useState(0),
    [last, setLast] = useState('Chưa click.');
  function run() {
    if (functional) {
      setCount((c) => c + 1);
      setCount((c) => c + 1);
      setCount((c) => c + 1);
      setLast('Ba updater function được áp dụng tuần tự: +3.');
    } else {
      setCount(count + 1);
      setCount(count + 1);
      setCount(count + 1);
      setLast(`Cả ba lời gọi cùng dùng snapshot ${count}; kết quả chỉ +1.`);
    }
  }
  return (
    <>
      <h3>Ba lần setState trong một event</h3>
      <Toggle checked={functional} onChange={setFunctional}>
        Dùng setCount(c =&gt; c + 1)
      </Toggle>
      <div className="metric">
        <strong>{count}</strong>
        <span>Count</span>
      </div>
      <pre>
        <code>
          {Array(3)
            .fill(functional ? 'setCount(c => c + 1);' : 'setCount(count + 1);')
            .join('\n')}
        </code>
      </pre>
      <div className="lab-actions">
        <button onClick={run}>Chạy event +3</button>
        <button
          className="secondary"
          onClick={() => {
            setCount(0);
            setLast('Đã reset.');
          }}
        >
          Reset
        </button>
      </div>
      <p aria-live="polite">{last}</p>
    </>
  );
}
function SQL() {
  const [left, setLeft] = useState(true),
    [where, setWhere] = useState(false);
  const rows = leftJoin(left).filter((r) => !where || (r.total !== null && r.total > 0));
  return (
    <>
      <h3>LEFT JOIN và vị trí của filter</h3>
      <p>users: An, Bình, Chi. orders: An có đơn 120 và 80; Bình có đơn 0; Chi chưa có đơn.</p>
      <Toggle checked={left} onChange={setLeft}>
        Dùng LEFT JOIN (tắt để dùng INNER JOIN)
      </Toggle>
      <Toggle checked={where} onChange={setWhere}>
        Thêm WHERE orders.total &gt; 0
      </Toggle>
      <pre>
        <code>{`SELECT u.name, o.id, o.total\nFROM users u ${left ? 'LEFT' : 'INNER'} JOIN orders o\n  ON u.id = o.user_id${where ? '\nWHERE o.total > 0' : ''};`}</code>
      </pre>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Order</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.user}</td>
                <td>{r.order ?? 'NULL'}</td>
                <td>{r.total ?? 'NULL'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p role="status">
        {rows.length} dòng.{' '}
        {where
          ? 'WHERE loại cả dòng NULL của Chi vì NULL > 0 không là TRUE. Muốn giữ mọi user và chỉ join đơn hợp lệ, chuyển điều kiện sang ON.'
          : 'Hai đơn của An tạo hai dòng; đếm user bằng COUNT(*) sẽ sai mục đích.'}
      </p>
    </>
  );
}
function Race() {
  const [atomic, setAtomic] = useState(false);
  const r = stockRace(atomic);
  return (
    <>
      <h3>Hai request tranh vé cuối cùng</h3>
      <Toggle checked={atomic} onChange={setAtomic}>
        Dùng atomic conditional UPDATE
      </Toggle>
      <pre>
        <code>
          {atomic
            ? 'UPDATE inventory SET stock = stock - 1\nWHERE id = 1 AND stock > 0;\n-- Kiểm tra số row bị ảnh hưởng'
            : 'stock = SELECT stock FROM inventory;\nif (stock > 0) sellTicket();\nUPDATE inventory SET stock = :previously_read_stock - 1;'}
        </code>
      </pre>
      <ol>
        {r.trace.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
      <div className="lab-result" role="status">
        Stock ban đầu = 1. Đã bán <strong>{r.sold}</strong> vé. Stock cuối ={' '}
        <strong>{r.stock}</strong>.
      </div>
      <p>
        Mô hình read-modify-write dùng giá trị đã đọc của từng request. Trong thực tế cần
        transaction bao gồm cả bản ghi đặt vé và inventory, cùng unique constraint/idempotency phù
        hợp.
      </p>
    </>
  );
}
function Cache() {
  const [ttl, setTTL] = useState(5),
    [now, setNow] = useState(0),
    [db, setDB] = useState('v1'),
    [entries, setEntries] = useState<Record<string, { value: string; expires: number }>>({}),
    [logs, setLogs] = useState<string[]>([]);
  function read() {
    const r = cacheRead(entries, 'item', now, db, ttl);
    setEntries(r.entries);
    setLogs((l) => [...l.slice(-5), `t=${now}s: ${r.hit ? 'HIT' : 'MISS'} → ${r.value}`]);
  }
  return (
    <>
      <h3>Cache-aside: nhanh nhưng có thể cũ</h3>
      <Slider
        label="TTL cho lần fill tiếp theo"
        value={ttl}
        onChange={setTTL}
        min={1}
        max={20}
        unit="s"
      />
      <div className="metric-grid">
        <div className="metric">
          <strong>{now}s</strong>
          <span>Đồng hồ mô phỏng</span>
        </div>
        <div className="metric">
          <strong>{db}</strong>
          <span>Giá trị DB</span>
        </div>
        <div className="metric">
          <strong>{entries.item?.value ?? '∅'}</strong>
          <span>Cache; hết hạn t={entries.item?.expires ?? '—'}</span>
        </div>
      </div>
      <div className="lab-actions">
        <button onClick={read}>GET item</button>
        <button className="secondary" onClick={() => setNow((n) => n + 1)}>
          +1 giây
        </button>
        <button className="secondary" onClick={() => setDB((v) => (v === 'v1' ? 'v2' : 'v1'))}>
          Đổi dữ liệu DB
        </button>
        <button className="secondary" onClick={() => setEntries({})}>
          Invalidate
        </button>
        <button
          className="secondary"
          onClick={() => {
            setNow(0);
            setDB('v1');
            setEntries({});
            setLogs([]);
          }}
        >
          Reset
        </button>
      </div>
      <div className="console-output" aria-live="polite">
        {logs.length
          ? logs.map((l, i) => <p key={i}>{l}</p>)
          : 'Thử GET → đổi DB → GET trước và sau TTL.'}
      </div>
      <p>
        Đổi DB không tự cập nhật cache trong mô hình này. Invalidation đưa lần GET sau về source;
        TTL tính từ thời điểm fill.
      </p>
    </>
  );
}
function Queue() {
  const [dedup, setDedup] = useState(false),
    [crash, setCrash] = useState(true);
  const r = queueDelivery(dedup, crash);
  return (
    <>
      <h3>Commit rồi chết trước ACK</h3>
      <Toggle checked={crash} onChange={setCrash}>
        Worker chết sau side effect, trước ACK
      </Toggle>
      <Toggle checked={dedup} onChange={setDedup}>
        Ghi event_id và side effect trong cùng transaction
      </Toggle>
      <ol>
        {r.trace.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <div className="lab-result" role="status">
        Một event → <strong>{r.effects}</strong> lần side effect.
      </div>
      <p>
        Dedup có hiệu lực vì marker và thay đổi nghiệp vụ commit atomically trong mô hình này. Nếu
        side effect là API ngoài, cần idempotency ở bên nhận hoặc cơ chế phối hợp riêng.
      </p>
    </>
  );
}
function Scheduler() {
  const [q, setQ] = useState(2);
  const jobs = schedule(q);
  return (
    <>
      <h3>Round Robin: chia CPU theo quantum</h3>
      <p>Ba process A=5, B=3, C=1 đơn vị CPU, cùng tới tại t=0. Bỏ qua context switch và I/O.</p>
      <Slider label="Quantum" value={q} onChange={setQ} min={1} max={5} />
      <div className="gantt" aria-label="CPU timeline">
        {jobs.map((j, i) => (
          <div key={i} style={{ flex: j.end - j.start }} data-job={j.job}>
            <strong>{j.job}</strong>
            <span>
              {j.start}–{j.end}
            </span>
          </div>
        ))}
      </div>
      <p>
        {jobs.length} lượt CPU; {jobs.length - 1} lần đổi lượt. Quantum lớn có thể giảm số lần đổi
        nhưng làm process ngắn chờ lâu hơn.
      </p>
      <div className="metric-grid">
        {['A', 'B', 'C'].map((j, i) => {
          const finish = jobs.filter((k) => k.job === j).at(-1)!.end;
          return (
            <div className="metric" key={j}>
              <strong>{finish}</strong>
              <span>
                {j}: hoàn tất; chờ {finish - [5, 3, 1][i]}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
function Capacity() {
  const [rps, setRPS] = useState(600),
    [pods, setPods] = useState(3),
    [per, setPer] = useState(250);
  const r = capacity(rps, per, pods);
  return (
    <>
      <h3>Replica capacity trong một mô hình tuyến tính</h3>
      <Slider
        label="Traffic"
        value={rps}
        onChange={setRPS}
        min={100}
        max={3000}
        step={100}
        unit=" req/s"
      />
      <Slider label="Số Ready Pod" value={pods} onChange={setPods} min={1} max={10} />
      <Slider
        label="Công suất giả định mỗi Pod"
        value={per}
        onChange={setPer}
        min={100}
        max={500}
        step={50}
        unit=" req/s"
      />
      <div className="pod-grid">
        {Array.from({ length: pods }, (_, i) => (
          <span key={i}>
            Pod {i + 1}
            <small>{Math.ceil(rps / pods)} req/s</small>
          </span>
        ))}
      </div>
      <div className="lab-result" role="status">
        Tải so với công suất: <strong>{r.load}%</strong>. Cần tối thiểu <strong>{r.needed}</strong>{' '}
        Pod theo giả định này.
      </div>
      <p>
        Chưa tính headroom, autoscaling delay, CPU requests hay bottleneck DB. HPA thực tế không
        tính replica chỉ từ phép chia này; cần metric phản ánh tải và load test.
      </p>
    </>
  );
}
function Latency() {
  const [tail, setTail] = useState(1000),
    [count, setCount] = useState(2);
  const values = [...Array(100 - count).fill(50), ...Array(count).fill(tail)];
  const avg = values.reduce((a, b) => a + b, 0) / 100;
  return (
    <>
      <h3>Average có thể che tail latency</h3>
      <Slider
        label="Số request chậm trên 100 request"
        value={count}
        onChange={setCount}
        min={1}
        max={20}
      />
      <Slider
        label="Latency của request chậm"
        value={tail}
        onChange={setTail}
        min={100}
        max={3000}
        step={100}
        unit="ms"
      />
      <div
        className="latency-dots"
        aria-label={`${100 - count} request 50ms, ${count} request ${tail}ms`}
      >
        {values.map((v, i) => (
          <i key={i} className={v > 50 ? 'slow' : ''} />
        ))}
      </div>
      <div className="metric-grid">
        {[
          ['Mean', avg],
          ['p50', percentile(values, 0.5)],
          ['p95', percentile(values, 0.95)],
          ['p99', percentile(values, 0.99)],
        ].map(([l, v]) => (
          <div className="metric" key={l}>
            <strong>{v}ms</strong>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <p>
        Dùng nearest-rank: phần tử ceil(p × n) trong mẫu đã sắp xếp. Khi chỉ có 1/100 request chậm,
        p99 vẫn là 50ms; p100 mới bắt request chậm đó. Không lấy trung bình các percentile để tổng
        hợp nhiều instance.
      </p>
    </>
  );
}
function Shortener() {
  const [id, setID] = useState(100000),
    [dau, setDAU] = useState(1000000),
    [requests, setRequests] = useState(20),
    [peak, setPeak] = useState(10);
  const r = estimate(dau, requests, peak, 500, 30);
  return (
    <>
      <h3>Từ ID tới short code & ước lượng tải</h3>
      <label className="input-field">
        ID không âm (tối đa 9.000.000.000)
        <input
          type="number"
          min={0}
          max={9000000000}
          step={1}
          value={id}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isSafeInteger(v) && v >= 0 && v <= 9000000000) setID(v);
          }}
        />
      </label>
      <output className="short-code">/s/{base62(id)}</output>
      <p>
        Encoding là ánh xạ một-một từ ID sang code; không mã hóa bảo mật và không tự cấp phát ID duy
        nhất.
      </p>
      <Slider
        label="DAU giả định"
        value={dau}
        onChange={setDAU}
        min={100000}
        max={10000000}
        step={100000}
      />
      <Slider
        label="Read mỗi user mỗi ngày"
        value={requests}
        onChange={setRequests}
        min={1}
        max={100}
      />
      <Slider label="Peak factor" value={peak} onChange={setPeak} min={1} max={20} />
      <div className="metric-grid">
        <div className="metric">
          <strong>{Math.round(r.average).toLocaleString('vi-VN')}</strong>
          <span>Read RPS trung bình</span>
        </div>
        <div className="metric">
          <strong>{Math.round(r.peak).toLocaleString('vi-VN')}</strong>
          <span>Peak read RPS</span>
        </div>
      </div>
      <p>
        RPS = DAU × reads/ngày ÷ 86.400. Đây là các giả định để thảo luận capacity, chưa tính cache
        hit, write traffic hay fan-out.
      </p>
    </>
  );
}
function Star() {
  const [text, setText] = useState(['', '', '', '']),
    [saved, setSaved] = useState('');
  useEffect(() => {
    try {
      const old = JSON.parse(localStorage.getItem('it-basic-star-v1') || 'null');
      if (Array.isArray(old) && old.length === 4 && old.every((x) => typeof x === 'string'))
        setText(old);
    } catch {}
  }, []);
  const labels = [
    'Situation — Bối cảnh và vấn đề',
    'Task — Trách nhiệm của bạn',
    'Action — Bạn đã làm gì, vì sao chọn cách đó?',
    'Result — Kết quả đo được và bài học',
  ];
  return (
    <>
      <h3>Soạn câu chuyện STAR của bạn</h3>
      <p>Gợi ý: kể về một lần xử lý production incident hoặc đưa ra một quyết định có trade-off.</p>
      {labels.map((l, i) => (
        <label className="input-field" key={l}>
          {l}
          <textarea
            rows={3}
            value={text[i]}
            onChange={(e) => {
              setText((v) => v.map((x, j) => (j === i ? e.target.value : x)));
              setSaved('Chưa lưu thay đổi.');
            }}
          />
        </label>
      ))}
      <button
        onClick={() => {
          try {
            localStorage.setItem('it-basic-star-v1', JSON.stringify(text));
            setSaved('Đã lưu trên trình duyệt này.');
          } catch {
            setSaved('Trình duyệt không cho phép lưu; hãy copy nội dung ra tệp.');
          }
        }}
      >
        Lưu bản nháp
      </button>
      <p role="status">{saved}</p>
      <p>
        Không có chấm điểm tự động: tự kiểm tra hành động có cụ thể, số liệu có căn cứ và bài học có
        áp dụng được lần sau.
      </p>
    </>
  );
}
export default function Lab({ kind, topic }: Props) {
  const islandRef = useIslandReady<HTMLElement>();
  let body: ReactNode;
  switch (kind) {
    case 'complexity':
      body = <Complexity />;
      break;
    case 'box':
      body = <Box />;
      break;
    case 'eventloop':
      body = <EventLoop node={topic === 'nodejs'} />;
      break;
    case 'react':
      body = <ReactState />;
      break;
    case 'sql':
      body = <SQL />;
      break;
    case 'race':
      body = <Race />;
      break;
    case 'cache':
      body = <Cache />;
      break;
    case 'queue':
      body = <Queue />;
      break;
    case 'schedule':
      body = <Scheduler />;
      break;
    case 'capacity':
      body = <Capacity />;
      break;
    case 'latency':
      body = <Latency />;
      break;
    case 'base62':
      body = <Shortener />;
      break;
    case 'star':
      body = <Star />;
      break;
    default:
      body = <Trace kind={kind} />;
  }
  return (
    <section className="lab-frame" ref={islandRef} data-lab={topic}>
      <div className="lab-header">
        <span className="status-dot" />
        THỬ ĐỂ HIỂU<span>MÔ HÌNH HỌC TẬP</span>
      </div>
      <div className="lab-body">{body}</div>
      <div className="lab-footer">
        Mô hình đơn giản hóa để học nguyên lý. Các số liệu là giả định minh họa.
      </div>
    </section>
  );
}
