import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import {
  studioKinds,
  studioLimits,
  studioNode,
  starterStudio,
  parseStudioDesign,
  reviewStudio,
  connectStudio,
  removeStudioNode,
  studioMarkdown,
  type StudioDesign,
  type StudioNode,
  type StudioKind,
} from '../lib/design-studio-models';
import { studioPrompts, studioExample } from '../lib/design-studio-prompts';
type Draft = { design: StudioDesign; reads: number; writes: number; lost: number };
const key = 'av-lore-design-studio-v1';
const validDraft = (raw: unknown): Draft => {
  if (!raw || typeof raw !== 'object') throw Error('INVALID_DRAFT');
  const d = raw as Draft;
  if (
    ![d.reads, d.writes].every(
      (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e9,
    ) ||
    !Number.isInteger(d.lost) ||
    d.lost < 0 ||
    d.lost > 1000
  )
    throw Error('INVALID_WORKLOAD');
  return { design: parseStudioDesign(d.design), reads: d.reads, writes: d.writes, lost: d.lost };
};
const initial = (id: string): Draft => {
  const p = studioPrompts.find((p) => p.id === id) || studioPrompts[0];
  return { design: starterStudio(), reads: p.reads, writes: p.writes, lost: 0 };
};
const findings: Record<string, { title: string; detail: string }> = {
  NO_CLIENT: {
    title: 'Chưa có traffic source',
    detail:
      'Thêm client để xác định nguồn aggregate read/write rates. Nếu có nhiều clients, fixture chia đều workload giữa chúng.',
  },
  NO_ENTRY: {
    title: 'Traffic source chưa có đường ra',
    detail:
      'Nối client tới entry component bằng edge có multiplier dương. Chỉ đặt các boxes cạnh nhau không tạo luồng xử lý.',
  },
  CYCLE_NOT_MODELED: {
    title: 'Có cycle: chỉ review cấu trúc',
    detail:
      'Fixture DAG không giải feedback/retry loops. Bỏ cycle hoặc mô tả retry amplification có giới hạn bằng một edge multiplier; không suy tải từ kết quả bị bỏ trống.',
  },
  UNREACHABLE_COMPONENT: {
    title: 'Component chưa reachable từ traffic source',
    detail:
      'Kiểm tra hướng edge và multipliers; component không có operation path không được tính là phục vụ workload.',
  },
  CAPACITY_EXCEEDED: {
    title: 'Tải vượt capacity giả định',
    detail:
      'Kiểm tra operation multipliers, misses và independent read/write ceilings. Tăng units hoặc đổi design cần capacity evidence thực tế; số units không tự bảo đảm linear scaling.',
  },
  LOW_ASSUMED_HEADROOM: {
    title: 'Ít headroom theo giả định lab',
    detail:
      'Tỷ lệ từ 80% tới 100% được highlight để luyện stress testing. Đây không phải universal utilization threshold hoặc mô hình tail latency.',
  },
  QUEUE_WITHOUT_DIRECT_WORKER: {
    title: 'Queue chưa có direct worker edge',
    detail:
      'Đây là structural hint: nếu có consumer qua topology khác, giải thích contract trong notes. Queue không tự làm work hoàn tất hoặc exactly-once.',
  },
  NO_MODELED_DURABLE_WRITE_PATH: {
    title: 'Chưa có modeled write path tới store',
    detail:
      'Không có SQL/KV/blob nhận positive write operations. Có store reachable cũng chưa chứng minh transaction, replication ACK, recovery hoặc invariant correctness.',
  },
};
export default function DesignStudio() {
  const ref = useIslandReady<HTMLElement>(),
    uid = useId().replace(/:/g, ''),
    canvas = useRef<HTMLDivElement>(null),
    drag = useRef<{ id: string; pointer: number; dx: number; dy: number } | null>(null);
  const [promptId, setPromptId] = useState(studioPrompts[0].id),
    [drafts, setDrafts] = useState<Record<string, Draft>>({}),
    [loaded, setLoaded] = useState(false),
    [selected, setSelected] = useState('client-1'),
    [kind, setKind] = useState<StudioKind>('service'),
    [target, setTarget] = useState(''),
    [readFactor, setReadFactor] = useState(1),
    [writeFactor, setWriteFactor] = useState(1),
    [reviewOn, setReviewOn] = useState(false),
    [compare, setCompare] = useState(false),
    [view, setView] = useState<'canvas' | 'list'>('canvas'),
    [status, setStatus] = useState('Đang đọc bản thiết kế trên trình duyệt…'),
    [armed, setArmed] = useState<'reset' | 'example' | null>(null);
  const p = studioPrompts.find((p) => p.id === promptId) || studioPrompts[0],
    draft = drafts[p.id] || initial(p.id),
    d = draft.design,
    node = d.nodes.find((n) => n.id === selected),
    report = reviewStudio(d, draft.reads, draft.writes, draft.lost);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || 'null');
      if (raw) {
        if (raw.version !== 1 || !raw.drafts || typeof raw.drafts !== 'object')
          throw Error('INVALID_STORE');
        const clean: Record<string, Draft> = {};
        for (const p of studioPrompts)
          if (raw.drafts[p.id]) clean[p.id] = validDraft(raw.drafts[p.id]);
        setDrafts(clean);
        if (studioPrompts.some((p) => p.id === raw.promptId)) setPromptId(raw.promptId);
      }
      setStatus('Bản thiết kế được lưu riêng cho từng đề trên trình duyệt này.');
      setLoaded(true);
    } catch {
      setStatus(
        'Không đọc được dữ liệu đã lưu; phiên này chưa tự lưu để giữ bản cũ. Hãy xuất JSON trước khi tải lại.',
      );
    }
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify({ version: 1, promptId, drafts }));
    } catch {
      setStatus('Không lưu được vào trình duyệt; hãy xuất JSON để giữ bản thiết kế.');
    }
  }, [drafts, promptId, loaded]);
  useEffect(() => {
    const externalChange = (event: StorageEvent) => {
      if (event.key !== key) return;
      setLoaded(false);
      setStatus(
        'Bản lưu đổi ở tab khác; phiên này tạm ngừng tự lưu. Xuất JSON nếu cần giữ thay đổi, rồi tải lại để đồng bộ.',
      );
    };
    window.addEventListener('storage', externalChange);
    return () => window.removeEventListener('storage', externalChange);
  }, []);
  const edit = (fn: (cur: Draft) => Draft) => {
    setDrafts((all) => {
      const next = fn(all[p.id] || initial(p.id));
      validDraft(next);
      return { ...all, [p.id]: next };
    });
    setArmed(null);
  };
  const mutate = (fn: (cur: StudioDesign) => StudioDesign) =>
    edit((cur) => ({ ...cur, design: fn(cur.design) }));
  const update = (id: string, patch: Partial<StudioNode>) =>
    mutate((cur) => ({
      ...cur,
      nodes: cur.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }));
  const choose = (id: string) => {
    setPromptId(id);
    setSelected('client-1');
    setTarget('');
    setReviewOn(false);
    setCompare(false);
    setArmed(null);
  };
  const add = () => {
    if (d.nodes.length >= studioLimits.nodes) {
      setStatus('Đã đạt giới hạn 30 components cho một bản thiết kế.');
      return;
    }
    let index = 1;
    while (d.nodes.some((n) => n.id === kind + '-' + index)) index++;
    const id = kind + '-' + index;
    mutate((cur) => ({ ...cur, nodes: [...cur.nodes, studioNode(kind, id, cur.nodes.length)] }));
    setSelected(id);
  };
  const remove = (id: string) => {
    mutate((cur) => removeStudioNode(cur, id));
    if (selected === id) setSelected('');
  };
  const guarded = (action: 'reset' | 'example') => {
    if (armed !== action && d.nodes.length > 1) {
      setArmed(action);
      setStatus(
        'Bấm lại cùng nút để thay bản thiết kế của đề đang mở. Xuất JSON nếu muốn giữ bản cũ.',
      );
      return;
    }
    edit(() =>
      action === 'reset'
        ? initial(p.id)
        : { design: studioExample(p.id), reads: p.reads, writes: p.writes, lost: 0 },
    );
    setSelected('');
    setCompare(false);
    setReviewOn(false);
    setStatus('Đã cập nhật bản thiết kế của đề đang mở.');
  };
  const exportFile = (format: 'json' | 'md') => {
    const text =
      format === 'json'
        ? JSON.stringify({ version: 1, promptId: p.id, ...draft }, null, 2)
        : studioMarkdown(d, draft.reads, draft.writes, draft.lost);
    const blob = new Blob([text], {
        type: format === 'json' ? 'application/json' : 'text/markdown',
      }),
      href = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = href;
    a.download = 'av-lore-design-' + p.id + '.' + format;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    setStatus('Đã xuất bản thiết kế.');
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > studioLimits.bytes) throw Error('FILE_LIMIT');
      const raw = JSON.parse(await file.text());
      const next = validDraft(raw);
      edit(() => next);
      setSelected('');
      setReviewOn(false);
      setStatus('Đã nhập vào đề đang mở; dữ liệu các đề khác được giữ nguyên.');
    } catch {
      setStatus(
        'JSON không hợp lệ hoặc vượt giới hạn 100 KB / 30 nodes / 80 edges. Bản hiện tại được giữ nguyên.',
      );
    }
  };
  const point = (e: PointerEvent<SVGElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const matrix = svg.getScreenCTM();
    return matrix ? pt.matrixTransform(matrix.inverse()) : null;
  };
  const pointerStart = (e: PointerEvent<SVGGElement>, n: StudioNode) => {
    if (e.button !== 0) return;
    const pos = point(e);
    if (!pos) return;
    drag.current = { id: n.id, pointer: e.pointerId, dx: pos.x - n.x, dy: pos.y - n.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(n.id);
  };
  const pointerMove = (e: PointerEvent<SVGGElement>) => {
    const state = drag.current;
    if (!state || state.pointer !== e.pointerId) return;
    const pos = point(e);
    if (!pos) return;
    update(state.id, {
      x: Math.round(Math.min(1100, Math.max(0, pos.x - state.dx))),
      y: Math.round(Math.min(700, Math.max(0, pos.y - state.dy))),
    });
  };
  const numeric = (
    label: string,
    value: number,
    set: (v: number) => void,
    min: number,
    max: number,
    step = 1,
  ) => (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = e.target.valueAsNumber;
          if (Number.isFinite(v) && v >= min && v <= max && (step !== 1 || Number.isInteger(v)))
            set(v);
        }}
      />
    </label>
  );
  return (
    <section
      ref={ref}
      className="handbook-experiment design-studio"
      aria-labelledby={'studio-' + uid}
    >
      <span className="eyebrow">DESIGN STUDIO / REASON ABOUT YOUR OWN GRAPH</span>
      <h3 id={'studio-' + uid}>Vẽ một request path và bảo vệ từng giả định</h3>
      <p>
        Canvas và list editor dùng chung dữ liệu. Arrow multipliers là số downstream read/write
        operations cho mỗi incoming operation; branches cộng tải tại merge. Đây là mô hình DAG minh
        họa, không simulator production hoặc hệ thống chấm điểm phỏng vấn.
      </p>
      <div className="studio-prompt">
        <label>
          Chọn đề thiết kế
          <select value={p.id} onChange={(e) => choose(e.target.value)}>
            {studioPrompts.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title.vi}
              </option>
            ))}
          </select>
        </label>
        <h4>{p.title.vi}</h4>
        <p>{p.brief.vi}</p>
        <p>
          <strong>{p.focus.vi}</strong>
        </p>
      </div>
      <div className="studio-workload">
        {numeric(
          'Aggregate reads/s',
          draft.reads,
          (v) => edit((cur) => ({ ...cur, reads: v })),
          0,
          1e9,
        )}
        {numeric(
          'Aggregate writes/s',
          draft.writes,
          (v) => edit((cur) => ({ ...cur, writes: v })),
          0,
          1e9,
        )}
        {numeric(
          'Capacity scenario: units mất ở mỗi tier',
          draft.lost,
          (v) => edit((cur) => ({ ...cur, lost: v })),
          0,
          1000,
        )}
      </div>
      <p className="worksheet-footnote">
        Units mất chỉ giảm capacity giả định ở mọi tier đồng thời; không chọn primary failover,
        failure domains hoặc dự đoán availability. Read/write ceilings độc lập, không mô phỏng
        shared CPU contention. Các capacity mặc định đều là số tùy chọn để học.
      </p>
      <div className="studio-toolbar">
        <button type="button" aria-pressed={view === 'canvas'} onClick={() => setView('canvas')}>
          Canvas
        </button>
        <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
          List editor
        </button>
        <button type="button" aria-pressed={reviewOn} onClick={() => setReviewOn((v) => !v)}>
          Review design
        </button>
        <button type="button" aria-pressed={compare} onClick={() => setCompare((v) => !v)}>
          So với example
        </button>
        <button type="button" data-armed={armed === 'example'} onClick={() => guarded('example')}>
          Load example
        </button>
        <button type="button" data-armed={armed === 'reset'} onClick={() => guarded('reset')}>
          Reset đề này
        </button>
        <button type="button" onClick={() => exportFile('json')}>
          Export JSON
        </button>
        <button type="button" onClick={() => exportFile('md')}>
          Export Markdown
        </button>
        <label className="studio-import">
          Import JSON
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        {view === 'canvas' && (
          <button
            type="button"
            className="studio-expand"
            onClick={() => {
              if (!canvas.current?.requestFullscreen) {
                setStatus(
                  'Trình duyệt chưa hỗ trợ fullscreen; vẫn có thể dùng canvas cuộn hoặc list editor.',
                );
                return;
              }
              void canvas.current
                .requestFullscreen()
                .catch(() =>
                  setStatus(
                    'Không mở được fullscreen; vẫn có thể dùng canvas cuộn hoặc list editor.',
                  ),
                );
            }}
          >
            Phóng to canvas
          </button>
        )}
      </div>
      <p className="studio-status" role="status">
        {status}
      </p>
      <div className="studio-add">
        <label>
          Loại component
          <select value={kind} onChange={(e) => setKind(e.target.value as StudioKind)}>
            {studioKinds.map((k) => (
              <option value={k} key={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={add}>
          Thêm component
        </button>
        <span>
          {d.nodes.length} / {studioLimits.nodes} nodes · {d.edges.length} / {studioLimits.edges}{' '}
          edges
        </span>
      </div>
      <div
        ref={canvas}
        className="studio-canvas-region"
        data-view={view}
        role="region"
        aria-label="Editable architecture canvas"
        tabIndex={0}
      >
        <div className="studio-fullscreen-controls">
          <span>Canvas · Esc để đóng toàn màn hình</span>
          <button
            type="button"
            onClick={() => {
              void document.exitFullscreen().catch(() => {});
            }}
          >
            Thoát toàn màn hình
          </button>
        </div>
        <svg
          viewBox="0 0 1320 820"
          role="group"
          aria-label="Select a component, drag it or move it with arrow keys"
        >
          <defs>
            <marker
              id={'arrow-' + uid}
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10 Z" />
            </marker>
            <pattern id={'grid-' + uid} width="25" height="25" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" />
            </pattern>
          </defs>
          <rect className="studio-grid" width="1320" height="820" fill={'url(#grid-' + uid + ')'} />
          {d.edges.map((e) => {
            const a = d.nodes.find((n) => n.id === e.from)!,
              b = d.nodes.find((n) => n.id === e.to)!;
            return (
              <g key={e.from + '>' + e.to} className="studio-svg-edge">
                <path
                  d={`M${a.x + 180} ${a.y + 40} C${a.x + 240} ${a.y + 40},${b.x - 60} ${b.y + 40},${b.x} ${b.y + 40}`}
                  markerEnd={'url(#arrow-' + uid + ')'}
                />
                <text
                  x={(a.x + 180 + b.x) / 2}
                  y={(a.y + b.y) / 2 + 30}
                >{`r×${e.reads} / w×${e.writes}`}</text>
              </g>
            );
          })}
          {d.nodes.map((n) => (
            <g
              className="studio-svg-node"
              key={n.id}
              transform={`translate(${n.x} ${n.y})`}
              role="button"
              tabIndex={0}
              aria-label={n.id + ' ' + n.label}
              aria-pressed={selected === n.id}
              onClick={() => setSelected(n.id)}
              onPointerDown={(e) => pointerStart(e, n)}
              onPointerMove={pointerMove}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected(n.id);
                }
                const delta: Record<string, [number, number]> = {
                  ArrowLeft: [-20, 0],
                  ArrowRight: [20, 0],
                  ArrowUp: [0, -20],
                  ArrowDown: [0, 20],
                };
                if (delta[e.key]) {
                  e.preventDefault();
                  const [x, y] = delta[e.key];
                  update(n.id, {
                    x: Math.min(1100, Math.max(0, n.x + x)),
                    y: Math.min(700, Math.max(0, n.y + y)),
                  });
                }
              }}
            >
              <title>{`${n.label} · ${n.id} · ${n.units} units`}</title>
              <rect width="180" height="80" rx="12" />
              <text x="12" y="27">
                {n.label.length > 20 ? n.label.slice(0, 19) + '…' : n.label}
              </text>
              <text
                x="12"
                y="53"
                className="studio-node-meta"
              >{`${n.kind} · ${n.units} units`}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="studio-list" data-view={view}>
        <h4>Components · chọn để chỉnh</h4>
        <ol>
          {d.nodes.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                aria-pressed={n.id === selected}
                onClick={() => setSelected(n.id)}
              >
                {n.id} · {n.label}
              </button>
              <span>
                {n.kind} · {n.units} units
              </span>
              <button type="button" aria-label={'Remove ' + n.id} onClick={() => remove(n.id)}>
                ×
              </button>
            </li>
          ))}
        </ol>
      </div>
      {node && (
        <fieldset className="studio-inspector">
          <legend>{node.id}</legend>
          <label>
            Component label
            <input
              maxLength={80}
              value={node.label}
              onChange={(e) => update(node.id, { label: e.target.value })}
            />
          </label>
          {numeric('Units', node.units, (v) => update(node.id, { units: v }), 1, 1000)}
          {numeric(
            'Assumed read capacity / unit',
            node.readCapacity,
            (v) => update(node.id, { readCapacity: v }),
            0,
            1e9,
          )}
          {numeric(
            node.kind === 'sql'
              ? 'Assumed SQL primary write capacity (total)'
              : 'Assumed write capacity / unit',
            node.writeCapacity,
            (v) => update(node.id, { writeCapacity: v }),
            0,
            1e9,
          )}
          {(node.kind === 'cache' || node.kind === 'cdn') &&
            numeric(
              'Read hit ratio',
              node.hitRatio,
              (v) => update(node.id, { hitRatio: v }),
              0,
              1,
              0.05,
            )}
          {numeric('Canvas X', node.x, (v) => update(node.id, { x: v }), 0, 1100)}
          {numeric('Canvas Y', node.y, (v) => update(node.id, { y: v }), 0, 700)}
          <button type="button" onClick={() => remove(node.id)}>
            Xóa component đang chọn
          </button>
        </fieldset>
      )}
      <fieldset className="studio-connect">
        <legend>Nối operation path</legend>
        <label>
          From
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">—</option>
            {d.nodes.map((n) => (
              <option value={n.id} key={n.id}>
                {n.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          To
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">—</option>
            {d.nodes
              .filter((n) => n.id !== selected && n.kind !== 'client')
              .map((n) => (
                <option value={n.id} key={n.id}>
                  {n.id}
                </option>
              ))}
          </select>
        </label>
        {numeric('Read multiplier', readFactor, setReadFactor, 0, 1000, 0.1)}
        {numeric('Write multiplier', writeFactor, setWriteFactor, 0, 1000, 0.1)}
        <button
          type="button"
          disabled={
            !selected ||
            !target ||
            selected === target ||
            !d.nodes.some((n) => n.id === selected) ||
            !d.nodes.some((n) => n.id === target && n.kind !== 'client') ||
            (d.edges.length >= studioLimits.edges &&
              !d.edges.some((e) => e.from === selected && e.to === target))
          }
          onClick={() =>
            mutate((cur) =>
              connectStudio(cur, {
                from: selected,
                to: target,
                reads: readFactor,
                writes: writeFactor,
              }),
            )
          }
        >
          Thêm / cập nhật edge
        </button>
      </fieldset>
      <ol className="studio-edge-list" aria-label="Operation edges">
        {d.edges.map((e) => (
          <li key={e.from + '>' + e.to}>
            <code>
              {e.from} → {e.to} · r×{e.reads} / w×{e.writes}
            </code>
            <button
              type="button"
              onClick={() => {
                setSelected(e.from);
                setTarget(e.to);
                setReadFactor(e.reads);
                setWriteFactor(e.writes);
              }}
            >
              Chỉnh edge
            </button>
            <button
              type="button"
              aria-label={'Remove edge ' + e.from + ' ' + e.to}
              onClick={() =>
                mutate((cur) => ({
                  ...cur,
                  edges: cur.edges.filter((x) => x.from !== e.from || x.to !== e.to),
                }))
              }
            >
              ×
            </button>
          </li>
        ))}
      </ol>
      {compare && (
        <aside className="studio-comparison">
          <h4>Example là một starting point để phản biện</h4>
          <p>
            Example dùng các node/edges công khai, capacity giả định và simplified operation paths.
            Nó không phải đáp án chuẩn hoặc proof của invariants. Bấm Load example chỉ khi muốn thay
            bản đang mở.
          </p>
          <ul>
            {studioExample(p.id).nodes.map((n) => (
              <li key={n.id}>
                {n.id} · {n.units} units
              </li>
            ))}
          </ul>
          <ol>
            {studioExample(p.id).edges.map((e) => (
              <li key={e.from + e.to}>
                {e.from} → {e.to} · r×{e.reads} / w×{e.writes}
              </li>
            ))}
          </ol>
        </aside>
      )}
      {reviewOn && (
        <div className="studio-review">
          <h4>Review theo giả định đã khai báo</h4>
          <p className="studio-model-state">
            {report.state} · LATENCY {report.latency} · AVAILABILITY {report.availability} ·
            CORRECTNESS {report.correctness}
          </p>
          <div
            role="region"
            aria-label="Modeled operation rates and independent capacity ceilings"
            tabIndex={0}
            className="studio-table"
          >
            <table>
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Reads/s</th>
                  <th>Writes/s</th>
                  <th>Read cap</th>
                  <th>Write cap</th>
                  <th>Max ratio</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">{r.id}</th>
                    <td>{report.state === 'STRUCTURE_ONLY_CYCLE' ? 'N/A' : Math.round(r.reads)}</td>
                    <td>
                      {report.state === 'STRUCTURE_ONLY_CYCLE' ? 'N/A' : Math.round(r.writes)}
                    </td>
                    <td>{r.readCapacity}</td>
                    <td>{r.writeCapacity}</td>
                    <td>
                      {r.utilization === null
                        ? 'N/A'
                        : Number.isFinite(r.utilization)
                          ? Math.round(r.utilization * 100) + '%'
                          : '∞'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ol className="studio-findings">
            {report.findings.map((f, i) => (
              <li key={f.code + f.nodes.join() + i}>
                <strong>{findings[f.code]?.title || f.code}</strong>
                <code>
                  {f.code} · {f.nodes.join(', ')}
                </code>
                <p>{findings[f.code]?.detail}</p>
              </li>
            ))}
          </ol>
          {!report.findings.length && (
            <p>
              Chưa thấy structural/capacity warning trong phạm vi fixture. Vẫn cần kiểm correctness,
              failure semantics, security, storage, bandwidth và SLO bằng evidence riêng.
            </p>
          )}
        </div>
      )}
      <label className="studio-notes">
        Requirements, invariants, trade-offs và failure walkthrough
        <textarea
          maxLength={12000}
          rows={8}
          value={d.notes}
          onChange={(e) => mutate((cur) => ({ ...cur, notes: e.target.value }))}
        />
      </label>
    </section>
  );
}
