export const chatDevices = ['phone', 'desktop'] as const;
export type ChatDevice = (typeof chatDevices)[number];
export interface DeviceReplica {
  online: boolean;
  cursor: number;
  delivered: number;
  read: number;
  buffer: number[];
}
export interface ChatDeviceState {
  committed: number;
  devices: Record<ChatDevice, DeviceReplica>;
}
export type ChatDeviceAction =
  | { type: 'commit'; count: 1 | 2 }
  | { type: 'deliver'; device: ChatDevice; seq: number }
  | { type: 'toggle' | 'sync' | 'read'; device: ChatDevice }
  | { type: 'reset' };

export function initialChatDevices(): ChatDeviceState {
  return {
    committed: 2,
    devices: {
      phone: { online: true, cursor: 2, delivered: 2, read: 1, buffer: [] },
      desktop: { online: false, cursor: 1, delivered: 1, read: 1, buffer: [] },
    },
  };
}

/** Single-conversation fixture: local apply and its delivered receipt complete together. */
export function chatDeviceReducer(
  state: ChatDeviceState,
  action: ChatDeviceAction,
): ChatDeviceState {
  if (action.type === 'reset') return initialChatDevices();
  if (action.type === 'commit') {
    if (![1, 2].includes(action.count)) throw new RangeError('Invalid message batch');
    return state.committed + action.count <= 20
      ? { ...state, committed: state.committed + action.count }
      : state;
  }
  if (!chatDevices.includes(action.device)) throw new RangeError('Invalid device');
  const device = state.devices[action.device];
  let next = device;
  if (action.type === 'toggle') next = { ...device, online: !device.online };
  else if (action.type === 'deliver') {
    if (!Number.isInteger(action.seq) || action.seq < 1 || action.seq > state.committed)
      throw new RangeError('Frame is outside committed history');
    if (!device.online || action.seq <= device.cursor || device.buffer.includes(action.seq))
      return state;
    const buffered = new Set([...device.buffer, action.seq]);
    let cursor = device.cursor;
    while (buffered.delete(cursor + 1)) cursor++;
    next = {
      ...device,
      cursor,
      delivered: cursor,
      buffer: [...buffered].sort((a, b) => a - b),
    };
  } else if (action.type === 'sync' && device.online) {
    next = { ...device, cursor: state.committed, delivered: state.committed, buffer: [] };
  } else if (action.type === 'read' && device.online) {
    next = { ...device, read: Math.max(device.read, device.cursor) };
  }
  return next === device
    ? state
    : { ...state, devices: { ...state.devices, [action.device]: next } };
}

export function chatReadMarker(state: ChatDeviceState) {
  return Math.max(...chatDevices.map((id) => state.devices[id].read));
}

export function chatMessageStatus(state: ChatDeviceState, seq: number) {
  if (!Number.isInteger(seq) || seq < 1 || seq > state.committed)
    throw new RangeError('Unknown committed message');
  if (chatReadMarker(state) >= seq) return 'read';
  return chatDevices.some((id) => state.devices[id].delivered >= seq) ? 'delivered' : 'accepted';
}
