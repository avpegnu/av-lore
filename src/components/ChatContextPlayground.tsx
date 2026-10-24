import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { planChatContext, type ContextStrategy, type TurnFate } from '../lib/chat-context-models';
import '../styles/chat-context.css';
export default function ChatContextPlayground() {
  const ref = useIslandReady(),
    id = 'chat-context-' + useId().replace(/:/g, '');
  const [window, setWindow] = useState(32768),
    [turns, setTurns] = useState(40);
  const [group, setGroup] = useState(750),
    [chunks, setChunks] = useState(8);
  const [output, setOutput] = useState(4096),
    [strategy, setStrategy] = useState<ContextStrategy>('recent');
  const r = planChatContext({ window, turns, tokensPerGroup: group, chunks, output, strategy });
  const fates: Record<TurnFate, string> = {
    kept: 'Giữ nguyên',
    summarized: 'Qua summary',
    retrieved: 'Chọn lại',
    dropped: 'Bỏ khỏi prompt',
  };
  const parts = [
    ['System', r.system],
    ['Tools', r.tools],
    ['Evidence', r.evidence],
    ['Summary', r.summary],
    ['History', r.history],
    ['Output reserve', r.output],
    ['Margin', r.margin],
    ['Free', r.free],
  ] as const;
  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    set: (n: number) => void,
  ) => (
    <label>
      {label}
      <output>{value}</output>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(+e.target.value)}
      />
    </label>
  );
  return (
    <section ref={ref} className="handbook-experiment chat-context-playground" aria-labelledby={id}>
      <span className="eyebrow">CONTEXT / SELECT, RESERVE, VERIFY</span>
      <h3 id={id}>Model thật sự nhìn thấy những lượt nào?</h3>
      <p>
        Fixture: system 2048, tools 1024, margin 512 token; mỗi evidence chunk 512. Một ô là nhóm
        turn nguyên vẹn gồm các tool call/result liên quan. Token counts là giả định, không chạy
        tokenizer, summary model hoặc retrieval thật.
      </p>
      <div className="worksheet-choices" role="group" aria-label="Context window">
        {[8192, 32768, 131072].map((n) => (
          <button type="button" key={n} aria-pressed={window === n} onClick={() => setWindow(n)}>
            {n / 1024}K
          </button>
        ))}
      </div>
      <div
        className="worksheet-choices context-strategies"
        role="group"
        aria-label="History strategy"
      >
        {(['recent', 'summary', 'retrieve'] as ContextStrategy[]).map((s) => (
          <button
            type="button"
            key={s}
            aria-pressed={strategy === s}
            onClick={() => setStrategy(s)}
          >
            {s === 'recent'
              ? 'Giữ lượt mới nhất'
              : s === 'summary'
                ? 'Summary + lượt mới'
                : 'Chọn history liên quan'}
          </button>
        ))}
      </div>
      <div className="worksheet-inputs">
        {slider('Số nhóm turn', turns, 0, 80, 1, setTurns)}
        {slider('Token mỗi nhóm', group, 250, 1500, 250, setGroup)}
        {slider('Evidence chunks', chunks, 0, 40, 1, setChunks)}
        {slider('Output reserve', output, 1024, 8192, 1024, setOutput)}
      </div>
      <div className="context-composition" role="img" aria-label="Token composition">
        {parts
          .filter(([, n]) => n > 0)
          .map(([label, n]) => (
            <span
              key={label}
              data-segment={label}
              style={{ flexGrow: n }}
              title={`${label}: ${n}`}
              aria-hidden="true"
            />
          ))}
      </div>
      <dl className="context-legend">
        {parts.map(([label, n]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{n}</dd>
          </div>
        ))}
      </dl>
      <dl className="worksheet-results" aria-live="polite">
        <div>
          <dt>Required tokens</dt>
          <dd>{r.required}</dd>
        </div>
        <div>
          <dt>Remaining tokens</dt>
          <dd>{window - r.required}</dd>
        </div>
        <div>
          <dt>Prompt tokens</dt>
          <dd>{r.prompt}</dd>
        </div>
        <div>
          <dt>Fixed overflow</dt>
          <dd>{r.overflow}</dd>
        </div>
      </dl>
      <p className="worksheet-verdict" role="status">
        {r.fits
          ? 'Vừa ngân sách số học; chưa chứng minh giữ đủ thông tin để trả lời đúng.'
          : 'Fixed parts đã vượt cửa sổ: chặn model call và điều chỉnh evidence/output/model có chủ đích.'}
      </p>
      <h4>Nhóm turn: cũ → mới</h4>
      <ol className="context-turns" aria-label="History selection">
        {r.fates.map((f, i) => (
          <li key={i} data-fate={f}>
            <strong>{i + 1}</strong>
            <span>{fates[f]}</span>
          </li>
        ))}
      </ol>
      <dl className="context-fates">
        {(Object.keys(fates) as TurnFate[]).map((f) => (
          <div key={f} data-fate={f}>
            <dt>{fates[f]}</dt>
            <dd>{r.fates.filter((x) => x === f).length}</dd>
          </div>
        ))}
      </dl>
      <p>
        Summary giả định nén history cũ còn 10%, tối đa 1500 token rồi chọn suffix mới dài nhất còn
        vừa; kích thước này không bảo đảm quality. Retrieval giữ tối đa 4 nhóm mới và chọn tối đa 3
        nhóm cũ phân bố đều để minh họa; không có relevance ranking thật. Đổi strategy không tự khôi
        phục thông tin đã mất.
      </p>
      <p>
        Prompt tokens không gồm output reserve hoặc margin. Chi phí, cached-prefix discounts và
        tokenization phụ thuộc model/contract; thanh budget không phải hóa đơn. Production phải đếm
        prompt đã serialize, giữ trọn tool groups và đánh giá câu trả lời trên các facts bắt buộc.
      </p>
    </section>
  );
}
