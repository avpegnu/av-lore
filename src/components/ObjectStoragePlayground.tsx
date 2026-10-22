import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  erasureScenario,
  readerLifecycle,
  initialMultipart,
  multipartAction,
  type MultipartAction,
} from '../lib/object-storage-models';
const uploadActions: { action: MultipartAction; label: string }[] = [
  { action: 'replace-part', label: 'Writer khác thay part 2' },
  { action: 'refresh-manifest', label: 'Đọc lại manifest tags' },
  { action: 'restore-part', label: 'Upload lại đúng part 2' },
  { action: 'other-writer', label: 'Writer khác overwrite object' },
  { action: 'accept-current-head', label: 'Xác nhận intent với head hiện tại' },
  { action: 'complete', label: 'Complete upload' },
  { action: 'complete-lost-ack', label: 'Complete nhưng mất response' },
  { action: 'reconcile', label: 'Đối chiếu completion record' },
  { action: 'abort', label: 'Abort upload' },
];
const resultHelp: Record<string, string> = {
  PARTS_STAGED: 'Parts đã stage; object public vẫn giữ head cũ.',
  PART_REPLACED_MANIFEST_STALE: 'Part 2 đã đổi; manifest client đang giữ tag cũ.',
  INVALID_PART: 'Manifest tag không khớp part hiện tại; chưa publish.',
  MANIFEST_REFRESHED_NOT_CONTENT_VERIFIED: 'Tags đã đọc lại; expected content chưa được xác minh.',
  EXPECTED_CHECKSUM_MISMATCH: 'Tags khớp nhưng assembled bytes sai intent; chưa publish.',
  EXPECTED_PART_REUPLOADED: 'Đã upload lại BBB với tag mới và cập nhật manifest.',
  OTHER_WRITER_COMMITTED: 'Writer khác đã thay public head; expected head của upload không tự đổi.',
  PRECONDITION_FAILED: 'Public head đã đổi; conditional publish chặn lost update.',
  NEW_OVERWRITE_INTENT:
    'Expected head đã đổi theo thao tác xác nhận; parts/checksum vẫn cần hợp lệ.',
  COMMITTED: 'Đã publish generation mới sau validation.',
  COMMITTED_RESPONSE_LOST: 'Server đã commit nhưng client chưa biết; reconcile trước blind retry.',
  COMPLETION_FOUND:
    'Đã tìm thấy version của upload; writer khác vẫn có thể đổi current head sau đó.',
  ALREADY_COMPLETED: 'Upload đã complete; thao tác này không tạo thêm version hay xóa object.',
  ABORTED_NO_INFLIGHT_PARTS_IN_MODEL:
    'Upload đã abort và cleanup theo giả định không có part request đang chạy.',
  NO_SUCH_UPLOAD: 'Session đã abort nên không thể complete tiếp.',
  OPEN: 'Chưa có completion record; upload vẫn OPEN trong authority của mô hình.',
  ABORTED: 'Authority xác nhận upload đã abort.',
};
const readerSteps = [
  'Head v1 có dữ liệu ABCDEF',
  'Reader pin immutable v1',
  'PUT publish v2 với dữ liệu UVWXYZ',
  'GC thử xóa v1 không còn là head',
  'Reader đọc xong rồi release pin',
  'GC thử lại sau khi reader kết thúc',
];
export default function ObjectStoragePlayground({
  kind,
}: {
  kind: 'object-erasure' | 'object-multipart' | 'object-reader';
}) {
  const ref = useIslandReady(),
    id = 'obj-' + useId().replace(/:/g, '');
  const [k, setK] = useState<4 | 8>(8),
    [placement, setPlacement] = useState<'balanced' | 'packed'>('balanced'),
    [domains, setDomains] = useState<number[]>([]),
    [fragments, setFragments] = useState<number[]>([]),
    [step, setStep] = useState(3),
    [pin, setPin] = useState(true),
    [upload, setUpload] = useState(initialMultipart),
    [conditional, setConditional] = useState(true),
    [checksum, setChecksum] = useState(true);
  const ec = erasureScenario(k, placement, domains, fragments),
    reader = readerLifecycle(step, pin),
    toggle = (values: number[], value: number) =>
      values.includes(value) ? values.filter((x) => x !== value) : [...values, value];
  return (
    <section className="handbook-experiment object-playground" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">OBJECT STORAGE / PUBLICATION, FAILURE DOMAINS AND READERS</span>
      {kind === 'object-erasure' && (
        <>
          <h3 id={id}>Đếm fragments mất, không chỉ đếm zones mất</h3>
          <p>
            Giả định systematic MDS code: bất kỳ k fragments hợp lệ trong k+m có thể phục hồi
            object. Lab chỉ tính availability và bytes, không encode Reed–Solomon và không dự đoán
            xác suất durability. Object giả định 960 MB thập phân; ba zones là failure domains chung
            của nhiều fragments.
          </p>
          <div className="object-actions">
            {([4, 8] as const).map((n) => (
              <button
                type="button"
                key={n}
                aria-pressed={k === n}
                onClick={() => {
                  setK(n);
                  setFragments([]);
                }}
              >
                {n}+{n / 2}
              </button>
            ))}
          </div>
          <div className="object-actions">
            <button
              type="button"
              aria-pressed={placement === 'balanced'}
              onClick={() => setPlacement('balanced')}
            >
              Phân bố đều ba zones
            </button>
            <button
              type="button"
              aria-pressed={placement === 'packed'}
              onClick={() => setPlacement('packed')}
            >
              Dồn data vào zone A
            </button>
          </div>
          <div className="object-domain-toggles">
            {[0, 1, 2].map((d) => (
              <label key={d} className="worksheet-toggle">
                <input
                  type="checkbox"
                  checked={domains.includes(d)}
                  onChange={() => setDomains(toggle(domains, d))}
                />
                Mất zone {String.fromCharCode(65 + d)}
              </label>
            ))}
          </div>
          <div className="object-domains">
            {[0, 1, 2].map((d) => (
              <section key={d} data-down={domains.includes(d)}>
                <h4>Zone {String.fromCharCode(65 + d)}</h4>
                <p>{domains.includes(d) ? 'DOWN' : 'UP'}</p>
                <div>
                  {ec.fragments
                    .filter((f) => f.domain === d)
                    .map((f) => (
                      <button
                        type="button"
                        key={f.id}
                        disabled={domains.includes(d)}
                        aria-pressed={fragments.includes(f.id)}
                        data-available={f.available}
                        onClick={() => setFragments(toggle(fragments, f.id))}
                      >
                        {f.id < k ? 'D' + f.id : 'P' + (f.id - k)} {f.available ? '✓' : '×'}
                      </button>
                    ))}
                </div>
              </section>
            ))}
          </div>
          <p>
            Bấm một fragment để mô phỏng thêm failure đã biết. Với 8+4 phân bố đều, một zone mất bốn
            fragments và còn đúng tám; một fragment hỏng thêm ở zone khác sẽ vượt tolerance. Nếu dồn
            cả tám data fragments vào zone A, mất riêng A đã không đủ survivors. Không cần mười hai
            zones để chịu một zone loss, nhưng placement phải giữ số fragments mất trong giới hạn
            code.
          </p>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Fragments còn hợp lệ</dt>
              <dd>
                {ec.available} / {ec.n}
              </dd>
            </div>
            <div>
              <dt>Fragments cần để recover</dt>
              <dd>{ec.k}</dd>
            </div>
            <div>
              <dt>Fragments đã mất</dt>
              <dd>{ec.unavailable}</dd>
            </div>
            <div>
              <dt>Trạng thái availability</dt>
              <dd>{ec.recoverable ? 'RECOVERABLE' : 'UNRECOVERABLE'}</dd>
            </div>
            <div>
              <dt>Raw overhead</dt>
              <dd>{ec.overhead.toFixed(2)}×</dd>
            </div>
            <div>
              <dt>Encoded payload / MB</dt>
              <dd>{ec.encodedMB}</dd>
            </div>
            <div>
              <dt>Một fragment / MB</dt>
              <dd>{ec.fragmentMB}</dd>
            </div>
            <div>
              <dt>Basic repair reads cho một fragment / MB</dt>
              <dd>{ec.recoverable ? ec.basicOneFragmentRepairReadMB : '—'}</dd>
            </div>
          </dl>
          <p>
            Repair budget minh họa đọc k full fragments của một stripe để tái tạo một fragment khi
            còn đủ survivors; không phải mọi systematic/range/LRC implementation đều đọc như vậy.
            Không thể từ overhead hoặc AFR suy ra “11 nines”; cần failure correlation, repair time,
            latent corruption và software-deletion model.
          </p>
        </>
      )}
      {kind === 'object-multipart' && (
        <>
          <h3 id={id}>Parts đã upload chưa phải object đã publish</h3>
          <p>
            Object public ban đầu là head 3 với payload OLD. Upload riêng đã stage ba parts AAA,
            BBB, CCC; intent là AAABBBCCC. Tags pN-vN là opaque symbols, không phải MD5. Checksum
            trong lab là so sánh chính xác expected payload, không triển khai thuật toán hash.
            Completion record được nền tảng giả định giữ để reconcile unknown responses; đây không
            phải simulator đầy đủ của S3.
          </p>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={conditional}
              onChange={(e) => setConditional(e.target.checked)}
            />
            Publish có điều kiện theo expected head
          </label>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={checksum}
              onChange={(e) => setChecksum(e.target.checked)}
            />
            Kiểm expected application checksum
          </label>
          <p>
            Guard configuration: {conditional ? 'CAS ON' : 'CAS OFF'} ·{' '}
            {checksum ? 'CHECKSUM ON' : 'CHECKSUM OFF'}
          </p>
          <div className="object-actions">
            {uploadActions.map((a) => (
              <button
                type="button"
                key={a.action}
                data-action={a.action}
                onClick={() =>
                  setUpload((s) => multipartAction(s, a.action, conditional, checksum))
                }
              >
                {a.label}
              </button>
            ))}
            <button type="button" onClick={() => setUpload(initialMultipart())}>
              Reset upload
            </button>
          </div>
          <div className="object-upload-parts">
            {upload.parts.map((p) => (
              <section key={p.number}>
                <h4>Part {p.number}</h4>
                <strong>{p.data}</strong>
                <p>{p.tag}</p>
                <p>Manifest: {upload.manifest.find((m) => m.number === p.number)?.tag ?? '—'}</p>
              </section>
            ))}
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Public head generation</dt>
              <dd>{upload.head}</dd>
            </div>
            <div>
              <dt>Expected head generation</dt>
              <dd>{upload.expectedHead}</dd>
            </div>
            <div>
              <dt>Public payload hiện tại</dt>
              <dd>{upload.payload}</dd>
            </div>
            <div>
              <dt>Server upload state</dt>
              <dd>{upload.upload}</dd>
            </div>
            <div>
              <dt>Client knowledge</dt>
              <dd>{upload.client}</dd>
            </div>
            <div>
              <dt>Kết quả thao tác</dt>
              <dd>{upload.result}</dd>
            </div>
          </dl>
          <p role="status">{resultHelp[upload.result]}</p>
          <details>
            <summary>Thử ba chuỗi lỗi có chủ đích</summary>
            <ol>
              <li>
                Thay part 2 rồi Complete: manifest tag cũ bị reject. Đọc lại tags rồi Complete:
                checksum còn phát hiện XXX khác BBB. Upload lại đúng part 2 mới khôi phục intent.
              </li>
              <li>
                Writer khác overwrite public object rồi Complete: conditional check chặn lost
                update. Chỉ xác nhận expected head mới khi đã xem và chấp nhận overwrite intent,
                không blind retry.
              </li>
              <li>
                Reset rồi Complete nhưng mất response: server đã publish, client UNKNOWN. Reconcile
                completion record cho biết version đã commit mà không tạo thêm version.
              </li>
            </ol>
          </details>
          <p>
            Abort trong lab không có in-flight part requests nên cleanup ngay. Hệ thống thật cần
            fence/recheck uploads đang chạy và reclaim staged bytes an toàn. Abort sau completion
            không được xóa object public; DELETE object là operation khác. API thực còn có ordered
            manifest/size/checksum rules và phải parse final success body, không chỉ status header.
          </p>
        </>
      )}
      {kind === 'object-reader' && (
        <>
          <h3 id={id}>Đổi head không cho phép GC phá reader cũ</h3>
          <p>
            Đây là một overwrite không giữ user-visible version history. Reader đã resolve immutable
            v1 trước khi head chuyển v2; nó phải đọc trọn v1 thay vì lấy fragments của head mới giữa
            chừng. Pin là logical protection trong lab; triển khai distributed cần
            lease/epoch/reference contract và xử lý crashes.
          </p>
          <div className="worksheet-inputs">
            <label>
              Bước lifecycle<output>{step} / 5</output>
              <input
                type="range"
                min="0"
                max="5"
                value={step}
                onChange={(e) => setStep(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} />
            GC tôn trọng active reader pin
          </label>
          <ol className="object-reader-steps">
            {readerSteps.map((title, i) => (
              <li key={title} data-past={i <= step} aria-current={i === step ? 'step' : undefined}>
                <strong>{i}</strong>
                <span>{title}</span>
              </li>
            ))}
          </ol>
          <div className="object-upload-parts">
            <section>
              <h4>Immutable v1</h4>
              <strong>{reader.oldExists ? 'ABCDEF' : 'RECLAIMED'}</strong>
              <p>{reader.pinActive ? 'PIN ACTIVE' : 'NO ACTIVE PIN'}</p>
            </section>
            <section>
              <h4>Immutable v2</h4>
              <strong>{reader.newExists ? 'UVWXYZ' : 'NOT WRITTEN'}</strong>
              <p>Current head: {reader.head}</p>
            </section>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Reader resolve version</dt>
              <dd>{reader.readerVersion}</dd>
            </div>
            <div>
              <dt>Reader state</dt>
              <dd>{reader.readerState}</dd>
            </div>
            <div>
              <dt>Old bytes còn giữ</dt>
              <dd>{reader.retainedOldBytes}</dd>
            </div>
          </dl>
          <p>
            Tắt pin protection để thấy GC tại bước 3 làm reader fail ở bước 4, dù GET resolve
            metadata ban đầu đúng. Với pin, reader hoàn tất rồi GC bước 5 reclaim được v1.
            Versioning, retention locks và multipart publication có thêm references; fixed grace
            period chỉ an toàn khi có bounds đúng, không phải một số phút tùy ý.
          </p>
        </>
      )}
    </section>
  );
}
