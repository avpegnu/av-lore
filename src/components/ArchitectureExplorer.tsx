import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { architectureRoute, architecturePath } from '../lib/architecture-routing';
import { useIslandReady } from '../lib/use-island-ready';
import type { Architecture } from '../lib/handbook';

export default function ArchitectureExplorer({ diagram }: { diagram: Architecture }) {
  const ref = useIslandReady();
  const canvas = useRef<HTMLDivElement>(null);
  const uid = 'arch-' + useId().replace(/:/g, '');
  const [traceIndex, setTraceIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(diagram.nodes[0].id);
  const trace = diagram.traces[traceIndex];
  const node = diagram.nodes.find((item) => item.id === selected)!;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () =>
        setStep((previous) => {
          if (previous >= trace.steps.length - 1) {
            setPlaying(false);
            return previous;
          }
          return previous + 1;
        }),
      1500,
    );
    return () => clearInterval(timer);
  }, [playing, trace.steps.length]);
  const edges = [
    ...new Map(
      diagram.traces
        .flatMap((route) => route.steps)
        .map((edge) => [edge.from + ':' + edge.to, edge]),
    ).values(),
  ];
  const current = trace.steps[step];
  const activeEdges = new Set(
    trace.steps.slice(0, step + 1).map((edge) => edge.from + ':' + edge.to),
  );
  const activeNodes = new Set(
    trace.steps.slice(0, step + 1).flatMap((edge) => [edge.from, edge.to]),
  );
  const paths = useMemo(() => new Map(diagram.traces.flatMap(route => route.steps).map(edge =>
    [edge.from+':'+edge.to,architecturePath(architectureRoute(diagram.nodes,edge.from,edge.to))])),[diagram]);
  return (
    <section className="architecture-explorer" ref={ref} aria-labelledby={uid + '-title'}>
      <header className="architecture-heading">
        <span className="eyebrow">ARCHITECTURE / REQUEST TRACE</span>
        <h3 id={uid + '-title'}>{diagram.title.vi}</h3>
      </header>
      <div className="architecture-tabs" role="tablist" aria-label="Chọn luồng xử lý">
        {diagram.traces.map((route, i) => (
          <button
            key={route.id}
            id={uid + '-tab-' + i}
            type="button"
            role="tab"
            aria-selected={i === traceIndex}
            aria-controls={uid + '-panel'}
            tabIndex={i === traceIndex ? 0 : -1}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? diagram.traces.length - 1
                    : (i + (event.key === 'ArrowRight' ? 1 : -1) + diagram.traces.length) %
                      diagram.traces.length;
              setTraceIndex(next);
              setStep(0);
              setPlaying(false);
              document.getElementById(uid + '-tab-' + next)?.focus();
            }}
            onClick={() => {
              setTraceIndex(i);
              setStep(0);
              setPlaying(false);
            }}
          >
            {route.label.vi}
          </button>
        ))}
      </div>
      <div id={uid + '-panel'} role="tabpanel" aria-labelledby={uid + '-tab-' + traceIndex}>
        <div
          ref={canvas}
          className="architecture-canvas"
          role="region"
          aria-label="Sơ đồ tương tác; chọn một component để xem chi tiết"
          tabIndex={0}
        >
          <svg
            viewBox={`0 0 ${diagram.width} ${diagram.height}`}
            style={{ minWidth: Math.min(960, diagram.width) }}
            aria-labelledby={uid + '-title'}
          >
            <defs>
              <marker
                id={uid + '-arrow'}
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0 0L8 4L0 8" fill="context-stroke" />
              </marker>
            </defs>
            {edges.map((edge, index) => {
              const active = activeEdges.has(edge.from + ':' + edge.to);
              const belongs = trace.steps.some(step => step.from===edge.from && step.to===edge.to);
              const traceEdge = trace.steps.find(step => step.from===edge.from && step.to===edge.to) || edge;
              const focused = edge.from === current.from && edge.to === current.to;
              return (
                <g
                  key={edge.from + ':' + edge.to}
                  className={[
                    'architecture-edge',
                    active ? 'is-active' : '',
                    focused ? 'is-current' : '',
                    belongs ? '' : 'is-other',
                  ].join(' ')}
                >
                  <path
                    id={uid + '-edge-' + index}
                    d={paths.get(edge.from+':'+edge.to)}
                    fill="none"
                    strokeDasharray={traceEdge.async ? '5 6' : undefined}
                    markerEnd={`url(#${uid}-arrow)`}
                  />
                  {focused && playing && (
                    <circle className="architecture-packet" r="4">
                      <animateMotion dur="1.2s" repeatCount="indefinite">
                        <mpath href={'#' + uid + '-edge-' + index} />
                      </animateMotion>
                    </circle>
                  )}
                </g>
              );
            })}
            {diagram.nodes.map((item) => (
              <g
                key={item.id}
                className={[
                  'architecture-node',
                  activeNodes.has(item.id) ? 'is-active' : '',
                  selected === item.id ? 'is-selected' : '',
                ].join(' ')}
                transform={`translate(${item.x - 88},${item.y - 32})`}
                role="button"
                tabIndex={0}
                aria-label={item.label.vi}
                aria-pressed={selected === item.id}
                onClick={() => setSelected(item.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelected(item.id);
                  }
                }}
              >
                <rect width="176" height="64" rx="12" />
                <foreignObject x="12" y="9" width="152" height="48">
                  <div className="architecture-node-label">
                    <strong>{item.label.vi}</strong>
                    <span>{item.kind.toUpperCase()}</span>
                  </div>
                </foreignObject>
              </g>
            ))}
          </svg>
        </div>
        <div className="architecture-controls">
          <button
            type="button"
            onClick={() => {
              if (playing) setPlaying(false);
              else {
                if (step === trace.steps.length - 1) setStep(0);
                setPlaying(true);
              }
            }}
          >
            {playing ? 'Tạm dừng' : 'Chạy luồng'}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={step >= trace.steps.length - 1}
            onClick={() => {
              setPlaying(false);
              setStep(step + 1);
            }}
          >
            Bước tiếp →
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setPlaying(false);
              setStep(0);
            }}
          >
            ↺ Chạy lại
          </button>
          <span className="muted">
            {step + 1} / {trace.steps.length}
          </span>
          <button type="button" className="secondary" onClick={() => {
            canvas.current?.requestFullscreen?.().catch(() => {});
          }}>Toàn màn hình</button>
        </div>
        <ol className="architecture-steps">
          {trace.steps.map((item, i) => (
            <li key={i}>
              <button
                type="button"
                aria-current={i === step ? 'step' : undefined}
                onClick={() => {
                  setStep(i);
                  setPlaying(false);
                }}
              >
                <span>{i + 1}</span>
                {item.description.vi}
              </button>
            </li>
          ))}
        </ol>
        <aside className="architecture-detail" aria-live="polite">
          <span className="eyebrow">COMPONENT / {node.kind.toUpperCase()}</span>
          <strong>{node.label.vi}</strong>
          <p>{node.detail.vi}</p>
        </aside>
      </div>
      <p className="architecture-caption">{diagram.caption.vi}</p>
    </section>
  );
}
