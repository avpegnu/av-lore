import { useId, useState } from 'react';
import SyncBoundaries from './SyncBoundaries';
import { useIslandReady } from '../lib/use-island-ready';
import { chunkDelta, syncConflict, syncEdits } from '../lib/file-sync-models';
export default function FileSyncPlayground({ kind }: { kind: 'sync-chunks' | 'sync-conflict' }) {
  const ref = useIslandReady(),
    id = 'file-sync-' + useId().replace(/:/g, '');
  const [size, setSize] = useState(4),
    [edit, setEdit] = useState<keyof typeof syncEdits>('replace'),
    [stage, setStage] = useState(3),
    [guarded, setGuarded] = useState(true),
    [first, setFirst] = useState<'A' | 'B'>('A');
  const delta = chunkDelta(size, edit),
    conflict = syncConflict(stage, guarded, first);
  return (
    <section className="handbook-experiment" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">FILE SYNC / CHUNKS AND OFFLINE EDITS</span>
      {kind === 'sync-chunks' && (
        <>
          <h3 id={id}>Thay một byte và chèn một byte khác nhau thế nào?</h3>
          <p>
            Demo dùng ASCII một byte/ký tự và fixed-size chunks rất nhỏ để dễ nhìn. So sánh exact
            chunk content, không chạy hash/storage thật. Các block có cùng content giữ cùng label;
            upload bytes chỉ đếm unique chunk mới trong scope của ví dụ.
          </p>
          <div className="worksheet-inputs">
            <label>
              Fixed chunk size / bytes<output>{size}</output>
              <input
                type="range"
                min={2}
                max={8}
                step={2}
                value={size}
                onChange={(e) => setSize(+e.target.value)}
              />
            </label>
          </div>
          <div className="worksheet-choices">
            {Object.keys(syncEdits).map((e) => (
              <button
                type="button"
                className="secondary"
                key={e}
                aria-pressed={edit === e}
                onClick={() => setEdit(e as keyof typeof syncEdits)}
              >
                {e === 'replace'
                  ? 'Thay byte tại chỗ'
                  : e === 'insert'
                    ? 'Chèn byte ở đầu'
                    : 'Append một block'}
              </button>
            ))}
          </div>
          <h4>Previous version</h4>
          <ol className="sync-chunk-list">
            {delta.before.map((c, i) => (
              <li key={i}>
                <code>{c.text}</code>
                <span>{c.id}</span>
              </li>
            ))}
          </ol>
          <h4>New version / ordered manifest</h4>
          <ol className="sync-chunk-list">
            {delta.after.map((c, i) => (
              <li key={i} data-reused={c.reused}>
                <code>{c.text}</code>
                <span>
                  {c.id} / {c.reused ? 'reuse' : 'new'}
                </span>
              </li>
            ))}
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>New file bytes</dt>
              <dd>{delta.fileBytes}</dd>
            </div>
            <div>
              <dt>Unique new chunk bytes</dt>
              <dd>{delta.uploadBytes}</dd>
            </div>
            <div>
              <dt>Reusable chunk positions</dt>
              <dd>{delta.reusedPositions}</dd>
            </div>
            <div>
              <dt>Unique new chunks</dt>
              <dd>{delta.needed.length}</dd>
            </div>
          </dl>
          <p>
            In-place edit thường chỉ đổi chunk chứa byte đó; insertion làm lệch fixed boundaries
            phía sau. CDC có thể resynchronize boundaries theo content nhưng không bảo đảm chỉ một
            chunk đổi. Re-export/compression/encryption có thể thay gần như mọi byte; không giả định
            delta luôn nhỏ.
          </p>
          <SyncBoundaries />
        </>
      )}
      {kind === 'sync-conflict' && (
        <>
          <h3 id={id}>Hai device cùng sửa report.bin từ revision 5</h3>
          <p>
            Cả A và B bắt đầu từ cùng revision rồi tạo hai nội dung khác nhau. Clock là stage, không
            phải timestamp để chọn winner. Stage 4 biểu diễn quyết định keep-both với file ID mới,
            không tự merge binary content.
          </p>
          <div className="worksheet-inputs">
            <label>
              Replay stage<output>{stage}</output>
              <input
                type="range"
                min={0}
                max={4}
                value={stage}
                onChange={(e) => setStage(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={guarded}
              onChange={(e) => setGuarded(e.target.checked)}
            />
            Compare parent revision trước commit
          </label>
          <div className="worksheet-choices">
            {(['A', 'B'] as const).map((device) => (
              <button
                type="button"
                key={device}
                className="secondary"
                aria-pressed={first === device}
                onClick={() => setFirst(device)}
              >
                {device} commits first
              </button>
            ))}
          </div>
          <ol className="sync-stage-list">
            {[
              'Both read revision 5',
              'Both edit offline',
              'First commit accepted',
              'Second commit arrives',
              'Explicit keep-both resolution',
            ].map((text, i) => (
              <li key={text} aria-current={stage === i ? 'step' : undefined}>
                {i} / {text}
              </li>
            ))}
          </ol>
          <div className="sync-file-state">
            <section>
              <h4>report.bin / file-main</h4>
              <code>{conflict.content}</code>
              <p>revision {conflict.revision}</p>
            </section>
            <section>
              <h4>Conflict copy</h4>
              {conflict.copy ? (
                <>
                  <code>{conflict.copy.name}</code>
                  <p>
                    {conflict.copy.content} / revision {conflict.copy.revision}
                  </p>
                </>
              ) : (
                <p>
                  {conflict.unresolved
                    ? 'Bản local chưa commit được giữ lại để resolve'
                    : 'Chưa có conflict copy'}
                </p>
              )}
            </section>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Primary file revision</dt>
              <dd>{conflict.revision}</dd>
            </div>
            <div>
              <dt>Unresolved conflict</dt>
              <dd>{conflict.unresolved ? 1 : 0}</dd>
            </div>
            <div>
              <dt>Files retained / scenario</dt>
              <dd>{conflict.files}</dd>
            </div>
            <div>
              <dt>Overwrite without conflict signal</dt>
              <dd>{conflict.overwrittenWithoutConflict ? 1 : 0}</dd>
            </div>
          </dl>
          <p>
            CAS từ chối stale parent; client giữ local bytes và có thể tạo conflict copy bằng
            operation idempotent. Tắt guard cho thấy silent overwrite, không chứng minh mọi version
            history bị xóa. Model không mô phỏng journal cursor, crash-safe filesystem apply hay
            rename/delete race.
          </p>
        </>
      )}
    </section>
  );
}
