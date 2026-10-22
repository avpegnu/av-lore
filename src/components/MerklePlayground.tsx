import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { merkleComparison } from '../lib/merkle-model';
export default function MerklePlayground() {
  const ref = useIslandReady(),
    id = 'merkle-' + useId().replace(/:/g, ''),
    [changed, setChanged] = useState<number[]>([2]),
    [steps, setSteps] = useState(1);
  const run = merkleComparison(changed),
    count = Math.min(steps, run.comparisons.length),
    visited = run.comparisons.slice(0, count);
  return (
    <section className="handbook-experiment" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">KEY–VALUE / ANTI-ENTROPY</span>
      <h3 id={id}>Tìm key khác nhau mà không gửi lại cả range</h3>
      <p>
        Hai replica giữ cùng 8 key theo cùng thứ tự và range boundaries. Toggle key để đổi value ở
        B, rồi bước qua tree comparison. H-label là identity tượng trưng của canonical subtree
        content, không phải cryptographic hash hoặc benchmark. Production cần collision-resistant
        digest và version/tombstone encoding thống nhất.
      </p>
      <div className="worksheet-choices">
        {Array.from({ length: 8 }, (_, k) => (
          <button
            type="button"
            key={k}
            className="secondary"
            aria-pressed={changed.includes(k)}
            onClick={() => {
              setChanged((old) => (old.includes(k) ? old.filter((n) => n !== k) : [...old, k]));
              setSteps(1);
            }}
          >
            K{k} / {changed.includes(k) ? 'B changed' : 'same'}
          </button>
        ))}
      </div>
      <div className="worksheet-inputs">
        <label>
          Compared node pairs
          <output>
            {count} / {run.comparisons.length}
          </output>
          <input
            type="range"
            min="1"
            max={Math.max(2, run.comparisons.length)}
            value={run.comparisons.length === 1 ? 1 : count}
            disabled={run.comparisons.length === 1}
            onChange={(e) => setSteps(+e.target.value)}
          />
        </label>
      </div>
      <div
        className="merkle-scroll"
        tabIndex={0}
        role="region"
        aria-label="Paired Merkle tree comparison"
      >
        <div className="merkle-levels">
          {run.levels.map((level, depth) => (
            <ol
              key={depth}
              style={{ gridTemplateColumns: `repeat(${level.length},minmax(0,1fr))` }}
            >
              {level.map((n) => (
                <li key={n.start} data-visited={visited.includes(n)} data-equal={n.equal}>
                  <strong>
                    {n.end - n.start === 1 ? 'K' + n.start : `K${n.start}–K${n.end - 1}`}
                  </strong>
                  <code>A {n.left}</code>
                  <code>B {n.right}</code>
                  <span>
                    {!visited.includes(n)
                      ? 'Not compared'
                      : n.equal
                        ? 'Equal / stop'
                        : 'Different / descend'}
                  </span>
                </li>
              ))}
            </ol>
          ))}
        </div>
      </div>
      <p>
        Mỗi hàng là một depth. Cặp bằng nhau dừng ở branch đó; cặp khác nhau được mở xuống children.
        Leaf khác nhau cần fetch/reconcile records theo version policy, không tự chọn A hay B làm
        winner.
      </p>
      <dl className="worksheet-results" aria-live="polite">
        <div>
          <dt>Compared pairs so far</dt>
          <dd>{count}</dd>
        </div>
        <div>
          <dt>Equal subtrees skipped</dt>
          <dd>{visited.filter((n) => n.equal && n.end - n.start > 1).length}</dd>
        </div>
        <div>
          <dt>Different leaves located</dt>
          <dd>{visited.filter((n) => !n.equal && n.end - n.start === 1).length}</dd>
        </div>
        <div>
          <dt>Total different leaves / scenario</dt>
          <dd>{run.different.length}</dd>
        </div>
      </dl>
      <details>
        <summary>Comparison transcript</summary>
        <ol>
          {visited.map((n) => (
            <li key={n.start + ',' + n.end}>
              {n.end - n.start === 1 ? 'K' + n.start : `K${n.start}–K${n.end - 1}`} / A {n.left}, B{' '}
              {n.right} / {n.equal ? 'Equal / stop' : 'Different / descend'}
            </li>
          ))}
        </ol>
      </details>
      <p>
        Tree comparison giảm data exchange khi nhiều subtree giống nhau; tạo tree vẫn phải đọc/hash
        data và repair vẫn tiêu IO/network. Matching root chỉ có ý nghĩa với cùng key range,
        snapshot/repair semantics và canonical encoding; hash collision/corruption không được mô
        phỏng.
      </p>
    </section>
  );
}
