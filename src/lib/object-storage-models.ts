// Availability arithmetic for an assumed systematic MDS code. This function
// does not encode bytes, implement Reed–Solomon or estimate durability odds.
export function erasureScenario(
  k: 4 | 8,
  placement: 'balanced' | 'packed',
  failedDomains: number[],
  failedFragments: number[],
) {
  const m = k / 2,
    n = k + m;
  if (
    ![4, 8].includes(k) ||
    !['balanced', 'packed'].includes(placement) ||
    failedDomains.some((d) => !Number.isInteger(d) || d < 0 || d > 2) ||
    failedFragments.some((i) => !Number.isInteger(i) || i < 0 || i >= n)
  )
    throw new RangeError('Invalid bounded fragment scenario');
  const fragments = Array.from({ length: n }, (_, i) => ({
      id: i,
      kind: i < k ? 'data' : 'parity',
      domain: placement === 'balanced' ? i % 3 : i < k ? 0 : 1,
      available:
        !failedDomains.includes(placement === 'balanced' ? i % 3 : i < k ? 0 : 1) &&
        !failedFragments.includes(i),
    })),
    available = fragments.filter((f) => f.available).length;
  return {
    fragments,
    k,
    m,
    n,
    available,
    unavailable: n - available,
    recoverable: available >= k,
    overhead: n / k,
    logicalMB: 960,
    encodedMB: (960 * n) / k,
    fragmentMB: 960 / k,
    basicOneFragmentRepairReadMB: 960,
  };
}
// One unversioned overwrite with a tracked in-flight reader. Pins are a
// logical protection mechanism, not an implementation of distributed leases.
export function readerLifecycle(step: number, protectPin: boolean) {
  if (!Number.isInteger(step) || step < 0 || step > 5)
    throw new RangeError('Invalid bounded reader lifecycle');
  const head = step >= 2 ? 'v2' : 'v1',
    oldExists = step < 3 || (protectPin && step < 5),
    readerState =
      step < 1 ? 'NOT_STARTED' : step < 4 ? 'READING' : protectPin ? 'COMPLETE' : 'FAILED';
  return {
    head,
    oldExists,
    newExists: step >= 2,
    readerVersion: step >= 1 ? 'v1' : '—',
    pinActive: step >= 1 && step < 4,
    readerState,
    retainedOldBytes: oldExists ? 6 : 0,
  };
}

export type UploadPart = { number: number; tag: string; revision: number; data: string };
export type MultipartState = {
  parts: UploadPart[];
  manifest: { number: number; tag: string }[];
  head: number;
  expectedHead: number;
  payload: string;
  upload: 'OPEN' | 'COMPLETED' | 'ABORTED';
  client: 'OPEN' | 'KNOWN_COMPLETE' | 'UNKNOWN' | 'ABORTED';
  result: string;
  committedVersion?: number;
};
export type MultipartAction =
  | 'replace-part'
  | 'restore-part'
  | 'refresh-manifest'
  | 'other-writer'
  | 'accept-current-head'
  | 'complete'
  | 'complete-lost-ack'
  | 'reconcile'
  | 'abort';
export function initialMultipart(): MultipartState {
  const parts = ['AAA', 'BBB', 'CCC'].map((data, i) => ({
    number: i + 1,
    tag: `p${i + 1}-v1`,
    revision: 1,
    data,
  }));
  return {
    parts,
    manifest: parts.map(({ number, tag }) => ({ number, tag })),
    head: 3,
    expectedHead: 3,
    payload: 'OLD',
    upload: 'OPEN',
    client: 'OPEN',
    result: 'PARTS_STAGED',
  };
}
// Logical platform contract, not a complete S3 simulator. Tags are opaque
// version symbols, not real hashes. Checksum validation models exact expected
// payload equality. A retained completion record enables explicit reconciliation.
export function multipartAction(
  input: MultipartState,
  action: MultipartAction,
  conditional = true,
  verifyExpected = true,
): MultipartState {
  const s = structuredClone(input);
  if (action === 'reconcile') {
    s.client =
      s.upload === 'COMPLETED' ? 'KNOWN_COMPLETE' : s.upload === 'ABORTED' ? 'ABORTED' : 'OPEN';
    s.result = s.upload === 'COMPLETED' ? 'COMPLETION_FOUND' : s.upload;
    return s;
  }
  if (action === 'other-writer') {
    s.head++;
    s.payload = 'OTHER';
    s.result = 'OTHER_WRITER_COMMITTED';
    return s;
  }
  if (s.upload !== 'OPEN') {
    s.result = s.upload === 'COMPLETED' ? 'ALREADY_COMPLETED' : 'NO_SUCH_UPLOAD';
    return s;
  }
  if (action === 'replace-part' || action === 'restore-part') {
    const part = s.parts[1];
    part.revision++;
    part.tag = `p2-v${part.revision}`;
    part.data = action === 'replace-part' ? 'XXX' : 'BBB';
    if (action === 'restore-part') s.manifest[1] = { number: 2, tag: part.tag };
    s.result =
      action === 'replace-part' ? 'PART_REPLACED_MANIFEST_STALE' : 'EXPECTED_PART_REUPLOADED';
    return s;
  }
  if (action === 'refresh-manifest') {
    s.manifest = s.parts.map(({ number, tag }) => ({ number, tag }));
    s.result = 'MANIFEST_REFRESHED_NOT_CONTENT_VERIFIED';
    return s;
  }
  if (action === 'accept-current-head') {
    s.expectedHead = s.head;
    s.result = 'NEW_OVERWRITE_INTENT';
    return s;
  }
  if (action === 'abort') {
    s.upload = 'ABORTED';
    s.client = 'ABORTED';
    s.parts = [];
    s.result = 'ABORTED_NO_INFLIGHT_PARTS_IN_MODEL';
    return s;
  }
  if (action === 'complete' || action === 'complete-lost-ack') {
    const ordered = s.manifest.map((m) =>
      s.parts.find((p) => p.number === m.number && p.tag === m.tag),
    );
    if (ordered.some((p) => !p)) {
      s.result = 'INVALID_PART';
      return s;
    }
    const bytes = ordered.map((p) => p!.data).join('');
    if (verifyExpected && bytes !== 'AAABBBCCC') {
      s.result = 'EXPECTED_CHECKSUM_MISMATCH';
      return s;
    }
    if (conditional && s.head !== s.expectedHead) {
      s.result = 'PRECONDITION_FAILED';
      return s;
    }
    s.head++;
    s.payload = bytes;
    s.upload = 'COMPLETED';
    s.committedVersion = s.head;
    s.client = action === 'complete-lost-ack' ? 'UNKNOWN' : 'KNOWN_COMPLETE';
    s.result = action === 'complete-lost-ack' ? 'COMMITTED_RESPONSE_LOST' : 'COMMITTED';
    return s;
  }
  throw new RangeError('Unknown multipart action');
}
