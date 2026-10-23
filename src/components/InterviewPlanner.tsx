import { useEffect, useId, useState } from 'react';
import type { InterviewPlan } from '../lib/handbook-schema';
import { useIslandReady } from '../lib/use-island-ready';
import { planTimeline, phaseAt, formatClock } from '../lib/interview-planner';
import {
  practiceElapsed,
  pausePractice,
  resumePractice,
  rebasePractice,
  type PracticeClock,
} from '../lib/practice-clock';
export default function InterviewPlanner({ plan }: { plan: InterviewPlan }) {
  const ref = useIslandReady(),
    id = 'interview-' + useId().replace(/:/g, '');
  const [minutes, setMinutes] = useState(plan.phases.map((p) => p.minutes)),
    [selected, setSelected] = useState(0),
    [clock, setClock] = useState<PracticeClock>({ elapsedMs: 0, anchor: null }),
    [now, setNow] = useState(0),
    [speed, setSpeed] = useState(30);
  const [checked, setChecked] = useState<string[]>([]);
  const timeline = planTimeline(minutes, plan.duration),
    budgetMs = timeline.sessionSeconds * 1000,
    elapsedMs = practiceElapsed(clock, now, budgetMs, speed),
    elapsed = elapsedMs / 1000,
    running = clock.anchor !== null,
    active = phaseAt(elapsed, timeline),
    phase = plan.phases[selected],
    done = phase.checklist.filter((_, i) => checked.includes(phase.id + ':' + i)).length;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (running && elapsedMs >= budgetMs) setClock({ elapsedMs: budgetMs, anchor: null });
  }, [elapsedMs, running, budgetMs]);
  useEffect(() => {
    if (running && active >= 0) setSelected(active);
  }, [running, active]);
  const toggle = () => {
    const time = performance.now();
    setClock((old) =>
      old.anchor === null
        ? resumePractice(old, time, budgetMs, speed)
        : pausePractice(old, time, budgetMs, speed),
    );
    setNow(time);
  };
  const changeSpeed = (next: number) => {
    const time = performance.now();
    setClock((old) => rebasePractice(old, time, budgetMs, speed));
    setNow(time);
    setSpeed(next);
  };
  const select = (index: number) => {
    setSelected(index);
  };
  const moveTab = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % plan.phases.length;
    else if (event.key === 'ArrowLeft')
      next = (index + plan.phases.length - 1) % plan.phases.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = plan.phases.length - 1;
    else return;
    event.preventDefault();
    select(next);
    document.getElementById(id + '-tab-' + next)?.focus();
  };
  const reset = () => {
    setClock({ elapsedMs: 0, anchor: null });
    setNow(0);
    setSelected(0);
    setChecked([]);
    setSpeed(30);
    setMinutes(plan.phases.map((p) => p.minutes));
  };
  return (
    <section className="handbook-experiment interview-planner" ref={ref} aria-labelledby={id}>
      <header className="planner-heading">
        <div>
          <span className="eyebrow">THỬ TRỰC TIẾP</span>
          <h3 id={id}>Lên nhịp cho buổi phỏng vấn</h3>
        </div>
        <button type="button" className="secondary planner-reset" onClick={reset}>
          Đặt lại
        </button>
      </header>
      <p>
        Chia thời gian, chọn một giai đoạn để xem checklist, rồi chạy đồng hồ mô phỏng. Hoàn thành
        checklist không đồng nghĩa với đạt điểm phỏng vấn.
      </p>
      <p>
        Chọn checklist không chuyển đồng hồ. Mô phỏng tự theo khi bắt đầu hoặc đi sang giai đoạn
        mới; đổi tốc độ giữ phần thời gian đã chạy.
      </p>
      <div className="planner-timeline" role="tablist" aria-label="Các giai đoạn phỏng vấn">
        {plan.phases.map((p, i) => (
          <button
            type="button"
            role="tab"
            id={id + '-tab-' + i}
            aria-controls={id + '-panel'}
            aria-selected={selected === i}
            tabIndex={selected === i ? 0 : -1}
            key={p.id}
            className={running && active === i ? 'is-timed' : ''}
            style={{ flexGrow: minutes[i] }}
            onClick={() => select(i)}
            onKeyDown={(e) => moveTab(e, i)}
          >
            <span>{String(i + 1).padStart(2, '0')}</span>
            <strong>{p.title.vi}</strong>
            <small>{minutes[i]} min</small>
            {running && active === i && <span className="planner-now">Đang chạy</span>}
          </button>
        ))}
      </div>
      <div className="planner-clock-row">
        <button
          type="button"
          className="primary"
          disabled={timeline.buffer < 0 || elapsed >= timeline.sessionSeconds}
          onClick={toggle}
        >
          {running ? 'Tạm dừng' : 'Chạy mô phỏng'}
        </button>
        <span className="planner-clock" role="timer" aria-live="off" aria-label="Đồng hồ luyện tập">
          {formatClock(elapsed)} / {formatClock(timeline.sessionSeconds)}
        </span>
        <label className="planner-speed">
          <span>Tốc độ</span>
          <select value={speed} onChange={(e) => changeSpeed(+e.target.value)}>
            <option value={1}>1×</option>
            <option value={30}>30×</option>
            <option value={60}>60×</option>
          </select>
        </label>
      </div>
      <div
        className="planner-progress"
        role="progressbar"
        aria-label="Tiến độ thời gian"
        aria-valuemin={0}
        aria-valuemax={timeline.sessionSeconds}
        aria-valuenow={elapsed}
      >
        <span style={{ width: (elapsed / timeline.sessionSeconds) * 100 + '%' }} />
      </div>
      <p className="planner-budget" role="status" data-over={timeline.buffer < 0}>
        <span>{timeline.buffer < 0 ? 'Vượt ngân sách' : 'Thời gian dự phòng'}</span>
        <strong>{Math.abs(timeline.buffer) / 60} min</strong>
        {timeline.buffer < 0 && <span>Giảm thời gian trước khi bắt đầu.</span>}
      </p>
      <div className="planner-workspace">
        <div className="planner-sliders">
          {plan.phases.map((p, i) => (
            <label key={p.id}>
              <span>{p.title.vi}</span>
              <output>{minutes[i]} min</output>
              <input
                type="range"
                min={1}
                max={30}
                value={minutes[i]}
                disabled={running}
                onChange={(e) => {
                  const value = +e.target.value;
                  setMinutes((old) => old.map((m, j) => (j === i ? value : m)));
                  setClock({ elapsedMs: 0, anchor: null });
                  setNow(0);
                }}
              />
            </label>
          ))}
          <p>Ngân sách là gợi ý. Điều chỉnh theo đề bài và hướng dẫn của interviewer.</p>
        </div>
        <div
          className="planner-checklist"
          id={id + '-panel'}
          role="tabpanel"
          aria-labelledby={id + '-tab-' + selected}
          tabIndex={0}
        >
          <span className="eyebrow">CHECKLIST</span>
          <h4>{phase.title.vi}</h4>
          <p>{phase.description.vi}</p>
          {phase.checklist.map((item, i) => {
            const key = phase.id + ':' + i;
            return (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={checked.includes(key)}
                  onChange={(e) =>
                    setChecked((old) =>
                      e.target.checked ? [...old, key] : old.filter((k) => k !== key),
                    )
                  }
                />
                <span>{item.vi}</span>
              </label>
            );
          })}
          <div className="planner-completion">
            <span>Đã xong</span>
            <strong>
              {done} / {phase.checklist.length}
            </strong>
          </div>
        </div>
      </div>
      {elapsed >= timeline.sessionSeconds && (
        <p className="planner-finished" role="status">
          Đã hết thời gian. Tự đánh giá các quyết định còn thiếu và thử lại.
        </p>
      )}
    </section>
  );
}
