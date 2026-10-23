import { useId, useState } from 'react';
import type { ReasoningScenario } from '../lib/handbook-schema';
import { useIslandReady } from '../lib/use-island-ready';
export default function ReasoningWorkshop({ scenarios }: { scenarios: ReasoningScenario[] }) {
  const ref = useIslandReady<HTMLElement>(),
    uid = 'argument-' + useId().replace(/:/g, '');
  const [scenarioId, setScenarioId] = useState(scenarios[0].id),
    [revealed, setRevealed] = useState<Set<string>>(new Set()),
    [drafts, setDrafts] = useState<Record<string, string>>({});
  const scenario = scenarios.find((s) => s.id === scenarioId)!;
  function toggle(id: string) {
    setRevealed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const next = scenario.claims.find((c) => !revealed.has(c.id));
  return (
    <section
      className="argument-workshop handbook-experiment"
      ref={ref}
      aria-labelledby={uid + '-title'}
    >
      <header>
        <span className="eyebrow">REASONING WORKSHOP</span>
        <h3 id={uid + '-title'}>Từ đề xuất ngắn đến lập luận có thể kiểm chứng</h3>
        <p>
          Đề xuất ban đầu cố ý thiếu context. Tự bổ sung yêu cầu, số liệu và failure behavior, rồi
          mở các góc nhìn để đối chiếu. Đây là ví dụ lập luận, không phải máy chấm level phỏng vấn.
        </p>
      </header>
      <label className="argument-scenario">
        Tình huống luyện tập
        <select
          value={scenarioId}
          onChange={(e) => {
            setScenarioId(e.target.value);
            setRevealed(new Set());
          }}
        >
          {scenarios.map((s) => (
            <option value={s.id} key={s.id}>
              {s.title.vi}
            </option>
          ))}
        </select>
      </label>
      <div className="argument-prompt">
        <strong>{scenario.prompt.vi}</strong>
        <p>{scenario.proposal.vi}</p>
        <span>Đề xuất còn thiếu bằng chứng và điều kiện áp dụng.</span>
      </div>
      <label className="argument-draft" htmlFor={uid + '-draft'}>
        Bạn sẽ giải thích thêm điều gì?
        <textarea
          id={uid + '-draft'}
          rows={5}
          maxLength={12000}
          value={drafts[scenario.id] || ''}
          onChange={(e) => setDrafts((p) => ({ ...p, [scenario.id]: e.target.value }))}
          placeholder="Yêu cầu → lựa chọn → bằng chứng → rủi ro → điều kiện đổi hướng"
        />
      </label>
      <p className="argument-local-note">
        Bản nháp chỉ giữ trong lần mở trang này, riêng cho từng tình huống. Sao chép nếu muốn giữ
        lâu; nội dung không được gửi đi hoặc tự chấm.
      </p>
      <nav className="argument-facets" aria-label="Chọn góc nhìn để đối chiếu">
        {scenario.claims.map((c, i) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={revealed.has(c.id)}
            onClick={() => toggle(c.id)}
          >
            <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            {c.title.vi}
          </button>
        ))}
      </nav>
      <p className="argument-count" role="status">
        <strong>
          {revealed.size} / {scenario.claims.length}
        </strong>{' '}
        <span>góc nhìn đã mở</span> · <span>Mở một mục không có nghĩa đề xuất đã đúng.</span>
      </p>
      {revealed.size === 0 && (
        <p className="argument-empty">
          Chọn một góc nhìn hoặc mở lần lượt để xem cách làm rõ lập luận.
        </p>
      )}
      <div className="argument-evidence">
        {scenario.claims
          .filter((c) => revealed.has(c.id))
          .map((c) => (
            <article key={c.id}>
              <h4>{c.title.vi}</h4>
              <p className="argument-statement">{c.statement.vi}</p>
              <dl>
                <dt>Vì sao cần làm rõ?</dt>
                <dd>{c.why.vi}</dd>
                <dt>Kiểm bằng chứng nào?</dt>
                <dd>{c.check.vi}</dd>
              </dl>
            </article>
          ))}
      </div>
      <footer className="argument-actions">
        <button
          type="button"
          disabled={!next}
          onClick={() => next && setRevealed((p) => new Set([...p, next.id]))}
        >
          Mở góc nhìn tiếp theo
        </button>
        <button type="button" onClick={() => setRevealed(new Set())}>
          Ẩn các góc nhìn đã mở
        </button>
      </footer>
    </section>
  );
}
