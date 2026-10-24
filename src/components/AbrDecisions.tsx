import type { abrReplay } from '../lib/video-models';
import '../styles/abr-decisions.css';

export default function AbrDecisions({ runs }: { runs: ReturnType<typeof abrReplay>[] }) {
  const maximum = Math.max(
      1,
      ...runs.flatMap((run) => run.rows.flatMap((r) => [r.available, r.selected])),
    ),
    y = (value: number) => 225 - (value / maximum) * 185;
  const points = (key: 'available' | 'selected', run: ReturnType<typeof abrReplay>) =>
    run.rows.map((r, i) => `${65 + i * 60},${y(r[key])}`).join(' ');
  return (
    <>
      <p>
        Profile gán throughput cho từng chỉ số segment, giữ hằng trong lúc tải segment đó; không
        phải một trace network theo wall time. Hai rule có download time khác nhau nên không đi qua
        cùng lịch mạng thực. Chart so sánh quyết định trong fixture, không dự báo player nào tốt hơn
        trên production.
      </p>
      <div
        className="routing-chart video-decision-chart"
        role="region"
        tabIndex={0}
        aria-label="Network và bitrate được chọn theo segment"
      >
        <svg viewBox="0 0 760 285" role="img" aria-label="So sánh throughput và hai quyết định ABR">
          <title>Network and selected bitrate / Mbps; x = segment index</title>
          {[0, maximum / 2, maximum].map((value) => (
            <g key={value}>
              <line x1={55} x2={740} y1={y(value)} y2={y(value)} />
              <text x={8} y={y(value) + 4}>
                {value.toFixed(1)}
              </text>
            </g>
          ))}
          <polyline data-series="network" points={points('available', runs[0])} />
          {runs.map((run, i) => (
            <g key={i}>
              <polyline data-series={i ? 'buffer' : 'greedy'} points={points('selected', run)} />
              {run.rows
                .filter((r) => r.stall > 0)
                .map((r) => (
                  <circle
                    key={r.index}
                    data-stall-rule={i}
                    cx={65 + (r.index - 1) * 60}
                    cy={245 + i * 13}
                    r={4}
                  >
                    <title>{`${i ? 'buffer' : 'greedy'} / segment ${r.index}: ${r.stall.toFixed(2)}s rebuffer`}</title>
                  </circle>
                ))}
            </g>
          ))}
          {runs[0].rows.map((r) => (
            <text key={r.index} x={65 + (r.index - 1) * 60} y={280} textAnchor="middle">
              {r.index}
            </text>
          ))}
        </svg>
      </div>
      <p className="video-decision-legend">
        <span>Dotted: network</span>
        <span>Solid: greedy</span>
        <span>Dashed: buffer rule</span>
      </p>
      <p>
        Chấm ở hai hàng dưới biểu diễn segment có rebuffer: hàng trên là greedy, hàng dưới là buffer
        rule. Startup của segment đầu được tách riêng. Xem bảng segment để đọc estimate, download và
        buffer chi tiết.
      </p>
    </>
  );
}
