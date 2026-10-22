/** Analytical fixtures; no network transport, DRM enforcement, stream accounting or payouts. */
export function audioStartup(
  rtt: number,
  mbps: number,
  warm: boolean,
  metadataHit: boolean,
  keyValid: boolean,
  prefetch: boolean,
  predicted: boolean,
  parallel: boolean,
  low: boolean,
  entitled: boolean,
) {
  const kbps = low ? 24 : 160,
    kb = (kbps * 2) / 8,
    hit = prefetch && predicted,
    connect = warm ? 0 : 2 * rtt,
    metadata = metadataHit ? 0 : rtt,
    key = keyValid ? 0 : rtt,
    chunk = hit ? 0 : rtt + (kb * 8) / mbps,
    decode = 20;
  const ready = connect + metadata + (parallel ? Math.max(key, chunk) : key + chunk),
    total = entitled ? ready + decode : null;
  return {
    total,
    kb,
    prefetchHit: hit,
    wastedKB: prefetch && !predicted ? kb : 0,
    status: entitled ? 'PLAYABLE' : 'DENIED',
    phases: [
      { id: 'connect', start: 0, ms: connect },
      { id: 'metadata', start: connect, ms: metadata },
      { id: 'license', start: connect + metadata, ms: key },
      { id: 'bytes', start: connect + metadata + (parallel ? 0 : key), ms: chunk },
      { id: 'decode', start: ready, ms: entitled ? decode : 0 },
    ],
  };
}
const playEvents = [
  { id: 'e1', play: 'p1', seconds: 35, eventDay: 1, arrivalDay: 2, trusted: true },
  { id: 'e1', play: 'p1', seconds: 35, eventDay: 1, arrivalDay: 2, trusted: true },
  { id: 'e2', play: 'p1', seconds: 40, eventDay: 1, arrivalDay: 2, trusted: true },
  { id: 'e3', play: 'p2', seconds: 10, eventDay: 1, arrivalDay: 2, trusted: true },
  { id: 'e4', play: 'p3', seconds: 45, eventDay: 1, arrivalDay: 4, trusted: true },
  { id: 'e5', play: 'p4', seconds: 50, eventDay: 1, arrivalDay: 2, trusted: false },
  { id: 'e6', play: 'p5', seconds: 40, eventDay: 8, arrivalDay: 2, trusted: true },
  { id: 'e7', play: 'p6', seconds: 50, eventDay: 1, arrivalDay: 2, trusted: true },
];
export function audioAccounting(
  count: number,
  threshold: number,
  eventDedup: boolean,
  playDedup: boolean,
  verify: boolean,
  correction: boolean,
) {
  const events = new Set<string>(),
    plays = new Set<string>();
  let base = 0,
    adjustment = 0,
    pending = 0,
    quarantined = 0,
    transportDuplicates = 0,
    semanticDuplicates = 0;
  const rows = playEvents.slice(0, count).map((e) => {
    let result = 'BELOW_THRESHOLD';
    if (verify && (!e.trusted || e.eventDay > e.arrivalDay)) {
      quarantined++;
      result = 'QUARANTINE';
    } else if (eventDedup && events.has(e.id)) {
      transportDuplicates++;
      result = 'EVENT_DUPLICATE';
    } else {
      events.add(e.id);
      if (e.seconds >= threshold) {
        if (playDedup && plays.has(e.play)) {
          semanticDuplicates++;
          result = 'PLAY_ALREADY_COUNTED';
        } else {
          plays.add(e.play);
          if (e.arrivalDay > 3) {
            if (correction) {
              adjustment++;
              result = 'CLOSED_PERIOD_ADJUSTMENT';
            } else {
              pending++;
              result = 'PENDING_LATE_REVIEW';
            }
          } else {
            base++;
            result = 'BASE_COUNT';
          }
        }
      }
    }
    return { ...e, result };
  });
  return {
    rows,
    base,
    adjustment,
    pending,
    quarantined,
    transportDuplicates,
    semanticDuplicates,
    total: base + adjustment,
  };
}
export function audioPlaylist(
  prepends: number,
  stableAnchor: boolean,
  deleteAnchor: boolean,
  retainTombstone: boolean,
) {
  type Entry = { id: string; track: string; deleted: boolean };
  let entries: Entry[] = [
    { id: 'ea', track: 'A', deleted: false },
    { id: 'eb', track: 'B', deleted: deleteAnchor },
    { id: 'ec', track: 'C', deleted: false },
  ];
  for (let i = 0; i < prepends; i++)
    entries.unshift({ id: 'x' + i, track: 'X' + i, deleted: false });
  if (deleteAnchor && !retainTombstone) entries = entries.filter((e) => !e.deleted);
  let status = 'APPLIED',
    duplicateOperationIgnored = 0;
  const accepted = new Set<string>();
  const apply = (operationId: string) => {
    if (accepted.has(operationId)) {
      duplicateOperationIgnored++;
      return;
    }
    let insertAt: number;
    if (stableAnchor) {
      const pos = entries.findIndex((e) => e.id === 'eb');
      if (pos < 0) {
        status = 'RESYNC_REQUIRED';
        return;
      }
      insertAt = pos + 1;
    } else insertAt = Math.min(2, entries.length);
    entries.splice(insertAt, 0, { id: 'ey', track: 'Y', deleted: false });
    accepted.add(operationId);
  };
  apply('B-insert-Y');
  apply('B-insert-Y'); // lost reply triggers the same operation, not a second insertion
  const visible = entries.filter((e) => !e.deleted),
    b = visible.findIndex((e) => e.id === 'eb'),
    y = visible.findIndex((e) => e.id === 'ey');
  return {
    entries,
    visible,
    status,
    wrongAnchor: !deleteAnchor && y >= 0 && y !== b + 1,
    duplicateOperationIgnored,
  };
}
