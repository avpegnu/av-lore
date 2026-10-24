export type RefundEvidence = 'unknown' | 'confirmed' | 'failed';
/** Two requests both observed the initial budget. Only admission/reservations, not a PSP emulator. */
export function refundReservations(
  amountA: number,
  amountB: number,
  phase: number,
  atomic: boolean,
  evidence: RefundEvidence,
) {
  if (
    ![amountA, amountB].every(
      (n) => Number.isInteger(n) && n >= 1000 && n <= 10000 && n % 1000 === 0,
    ) ||
    !Number.isInteger(phase) ||
    phase < 0 ||
    phase > 3 ||
    !['unknown', 'confirmed', 'failed'].includes(evidence)
  )
    throw new RangeError('Invalid refund fixture');
  const captured = 10000,
    acceptedA = phase >= 1,
    acceptedB = phase >= 2 && amountB <= (atomic ? captured - amountA : captured),
    settled = phase === 3,
    confirmed = acceptedA && settled && evidence === 'confirmed' ? amountA : 0,
    reservedA = acceptedA && (!settled || evidence === 'unknown') ? amountA : 0,
    reservedB = acceptedB ? amountB : 0,
    available = captured - confirmed - reservedA - reservedB;
  return {
    captured,
    confirmed,
    reservedA,
    reservedB,
    available,
    overbooked: Math.max(0, -available),
    statusA: !acceptedA ? 'observed' : settled ? evidence : 'reserved',
    statusB: phase < 2 ? 'observed' : acceptedB ? 'reserved' : 'rejected',
  };
}
