export type SendPolicy = 'retry' | 'pre-mark' | 'provider-key';
export function notificationCrash(cut: number, policy: SendPolicy) {
  if (!Number.isInteger(cut) || cut < 0 || cut > 2) throw new RangeError('Invalid crash boundary');
  // Durable intent exists. cut0: before provider; cut1: accepted but not recorded; cut2: recorded.
  const firstAccepted = cut >= 1,
    recorded = cut === 2 || policy === 'pre-mark';
  const retry = !recorded,
    providerCalls = (firstAccepted ? 1 : 0) + (retry ? 1 : 0);
  const acceptances =
    (firstAccepted ? 1 : 0) + (retry && !(policy === 'provider-key' && firstAccepted) ? 1 : 0);
  return {
    providerCalls,
    acceptances,
    retried: retry,
    recordedBeforeRecovery: recorded,
    duplicateAcceptances: Math.max(0, acceptances - 1),
    lost: acceptances === 0,
  };
}
export const notificationInputs = ['e1', 'e1', 'e2', 'e3', 'e4', 'e4', 'e5', 'e6'];
export const notificationChannels = ['push', 'sms', 'email'] as const;
export type NotificationChannel = (typeof notificationChannels)[number];
export type NotificationConfig = {
  enabled: Record<NotificationChannel, boolean>;
  marketing: boolean;
  cap: number;
  maxRetries: number;
  failures: number;
};
export function notificationPipeline(config: NotificationConfig) {
  for (const value of [config.cap, config.maxRetries, config.failures])
    if (!Number.isInteger(value) || value < 0) throw new RangeError('Invalid notification budget');
  const seen = new Set<string>(),
    spent = { push: 0, sms: 0, email: 0 },
    rows: {
      event: string;
      channel: NotificationChannel;
      outcome: 'suppressed' | 'capped' | 'accepted' | 'dlq';
      calls: number;
    }[] = [];
  let duplicates = 0;
  for (const event of notificationInputs) {
    if (seen.has(event)) {
      duplicates++;
      continue;
    }
    seen.add(event);
    for (const channel of notificationChannels) {
      if (!config.enabled[channel]) {
        rows.push({ event, channel, outcome: 'suppressed', calls: 0 });
        continue;
      }
      if (config.marketing && spent[channel] >= config.cap) {
        rows.push({ event, channel, outcome: 'capped', calls: 0 });
        continue;
      }
      spent[channel]++;
      const accepted = config.failures <= config.maxRetries,
        calls = Math.min(config.failures + 1, config.maxRetries + 1);
      rows.push({ event, channel, outcome: accepted ? 'accepted' : 'dlq', calls });
    }
  }
  return {
    rows,
    received: notificationInputs.length,
    unique: seen.size,
    duplicates,
    spent,
    providerCalls: rows.reduce((sum, r) => sum + r.calls, 0),
    accepted: rows.filter((r) => r.outcome === 'accepted').length,
    suppressed: rows.filter((r) => r.outcome === 'suppressed').length,
    capped: rows.filter((r) => r.outcome === 'capped').length,
    dlq: rows.filter((r) => r.outcome === 'dlq').length,
  };
}
