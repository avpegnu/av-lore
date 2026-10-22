import { useId, useState } from 'react';
import { useIslandReady } from '../lib/use-island-ready';
import { scoreReplay, shardedBoard, type RankPolicy } from '../lib/leaderboard-models';
export default function LeaderboardPlayground({ kind }: { kind: 'board-replay' | 'board-shards' }) {
  const ref = useIslandReady(),
    id = 'board-' + useId().replace(/:/g, '');
  const [steps, setSteps] = useState(2),
    [guarded, setGuarded] = useState(true),
    [policy, setPolicy] = useState<RankPolicy>('ordinal'),
    [player, setPlayer] = useState('B'),
    [shards, setShards] = useState(3),
    [k, setK] = useState(3),
    [target, setTarget] = useState('P07'),
    [missing, setMissing] = useState(false);
  const replay = scoreReplay(steps, guarded, policy),
    selected = replay.rows.find((p) => p.id === player)!,
    around = replay.rows.slice(
      Math.max(0, selected.ordinal - 2),
      Math.min(replay.rows.length, selected.ordinal + 1),
    ),
    distributed = shardedBoard(shards, k, target, missing ? 0 : -1);
  return (
    <section className="handbook-experiment" ref={ref} aria-labelledby={id}>
      <span className="eyebrow">LEADERBOARD / REPLAY, TIES AND SHARDS</span>
      {kind === 'board-replay' ? (
        <>
          <h3 id={id}>Một score event bị phát lại làm rank đổi thế nào?</h3>
          <p>
            Server source cung cấp absolute total và version tăng theo player trong season. Stream
            có duplicate, stale version và delayed retry. Guard chỉ apply version mới hơn; tắt guard
            để cộng delta mỗi delivery. Đây là fixed replay trong memory, không gọi Redis thật.
          </p>
          <div className="worksheet-inputs">
            <label>
              Score deliveries replayed<output>{steps}</output>
              <input
                type="range"
                min="0"
                max="6"
                value={steps}
                onChange={(e) => setSteps(+e.target.value)}
              />
            </label>
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={guarded}
              onChange={(e) => setGuarded(e.target.checked)}
            />
            Apply absolute score bằng monotonic source version
          </label>
          <div className="worksheet-choices">
            {(['ordinal', 'competition', 'dense'] as const).map((p) => (
              <button
                type="button"
                className="secondary"
                key={p}
                aria-pressed={policy === p}
                onClick={() => setPolicy(p)}
              >
                {p === 'ordinal'
                  ? 'Ordinal 1,2,3'
                  : p === 'competition'
                    ? 'Competition 1,2,2,4'
                    : 'Dense 1,2,2,3'}
              </button>
            ))}
          </div>
          <p>
            Ties dùng descending ASCII member để khớp Redis REV trong fixture. Ordinal là vị trí
            unique; competition/dense là product rank khác. Tất cả read trong demo dùng một frozen
            replay state, không trộn hai thời điểm.
          </p>
          <ol className="board-rows">
            {replay.rows.map((p) => (
              <li key={p.id} data-selected={p.id === player}>
                <span>#{p.rank}</span>
                <strong>
                  {p.id}
                  {p.id === player ? ' ← you' : ''}
                </strong>
                <span>{p.score} pts</span>
                <div className="board-bar" style={{ width: `${p.score / 2}%` }} />
              </li>
            ))}
          </ol>
          <div className="worksheet-choices">
            {replay.rows.map((p) => (
              <button
                type="button"
                className="secondary"
                key={p.id}
                aria-pressed={player === p.id}
                onClick={() => setPlayer(p.id)}
              >
                Player {p.id}
              </button>
            ))}
          </div>
          <p>
            Around selected / ordinal positions:{' '}
            {around.map((p) => `${p.id} (${p.score})`).join(' · ')}
          </p>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Projected C score</dt>
              <dd>{replay.projectedC}</dd>
            </div>
            <div>
              <dt>Source C score</dt>
              <dd>{replay.sourceC}</dd>
            </div>
            <div>
              <dt>Duplicate/stale deliveries ignored</dt>
              <dd>{replay.skipped}</dd>
            </div>
            <div>
              <dt>Selected product rank</dt>
              <dd>{selected.rank}</dd>
            </div>
          </dl>
          <details>
            <summary>Delivery and projection decisions</summary>
            <ol>
              {replay.frames.map((e, i) => (
                <li key={i}>
                  {e.id} / v{e.version} / total {e.total} / delta {e.delta} /{' '}
                  {e.skipped ? 'Ignored stale/duplicate' : 'Applied'}
                </li>
              ))}
            </ol>
          </details>
          <p>
            Absolute update chỉ an toàn nếu aggregate source đúng, version per player/season
            monotonic và version-check + score-write atomic. Cộng delta có thể dùng protocol dedup
            khác; demo không nói mọi incremental design đều sai.
          </p>
        </>
      ) : (
        <>
          <h3 id={id}>Global rank cần những gì từ mỗi shard?</h3>
          <p>
            24 player thuộc cùng frozen snapshot; order là score giảm rồi ASCII ID giảm. Hash
            partition phân member theo fixture index. Mỗi shard trả local top-K và count những tuple
            đứng trước target, gồm cả score tie. Không mô phỏng network hoặc distributed snapshot
            protocol.
          </p>
          <div className="worksheet-inputs">
            <label>
              Hash shards<output>{shards}</output>
              <input
                type="range"
                min="2"
                max="5"
                value={shards}
                onChange={(e) => setShards(+e.target.value)}
              />
            </label>
            <label>
              Top-K requested<output>{k}</output>
              <input
                type="range"
                min="1"
                max="6"
                value={k}
                onChange={(e) => setK(+e.target.value)}
              />
            </label>
          </div>
          <div className="worksheet-choices">
            {['P01', 'P07', 'P20'].map((p) => (
              <button
                type="button"
                className="secondary"
                key={p}
                aria-pressed={target === p}
                onClick={() => setTarget(p)}
              >
                Target {p}
              </button>
            ))}
          </div>
          <label className="worksheet-toggle">
            <input
              type="checkbox"
              checked={missing}
              onChange={(e) => setMissing(e.target.checked)}
            />
            Shard 0 không trả lời
          </label>
          <div className="board-shards">
            {distributed.sets.map((s) => (
              <section key={s.index}>
                <h4>Shard {s.index}</h4>
                <p>{s.available ? 'Available' : 'Unavailable / incomplete'}</p>
                <p>
                  {s.players.length} members / {s.available ? s.ahead : '?'} ahead
                </p>
                <ol>
                  {s.available ? (
                    s.top.map((p) => (
                      <li key={p.id}>
                        {p.id} / {p.score}
                      </li>
                    ))
                  ) : (
                    <li>—</li>
                  )}
                </ol>
              </section>
            ))}
          </div>
          <h4>
            {distributed.partial
              ? 'Partial top-K / no completeness guarantee'
              : 'Merged global top-K / frozen snapshot'}
          </h4>
          <ol>
            {distributed.top.map((p) => (
              <li key={p.id}>
                {p.id} / {p.score}
              </li>
            ))}
          </ol>
          <dl className="worksheet-results" aria-live="polite">
            <div>
              <dt>Candidate tuples returned</dt>
              <dd>{distributed.candidateCount}</dd>
            </div>
            <div>
              <dt>{distributed.partial ? 'Partial rank / lower bound' : 'Global ordinal rank'}</dt>
              <dd>{distributed.rank}</dd>
            </div>
            <div>
              <dt>True rank / full fixture</dt>
              <dd>{distributed.actual}</dd>
            </div>
            <div>
              <dt>Histogram rank interval / full fixture</dt>
              <dd>{distributed.interval.join('–')}</dd>
            </div>
          </dl>
          <p>
            Histogram dùng buckets rộng 25 points của full frozen fixture, cho một khoảng rank thay
            vì exact rank; nó là nguồn khác với partial shard replies. Global top-K proof cần mọi
            shard, cùng ordering/filter và consistent cut. Target tuple có sẵn trong fixture;
            production còn phải đọc tuple đúng version trước khi count.
          </p>
        </>
      )}
    </section>
  );
}
