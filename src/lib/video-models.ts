export const videoLadder = [0.4, 0.8, 1.5, 3, 6];
export const videoProfiles = {
  steady: Array(12).fill(1) as number[],
  drop: [1.4, 1.4, 1.4, 1.4, 0.16, 0.16, 0.33, 0.33, 0.66, 0.66, 1.7, 1.7],
  recovery: [0.4, 0.4, 0.5, 0.6, 0.8, 1, 1.2, 1.4, 1.7, 1.7, 1.7, 1.7],
};
export function abrReplay(
  baselineMbps: number,
  segmentSeconds: number,
  profile: keyof typeof videoProfiles,
  rule: 'greedy' | 'buffer',
) {
  if (
    !Number.isFinite(baselineMbps) ||
    baselineMbps <= 0 ||
    !Number.isFinite(segmentSeconds) ||
    segmentSeconds <= 0
  )
    throw new RangeError('Invalid playback inputs');
  let estimate = baselineMbps,
    buffer = 0,
    startup = 0,
    stalls = 0,
    totalDownload = 0;
  const rows = videoProfiles[profile].map((factor, index) => {
    const available = baselineMbps * factor,
      budget = estimate * (rule === 'greedy' ? 1 : buffer < 8 ? 0.45 : 0.7),
      selected = videoLadder.filter((b) => b <= budget).at(-1) ?? videoLadder[0],
      download = (segmentSeconds * selected) / available;
    const stall = index ? Math.max(0, download - buffer) : 0;
    if (!index) startup = download;
    stalls += stall;
    totalDownload += download;
    buffer = Math.max(0, buffer - download) + segmentSeconds;
    const before = estimate;
    estimate = 0.7 * estimate + 0.3 * available;
    return { index: index + 1, available, selected, download, stall, buffer, estimate: before };
  });
  return {
    rows,
    startup,
    stalls,
    totalDownload,
    buffer,
    averageMbps: rows.reduce((s, r) => s + r.selected, 0) / rows.length,
    mediaSeconds: rows.length * segmentSeconds,
  };
}
export function transcodeState(
  time: number,
  failHigh: boolean,
  progressive: boolean,
  gateApproved: boolean,
) {
  if (!Number.isFinite(time) || time < 0) throw new RangeError('Invalid DAG clock');
  const highAt = failHigh ? 20 : 12;
  const tasks = [
    { id: 'probe', readyAt: 1 },
    { id: 'low', readyAt: 5 },
    { id: 'mid', readyAt: 8 },
    { id: 'high', readyAt: highAt },
  ].map((t) => ({
    ...t,
    state:
      time >= t.readyAt
        ? 'ready'
        : t.id !== 'probe' && time < 1
          ? 'blocked'
          : t.id === 'high' && failHigh && time >= 12
            ? 'retrying'
            : 'running',
  }));
  const renditions = tasks.filter((t) => t.id !== 'probe' && t.state === 'ready').map((t) => t.id),
    firstPlayable = progressive ? 8 : highAt,
    ready = time >= firstPlayable && gateApproved;
  return {
    tasks,
    renditions,
    published: ready ? renditions : [],
    state: !gateApproved ? 'WAITING_GATE' : ready ? 'READY' : 'PROCESSING',
    firstPlayable: ready ? firstPlayable : null,
    manifestVersion: ready ? (progressive && time >= highAt ? 2 : 1) : 0,
  };
}
export function videoBandwidth(viewers: number, mbps: number, byteHitRatio: number) {
  if (
    ![viewers, mbps, byteHitRatio].every(Number.isFinite) ||
    viewers < 0 ||
    mbps <= 0 ||
    byteHitRatio < 0 ||
    byteHitRatio > 1
  )
    throw new RangeError('Invalid delivery capacity');
  const viewerGbps = (viewers * mbps) / 1000;
  return {
    viewerGbps,
    originGbps: viewerGbps * (1 - byteHitRatio),
    hourlyTB: (viewers * mbps * 1e6 * 3600) / 8 / 1e12,
  };
}
