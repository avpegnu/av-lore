import { useState } from 'react';
import {
  newIdentifierFixture,
  moveIdentifierClock,
  issueIdentifierBatch,
} from '../lib/identifier-issuer';
export default function IdentifierIssuer({
  workerBits,
  sequenceBits,
}: {
  workerBits: number;
  sequenceBits: number;
}) {
  const [state, setState] = useState(newIdentifierFixture);
  const issue = (count: bigint) =>
    setState((previous) => issueIdentifierBatch(previous, workerBits, sequenceBits, count));
  return (
    <div className="identifier-issuer">
      <h4>Thử phát ID: clock và sequence thay đổi thế nào?</h4>
      <p>
        Clock mô hình đứng yên cho tới khi bạn bấm đổi thời gian; worker luôn là 7. Burst yêu cầu
        nhiều hơn capacity một ID và có thể nhận một phần. Reset hoặc đổi layout bắt đầu thí nghiệm
        độc lập, không mô phỏng restart an toàn của production.
      </p>
      <div className="worksheet-choices">
        <button
          type="button"
          className="secondary"
          data-id-action="issue"
          onClick={() => issue(1n)}
        >
          Phát một ID
        </button>
        <button
          type="button"
          className="secondary"
          data-id-action="burst"
          onClick={() => issue((1n << BigInt(sequenceBits)) + 1n)}
        >
          Burst vượt sequence
        </button>
        <button
          type="button"
          className="secondary"
          data-id-action="back"
          onClick={() => setState((previous) => moveIdentifierClock(previous, 'back'))}
        >
          Clock −50 ms
        </button>
        <button
          type="button"
          className="secondary"
          data-id-action="tick"
          onClick={() => setState((previous) => moveIdentifierClock(previous, 'tick'))}
        >
          Clock +1 ms
        </button>
        <button
          type="button"
          className="secondary"
          data-id-action="recover"
          onClick={() => setState((previous) => moveIdentifierClock(previous, 'recover'))}
        >
          Vượt high watermark
        </button>
        <button
          type="button"
          className="secondary"
          data-id-action="reset"
          onClick={() => setState(newIdentifierFixture())}
        >
          Reset thí nghiệm ID
        </button>
      </div>
      <dl className="worksheet-results" aria-live="polite">
        <div>
          <dt>Model clock / ms</dt>
          <dd>{state.clock.toString()}</dd>
        </div>
        <div>
          <dt>Last issued time / ms</dt>
          <dd>{state.lastTime === null ? '∅' : state.lastTime.toString()}</dd>
        </div>
        <div>
          <dt>Last sequence</dt>
          <dd>{state.lastSequence < 0n ? '∅' : state.lastSequence.toString()}</dd>
        </div>
        <div>
          <dt>Accepted / rejected in last batch</dt>
          <dd>
            {state.accepted.toString()} / {state.rejected.toString()}
          </dd>
        </div>
        <div>
          <dt>Total IDs issued</dt>
          <dd>{state.issued.toString()}</dd>
        </div>
      </dl>
      <p className="worksheet-verdict" role="status">
        {state.error === 'clock-rollback'
          ? 'Từ chối phát: clock đang lùi so với timestamp đã dùng. High watermark và sequence được giữ nguyên.'
          : state.error === 'sequence-exhausted'
            ? 'Sequence đã hết trong millisecond này. Phần vượt capacity bị từ chối; không wrap về 0. Tiến clock rồi thử tiếp.'
            : state.lastTime !== null && state.clock < state.lastTime
              ? 'Clock đã lùi; thử phát ID để thấy kiểm tra safety.'
              : 'Clock hợp lệ theo state hiện tại. Thử phát nhiều ID cùng millisecond, rồi đổi thời gian.'}
      </p>
      <p>
        Mẫu ID gần nhất, tối đa 6; burst chỉ giữ 3 mẫu cuối của batch. ID được tính bằng BigInt và
        hiển thị dạng decimal string.
      </p>
      <ol className="identifier-samples">
        {state.samples.map((sample) => (
          <li key={sample.value.toString()}>
            <code>{sample.value.toString()}</code>
            <span>
              t={sample.time.toString()} · w=7 · s={sample.sequence.toString()}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
