import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  completionRace,
  codingContextPack,
  codingPatchGate,
  contextPieces,
  type PatchScenario,
} from '../lib/coding-assistant-models';
export default function CodingAssistantPlayground({
  kind,
}: {
  kind: 'coding-race' | 'coding-context' | 'coding-patch';
}) {
  const ref = useIslandReady(),
    id = 'coding-assistant-' + useId().replace(/:/g, '');
  const [debounce, setDebounce] = useState(100),
    [latency, setLatency] = useState(200),
    [snapshot, setSnapshot] = useState(true),
    [deadline, setDeadline] = useState(true),
    [cancel, setCancel] = useState(true);
  const [budget, setBudget] = useState(1500),
    [exclude, setExclude] = useState(true);
  const [scenario, setScenario] = useState<PatchScenario>('workspace-changed'),
    [baseGuard, setBaseGuard] = useState(true),
    [testGuard, setTestGuard] = useState(true),
    [approvalGuard, setApprovalGuard] = useState(true),
    [atomic, setAtomic] = useState(true);
  const race = completionRace(debounce, latency, snapshot, deadline, cancel),
    packing = codingContextPack(budget, exclude),
    patch = codingPatchGate(scenario, baseGuard, testGuard, approvalGuard, atomic);
  const maxTime = Math.max(race.deadline, ...race.events.map((e) => e.finish)) * 1.1;
  const toggle = (label: string, v: boolean, set: (v: boolean) => void) => (
    <label className="worksheet-toggle">
      <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );
  const slider = (
    label: string,
    v: number,
    set: (v: number) => void,
    min: number,
    max: number,
    step: number,
  ) => (
    <label key={label}>
      {label}
      <output>{v}</output>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => set(+e.target.value)}
      />
    </label>
  );
  const scenarioLabels: Record<PatchScenario, string> = {
    fresh: 'Base và patch còn khớp',
    'workspace-changed': 'Workspace đổi trước validation',
    'patch-changed': 'Patch đổi sau tests/review',
    'concurrent-edit': 'User edit giữa check và commit',
    'excluded-path': 'Patch chạm path ngoài scope',
  };
  return (
    <section
      ref={ref}
      className="handbook-experiment coding-assistant-playground"
      aria-labelledby={id}
    >
      <span className="eyebrow">CODING / SNAPSHOTS, CONTEXT AND PATCH EVIDENCE</span>
      <h3 id={id}>
        {kind === 'coding-race'
          ? 'Response đến muộn không được ghi đè current snapshot'
          : kind === 'coding-context'
            ? 'Required context vẫn phải nằm trong token budget'
            : 'Apply đúng patch đã review và test trên đúng base'}
      </h3>
      <p>
        {kind === 'coding-race'
          ? 'Fixture có keystrokes ở 0/80/160 ms, revisions v1/v2/v3 và usefulness deadline 500 ms. Base latency + fixed extras [500,200,0] tạo response reordering; không là GPU/network benchmark. Cancellation được acknowledge cho R2, R1 có thể vẫn trả về trong fixture. Không gọi model hoặc sửa editor thật.'
          : kind === 'coding-context'
            ? 'Các context pieces có token counts được gán sẵn, không chạy tokenizer hoặc đo model quality. PREFIX 400 + SUFFIX 200 là required. Nếu budget dưới 600, lab không tạo prompt thay vì silently vượt limit. EXCLUDED_CONFIG chỉ là tên placeholder, không đọc hoặc gửi file thật.'
            : 'Scenario dùng immutable BASE/PATCH IDs và evidence manifest minh họa. Test/review flags chỉ kiểm binding của evidence, không chạy tests hoặc chứng minh patch đúng. Commit-time compare-and-swap chống user edit sau precheck; lab không apply diff, commit hoặc push repo thật.'}
      </p>
      {kind === 'coding-race' && (
        <>
          <div className="worksheet-inputs">
            {slider('Debounce delay (ms)', debounce, setDebounce, 0, 200, 20)}
            {slider('Fixture base latency (ms)', latency, setLatency, 100, 600, 50)}
          </div>
          {toggle('Check document/request snapshot trước show', snapshot, setSnapshot)}
          {toggle('Bỏ suggestion qua usefulness deadline', deadline, setDeadline)}
          {toggle('Request cancel cho superseded work', cancel, setCancel)}
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Admitted requests</dt>
              <dd>{race.admitted}</dd>
            </div>
            <div>
              <dt>Last shown request</dt>
              <dd>{race.lastShown}</dd>
            </div>
            <div>
              <dt>Stale suggestions shown</dt>
              <dd>{race.staleShown}</dd>
            </div>
            <div>
              <dt>Cancel requested</dt>
              <dd>{race.cancelRequested}</dd>
            </div>
          </dl>
          <figure className="coding-timeline">
            <figcaption>Requests theo thời điểm response · deadline {race.deadline} ms</figcaption>
            {race.events.map((e) => (
              <article key={e.id} data-stale={e.stale}>
                <h4>
                  {e.id} · snapshot v{e.revision}
                </h4>
                <div aria-hidden="true">
                  <i
                    style={{
                      left: (e.start / maxTime) * 100 + '%',
                      width: ((e.finish - e.start) / maxTime) * 100 + '%',
                    }}
                  />
                  <b style={{ left: (race.deadline / maxTime) * 100 + '%' }} />
                </div>
                <p>
                  {e.start} → {e.finish} ms · <strong>{e.outcome}</strong>
                </p>
              </article>
            ))}
          </figure>
          <p className="worksheet-footnote">
            Cancel request không thay snapshot validity gate và không chứng minh saved GPU/billed
            tokens. Production cần exact document/range/prefix-suffix identity, epoch/request
            generation và editor apply preconditions. Usefulness deadline là task input, không
            universal p90 target cho mọi language/device.
          </p>
        </>
      )}
      {kind === 'coding-context' && (
        <>
          <div className="worksheet-inputs">
            {slider('Total input-token budget', budget, setBudget, 500, 2500, 100)}
          </div>
          {toggle('Enforce org/user exclusions trước context packing', exclude, setExclude)}
          <div className="coding-state" role="status">
            <strong>{packing.state}</strong>
          </div>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Used / budget</dt>
              <dd>
                {packing.used} / {budget}
              </dd>
            </div>
            <div>
              <dt>Selected pieces</dt>
              <dd>{packing.selected.length}</dd>
            </div>
            <div>
              <dt>Excluded piece included?</dt>
              <dd>{packing.excludedIncluded ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Quality effect</dt>
              <dd>NOT_MODELED</dd>
            </div>
          </dl>
          <ol className="coding-pieces" aria-label="Fixed context pieces and admission decisions">
            {contextPieces.map((p) => (
              <li key={p.id} data-selected={packing.selected.includes(p.id)}>
                <h4>{p.id}</h4>
                <p>
                  {p.tokens} tokens · {p.required ? 'REQUIRED' : 'OPTIONAL'} ·{' '}
                  {p.excluded ? 'EXCLUDED' : 'ELIGIBLE'}
                </p>
                <strong>{packing.selected.includes(p.id) ? 'SELECTED' : 'NOT_SELECTED'}</strong>
              </li>
            ))}
          </ol>
          <p className="worksheet-footnote">
            Greedy priority packing là fixture, không optimizer hoặc quality ranking thật. Đếm
            prompt/template/tool overhead và tokenizer thực tế trong production; local context cũng
            có extraction/CPU/privacy cost. Required input quá lớn cần explicit truncation/alternate
            mode theo policy, không bypass limit.
          </p>
        </>
      )}
      {kind === 'coding-patch' && (
        <>
          <div className="coding-actions" role="group" aria-label="Patch evidence scenarios">
            {(Object.keys(scenarioLabels) as PatchScenario[]).map((s) => (
              <button
                type="button"
                key={s}
                aria-pressed={scenario === s}
                onClick={() => setScenario(s)}
              >
                {scenarioLabels[s]}
              </button>
            ))}
          </div>
          {toggle('Validate current base trước admission', baseGuard, setBaseGuard)}
          {toggle('Bind test evidence với patch/base/environment', testGuard, setTestGuard)}
          {toggle('Bind review decision với exact patch/base', approvalGuard, setApprovalGuard)}
          {toggle('Atomic current-version check tại apply commit', atomic, setAtomic)}
          <dl className="worksheet-results" aria-live="polite">
            <div className="coding-long-state">
              <dt>Patch state</dt>
              <dd>{patch.state}</dd>
            </div>
            <div>
              <dt>Applied in fixture?</dt>
              <dd>{patch.applied ? 'YES' : 'NO'}</dd>
            </div>
            <div>
              <dt>Proposed patch</dt>
              <dd>{patch.proposal}</dd>
            </div>
          </dl>
          <figure className="handbook-table">
            <div
              className="coding-evidence-table"
              role="region"
              aria-label="Patch base, test and review evidence identities"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>Patch identity</th>
                    <th>Fixture value</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Proposed base', patch.base],
                    ['Current base at precheck', patch.current],
                    ['Tested base', patch.evidence.testedBase],
                    ['Tested patch', patch.evidence.testedPatch],
                    ['Test environment', patch.evidence.environment],
                    ['Approved base', patch.evidence.approvedBase],
                    ['Approved patch', patch.evidence.approvedPatch],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </figure>
          <p className="worksheet-footnote">
            Tests passing chỉ nói về exercised checks trên tested artifact/environment. New
            patch/base cần requalify theo risk; permission/excluded-path checks không được bypass
            bằng model claim. Multi-file apply/rebase/rollback có transaction semantics riêng; không
            tự assume mọi editor/workspace edit atomic.
          </p>
        </>
      )}
    </section>
  );
}
