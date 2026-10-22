import { useId, useRef, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import type { LocalizedText, Architecture } from '../lib/handbook-schema';
import ArchitectureExplorer from './ArchitectureExplorer';
type Stage = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  exitCriteria: LocalizedText;
  problem?: LocalizedText;
  decision?: LocalizedText;
  tradeoff?: LocalizedText;
  nextPressure?: LocalizedText;
  diagram?: Architecture;
};
export default function BuildTimeline({ stages }: { stages: Stage[] }) {
  const ref = useIslandReady(),
    uid = 'build-' + useId().replace(/:/g, '');
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [selected, setSelected] = useState(0);
  const stage = stages[selected];
  function select(index: number, focus = false) {
    setSelected(index);
    if (focus) buttons.current[index]?.focus({ preventScroll: true });
    const button = buttons.current[index],
      list = button?.closest('ol');
    if (button && list) {
      const item = button.getBoundingClientRect(),
        bounds = list.getBoundingClientRect();
      if (item.top < bounds.top + 16) list.scrollTop += item.top - bounds.top - 16;
      else if (item.bottom > bounds.bottom - 16) list.scrollTop += item.bottom - bounds.bottom + 16;
    }
  }
  return (
    <section className="build-timeline" ref={ref}>
      <ol aria-label="Các giai đoạn xây dựng">
        {stages.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              ref={(el) => {
                buttons.current[i] = el;
              }}
              aria-current={selected === i ? 'step' : undefined}
              aria-controls={uid}
              onClick={() => select(i)}
              onKeyDown={(event) => {
                let next: number | undefined;
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
                  next = Math.min(i + 1, stages.length - 1);
                if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = Math.max(i - 1, 0);
                if (event.key === 'Home') next = 0;
                if (event.key === 'End') next = stages.length - 1;
                if (next !== undefined) {
                  event.preventDefault();
                  select(next, true);
                }
              }}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              {item.title.vi}
            </button>
          </li>
        ))}
      </ol>
      <div className="build-navigation">
        <button type="button" disabled={selected === 0} onClick={() => select(selected - 1)}>
          ← Giai đoạn trước
        </button>
        <span>
          {selected + 1} / {stages.length}
        </span>
        <button
          type="button"
          disabled={selected === stages.length - 1}
          onClick={() => select(selected + 1)}
        >
          Giai đoạn tiếp →
        </button>
      </div>
      <div id={uid} className="build-stage">
        <div aria-live="polite">
          <span className="eyebrow">
            STAGE {selected + 1} / {stages.length}
          </span>
          <h3>{stage.title.vi}</h3>
          <p>{stage.description.vi}</p>
          <div className="build-decisions">
            {stage.problem && (
              <section>
                <h4>Áp lực cần giải quyết</h4>
                <p>{stage.problem.vi}</p>
              </section>
            )}
            {stage.decision && (
              <section>
                <h4>Quyết định kiến trúc</h4>
                <p>{stage.decision.vi}</p>
              </section>
            )}
            {stage.tradeoff && (
              <section>
                <h4>Chi phí và đánh đổi</h4>
                <p>{stage.tradeoff.vi}</p>
              </section>
            )}
            {stage.nextPressure && (
              <section>
                <h4>Khi nào cần bước tiếp?</h4>
                <p>{stage.nextPressure.vi}</p>
              </section>
            )}
          </div>
          <aside className="callout">
            <strong>Điều kiện trước khi mở rộng</strong>
            <p>{stage.exitCriteria.vi}</p>
          </aside>
        </div>
        {stage.diagram && <ArchitectureExplorer key={stage.id} diagram={stage.diagram} />}
      </div>
    </section>
  );
}
