import '../styles/chat-devices.css';
import { useReducer } from 'react';
import {
  chatDevices,
  chatDeviceReducer,
  initialChatDevices,
  chatMessageStatus,
  chatReadMarker,
} from '../lib/chat-devices';

export default function ChatDevices() {
  const [state, dispatch] = useReducer(chatDeviceReducer, undefined, initialChatDevices);
  const pair = () => {
    dispatch({ type: 'commit', count: 2 });
    for (const device of chatDevices)
      if (state.devices[device].online)
        dispatch({ type: 'deliver', device, seq: state.committed + 2 });
  };
  return (
    <div className="chat-devices">
      <h4>Một account, hai device, ba mốc khác nhau</h4>
      <p>
        Fixture có một conversation với committed seq liên tiếp, tối đa 20 message. Accepted là
        server đã commit; delivered là device đã apply/persist và receipt được server ghi nhận ngay
        trong mô hình; read là thao tác đọc riêng. Không mô phỏng mạng, receipt bị mất hoặc latency
        thật.
      </p>
      <div className="worksheet-choices">
        <button
          type="button"
          className="secondary"
          data-chat-commit
          disabled={state.committed >= 20}
          onClick={() => dispatch({ type: 'commit', count: 1 })}
        >
          Commit một message
        </button>
        <button
          type="button"
          className="secondary"
          data-chat-pair
          disabled={state.committed > 18}
          onClick={pair}
        >
          Commit hai message, giao message sau trước
        </button>
        <button
          type="button"
          className="secondary"
          data-chat-reset
          onClick={() => dispatch({ type: 'reset' })}
        >
          Đặt lại device
        </button>
      </div>
      <dl className="worksheet-results" aria-live="polite">
        <div>
          <dt>Committed history</dt>
          <dd data-chat-committed>{state.committed}</dd>
        </div>
        <div>
          <dt>Account read / any device</dt>
          <dd data-chat-read>{chatReadMarker(state)}</dd>
        </div>
      </dl>
      <div className="chat-device-grid">
        {chatDevices.map((id) => {
          const device = state.devices[id],
            missing = device.cursor < state.committed ? device.cursor + 1 : null;
          return (
            <section key={id} data-chat-device={id} data-online={device.online}>
              <div className="chat-device-header">
                <h5>{id}</h5>
                <button
                  type="button"
                  className="secondary"
                  data-chat-toggle
                  aria-pressed={device.online}
                  onClick={() => dispatch({ type: 'toggle', device: id })}
                >
                  {device.online ? 'Online' : 'Offline'}
                </button>
              </div>
              <dl>
                <div>
                  <dt>Applied cursor</dt>
                  <dd data-chat-cursor>{device.cursor}</dd>
                </div>
                <div>
                  <dt>Delivered cursor</dt>
                  <dd data-chat-delivered>{device.delivered}</dd>
                </div>
                <div>
                  <dt>Device read</dt>
                  <dd data-chat-device-read>{device.read}</dd>
                </div>
                <div>
                  <dt>Buffered seq</dt>
                  <dd data-chat-buffer>{device.buffer.join(', ') || '—'}</dd>
                </div>
              </dl>
              <p className="chat-message-chips" aria-label="History đã apply trên device">
                {Array.from({ length: device.cursor }, (_, i) => (
                  <code key={i}>#{i + 1}</code>
                ))}
              </p>
              <div className="worksheet-choices">
                <button
                  type="button"
                  className="secondary"
                  data-chat-deliver
                  disabled={!device.online || missing === null}
                  onClick={() =>
                    missing !== null && dispatch({ type: 'deliver', device: id, seq: missing })
                  }
                >
                  Giao seq còn thiếu tiếp theo
                </button>
                <button
                  type="button"
                  className="secondary"
                  data-chat-duplicate
                  disabled={!device.online}
                  onClick={() =>
                    dispatch({
                      type: 'deliver',
                      device: id,
                      seq: device.buffer.at(-1) ?? device.cursor,
                    })
                  }
                >
                  Giao lại frame đã nhận
                </button>
                <button
                  type="button"
                  className="secondary"
                  data-chat-sync
                  disabled={!device.online}
                  onClick={() => dispatch({ type: 'sync', device: id })}
                >
                  Sync history tới hiện tại
                </button>
                <button
                  type="button"
                  className="secondary"
                  data-chat-open
                  disabled={!device.online}
                  onClick={() => dispatch({ type: 'read', device: id })}
                >
                  Mở chat và đánh dấu đã đọc
                </button>
              </div>
            </section>
          );
        })}
      </div>
      <div
        className="chat-status-history"
        role="region"
        tabIndex={0}
        aria-label="Trạng thái message theo receipt"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Seq</th>
              <th scope="col">Status / any device</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: state.committed }, (_, i) => (
              <tr key={i} data-chat-message={i + 1}>
                <th scope="row">#{i + 1}</th>
                <td>
                  <span data-chat-status={chatMessageStatus(state, i + 1)}>
                    {chatMessageStatus(state, i + 1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="worksheet-verdict" role="status">
        Account read có thể cao hơn cursor của desktop. Bật Online chỉ dựng lại connection; bấm Sync
        mới tải history. Read marker không cấp quyền bỏ qua phần desktop chưa có.
      </p>
      <p>
        Thử commit hai message rồi mở chat trên phone: message sau còn buffer nên read chỉ tới
        contiguous cursor. Giao seq thiếu để lấp gap, đọc trên phone, sau đó đưa desktop online và
        sync; quan sát read không tự có nghĩa mọi device đã tải dữ liệu.
      </p>
    </div>
  );
}
