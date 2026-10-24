import { useState } from 'react';
import { boundaryExample, compareSyncBoundaries, type SyncChunk } from '../lib/sync-boundaries';
import '../styles/sync-boundaries.css';

function ByteChunks({ chunks, available }: { chunks: SyncChunk[]; available?: Set<string> }) {
  return (
    <ol className="boundary-chunks" translate="no">
      {chunks.map((c, i) => (
        <li key={c.offset} data-new={available ? !available.has(c.key) : undefined}>
          <span>
            #{i + 1} · offset {c.offset} · {c.bytes.length} B
            {available ? (available.has(c.key) ? ' · reuse' : ' · new') : ''}
          </span>
          <code>
            {c.bytes.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '·')).join('')}
          </code>
        </li>
      ))}
    </ol>
  );
}
export default function SyncBoundaries() {
  const [base, setBase] = useState(boundaryExample),
    [local, setLocal] = useState('X' + boundaryExample),
    [size, setSize] = useState(32),
    [bits, setBits] = useState(4);
  const reset = () => {
    setBase(boundaryExample);
    setLocal('X' + boundaryExample);
    setSize(32);
    setBits(4);
  };
  return (
    <div className="sync-boundary-lab">
      <h4>Tự sửa bytes để so sánh fixed boundaries và content-defined boundaries</h4>
      <p>
        Hai bản được encode thành UTF-8 thật. Mỗi phương pháp chỉ reuse exact bytes có trong các
        chunk của bản server tương ứng; không dùng fingerprint làm bằng chứng integrity hay quyền
        đọc. Đổi tham số sẽ cắt lại cả hai bản, không mô phỏng migration index hoặc commit file.
      </p>
      <div className="boundary-editors">
        <label>
          <span>Bản server trước thay đổi</span>
          <textarea
            value={base}
            onChange={(e) => setBase(e.target.value)}
            maxLength={512}
            rows={5}
            spellCheck={false}
            translate="no"
          />
        </label>
        <label>
          <span>Bản local cần đồng bộ</span>
          <textarea
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            maxLength={512}
            rows={5}
            spellCheck={false}
            translate="no"
          />
        </label>
      </div>
      <div className="worksheet-choices">
        <button type="button" className="secondary" onClick={() => setLocal('X' + base)}>
          Chèn X ở đầu bản server
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => setLocal('X' + Array.from(base).slice(1).join(''))}
        >
          Thay code point đầu bằng X
        </button>
        <button type="button" className="secondary" onClick={() => setLocal(base)}>
          Local giống server
        </button>
        <button type="button" className="secondary" onClick={reset}>
          Đặt lại ví dụ chunking
        </button>
      </div>
      <div className="worksheet-inputs">
        <label>
          Fixed size / bytes<output>{size}</output>
          <input
            type="range"
            min={16}
            max={64}
            step={16}
            value={size}
            onChange={(e) => setSize(+e.target.value)}
          />
        </label>
        <label>
          Fingerprint mask bits<output>{bits}</output>
          <input
            type="range"
            min={3}
            max={6}
            value={bits}
            onChange={(e) => setBits(+e.target.value)}
          />
        </label>
      </div>
      <p>
        Content-defined ở đây dùng rolling window 8 byte, cắt khi low bits bằng 0, min 8 và max 64
        byte; tail có thể ngắn hơn. Đây là thuật toán giảng giải riêng, không phải FastCDC/Rabin hay
        cryptographic hash. Ký tự ngoài ASCII hiển thị bằng dấu · trong từng chunk để không giả rằng
        boundary luôn trùng ký tự Unicode; offset và kích thước đều tính bằng byte.
      </p>
      <div className="boundary-comparison">
        {(['fixed', 'content'] as const).map((mode) => {
          const run = compareSyncBoundaries(base, local, mode, size, bits);
          return (
            <section key={mode} data-boundary-mode={mode}>
              <h5>{mode === 'fixed' ? 'Fixed-size' : 'Content-defined'}</h5>
              <dl className="worksheet-results" aria-live="polite">
                <div>
                  <dt>Local bytes</dt>
                  <dd data-boundary-bytes>{run.fileBytes}</dd>
                </div>
                <div>
                  <dt>Unique upload bytes</dt>
                  <dd data-boundary-upload>{run.uploadBytes}</dd>
                </div>
                <div>
                  <dt>New unique chunks</dt>
                  <dd>{run.newChunks}</dd>
                </div>
                <div>
                  <dt>Reused positions</dt>
                  <dd>{run.reusedPositions}</dd>
                </div>
              </dl>
              <details>
                <summary>Xem boundary của bản server</summary>
                <ByteChunks chunks={run.before} />
              </details>
              <h6>Local ordered chunks</h6>
              <ByteChunks chunks={run.after} available={new Set(run.before.map((c) => c.key))} />
            </section>
          );
        })}
      </div>
      <p>
        New/reuse được ghi bằng chữ, không chỉ màu. Với ví dụ mặc định chèn X, fixed cần 205 byte
        mới còn content-defined cần 19 byte; đó là kết quả của fixture này. Hãy thử dữ liệu hoặc
        mask khác: CDC không bảo đảm delta nhỏ hơn, và thêm metadata/CPU chưa được tính vào upload
        bytes.
      </p>
    </div>
  );
}
