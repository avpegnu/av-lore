export type FeedStrategy = 'push' | 'pull' | 'hybrid';
export interface FeedTradeoffInput {
  strategy: FeedStrategy;
  followers: number;
  activeFraction: number;
  readerFollowees: number;
  otherPulledAuthors: number;
  threshold: number;
  insertsPerSecond: number;
}
/** One-author cost fixture; logical sources are not RPC counts or latency predictions. */
export function feedTradeoff(input: FeedTradeoffInput) {
  const {
    strategy,
    followers,
    activeFraction,
    readerFollowees,
    otherPulledAuthors,
    threshold,
    insertsPerSecond,
  } = input;
  if (
    !['push', 'pull', 'hybrid'].includes(strategy) ||
    !Number.isInteger(followers) ||
    followers < 1 ||
    !Number.isFinite(activeFraction) ||
    activeFraction < 0 ||
    activeFraction > 1 ||
    !Number.isInteger(readerFollowees) ||
    readerFollowees < 1 ||
    !Number.isInteger(otherPulledAuthors) ||
    otherPulledAuthors < 0 ||
    otherPulledAuthors >= readerFollowees ||
    !Number.isInteger(threshold) ||
    threshold < 0 ||
    !Number.isFinite(insertsPerSecond) ||
    insertsPerSecond <= 0
  )
    throw new RangeError('Invalid feed trade-off assumptions');
  const authorPulled = strategy === 'pull' || (strategy === 'hybrid' && followers > threshold);
  const eligibleFollowers = Math.round(followers * activeFraction),
    timelineInserts = authorPulled ? 0 : eligibleFollowers;
  const pulledSources =
    strategy === 'push'
      ? 0
      : strategy === 'pull'
        ? readerFollowees
        : otherPulledAuthors + (authorPulled ? 1 : 0);
  const timelineSources = strategy === 'pull' ? 0 : 1;
  return {
    authorPulled,
    eligibleFollowers,
    timelineInserts,
    sourcePosts: 1,
    insertPayloadBytes: timelineInserts * 16,
    idealDrainSeconds: timelineInserts / insertsPerSecond,
    pulledSources,
    timelineSources,
    logicalReadSources: timelineSources + pulledSources,
  };
}
