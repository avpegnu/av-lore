/** Closed teaching fixtures, not prompt-injection detectors or production URL validators. */
export function disclosurePaths(
  follows: boolean,
  privateData: boolean,
  sendCapability: boolean,
  recipientAllowed: boolean,
  review: 'not-required' | 'reject' | 'approve',
  remoteImages: boolean,
  imageEgressAllowed: boolean,
) {
  const tool = !follows
    ? 'NO_ATTACK_ATTEMPT'
    : !privateData
      ? 'NO_PRIVATE_PAYLOAD'
      : !sendCapability
        ? 'TOOL_NOT_AVAILABLE'
        : !recipientAllowed
          ? 'DESTINATION_DENIED'
          : review === 'reject'
            ? 'HUMAN_REJECTED'
            : 'SIMULATED_TOOL_DISCLOSURE';
  const image = !follows
    ? 'NO_ATTACK_ATTEMPT'
    : !privateData
      ? 'NO_PRIVATE_PAYLOAD'
      : !remoteImages
        ? 'NO_AUTOMATIC_IMAGE_REQUEST'
        : !imageEgressAllowed
          ? 'IMAGE_EGRESS_DENIED'
          : 'SIMULATED_IMAGE_DISCLOSURE';
  const leaks =
    Number(tool === 'SIMULATED_TOOL_DISCLOSURE') + Number(image === 'SIMULATED_IMAGE_DISCLOSURE');
  return { tool, image, leaks, state: leaks ? 'SIMULATED_DISCLOSURE' : 'NO_SIMULATED_DISCLOSURE' };
}
export type UrlScenario =
  'approved-public' | 'lookalike-host' | 'private-resolution' | 'redirect-outside';
export function urlBoundaryFixture(
  scenario: UrlScenario,
  exactHostCheck: boolean,
  connectionCheck: boolean,
  redirectCheck: boolean,
) {
  const input =
    scenario === 'lookalike-host'
      ? 'https://docs.example.test.evil.test/guide'
      : 'https://docs.example.test/guide';
  const u = new URL(input),
    hostAllowed = u.hostname === 'docs.example.test',
    privateDestination = scenario === 'private-resolution',
    redirect = scenario === 'redirect-outside';
  // Addresses/redirects are fixture metadata: no DNS resolution or network connection occurs.
  const stages = [{ boundary: 'parse', result: 'HTTPS_URL_PARSED' }];
  if (exactHostCheck && !hostAllowed) {
    stages.push({ boundary: 'host', result: 'HOST_DENIED' });
    return { input, host: u.hostname, stages, state: 'BLOCKED', networkAttempt: false };
  }
  stages.push({
    boundary: 'host',
    result: exactHostCheck ? 'HOST_ALLOWED' : 'HOST_CHECK_DISABLED',
  });
  if (connectionCheck && privateDestination) {
    stages.push({ boundary: 'connection destination', result: 'DESTINATION_DENIED' });
    return { input, host: u.hostname, stages, state: 'BLOCKED', networkAttempt: false };
  }
  stages.push({
    boundary: 'connection destination',
    result: connectionCheck ? 'FIXTURE_ADDRESS_ALLOWED' : 'DESTINATION_CHECK_DISABLED',
  });
  if (redirect && redirectCheck) {
    stages.push({ boundary: 'redirect', result: 'REDIRECT_TARGET_DENIED' });
    return { input, host: u.hostname, stages, state: 'BLOCKED', networkAttempt: true };
  }
  if (redirect) stages.push({ boundary: 'redirect', result: 'UNCHECKED_REDIRECT_FOLLOWED' });
  const unsafe = !hostAllowed || privateDestination || redirect;
  return {
    input,
    host: u.hostname,
    stages,
    state: unsafe ? 'UNSAFE_FIXTURE_ALLOW' : 'FIXTURE_ALLOW_NOT_PROOF',
    networkAttempt: true,
  };
}
export const moderationCases = [
  { id: 'H1', harmful: true, score: 0.95 },
  { id: 'H2', harmful: true, score: 0.85 },
  { id: 'H3', harmful: true, score: 0.75 },
  { id: 'H4', harmful: true, score: 0.65 },
  { id: 'H5', harmful: true, score: 0.45 },
  { id: 'H6', harmful: true, score: 0.35 },
  { id: 'B1', harmful: false, score: 0.9 },
  { id: 'B2', harmful: false, score: 0.7 },
  { id: 'B3', harmful: false, score: 0.5 },
  { id: 'B4', harmful: false, score: 0.3 },
  { id: 'B5', harmful: false, score: 0.2 },
  { id: 'B6', harmful: false, score: 0.1 },
];
export function moderationFixture(threshold: number, prevalence: number) {
  if (
    !Number.isFinite(threshold) ||
    threshold < 0 ||
    threshold > 1 ||
    !Number.isFinite(prevalence) ||
    prevalence < 0 ||
    prevalence > 1
  )
    throw new Error('Invalid moderation assumptions');
  const rows = moderationCases.map((c) => ({ ...c, blocked: c.score >= threshold }));
  const tp = rows.filter((r) => r.harmful && r.blocked).length,
    fp = rows.filter((r) => !r.harmful && r.blocked).length,
    fn = 6 - tp,
    tn = 6 - fp,
    tpr = tp / 6,
    fpr = fp / 6;
  const expectedTP = 10000 * prevalence * tpr,
    expectedFP = 10000 * (1 - prevalence) * fpr;
  return {
    rows,
    tp,
    fp,
    fn,
    tn,
    tpr,
    fpr,
    samplePrecision: tp + fp ? tp / (tp + fp) : null,
    expectedTP,
    expectedFP,
    expectedPrecision: expectedTP + expectedFP ? expectedTP / (expectedTP + expectedFP) : null,
  };
}
