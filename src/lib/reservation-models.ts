export function nightReservation(scenario: 'race' | 'partial', guarded: boolean) {
  const initial = scenario === 'race' ? [1, 1] : [1, 0],
    available = [...initial];
  let booked = 0,
    rejected = 0;
  const events: string[] = [];
  if (scenario === 'race') {
    events.push('A and B both observe one available room on each night');
    for (const user of ['A', 'B']) {
      if (!guarded || available.every((n) => n >= 1)) {
        for (let i = 0; i < 2; i++) available[i]--;
        booked++;
        events.push(user + ' commits both nights');
      } else {
        rejected++;
        events.push(user + ' rechecks under the atomic boundary and is sold out');
      }
    }
  } else {
    events.push('Night 1 is available; night 2 is full');
    if (guarded) {
      rejected++;
      events.push('Whole transaction rolls back; night 1 remains available');
    } else {
      available[0]--;
      rejected++;
      events.push('Night 1 decremented; night 2 fails without rollback');
    }
  }
  const consumed = initial.reduce((s, n, i) => s + n - available[i], 0);
  return {
    initial,
    available,
    booked,
    rejected,
    events,
    oversold: available.some((n) => n < 0),
    partialLeak: Math.max(0, consumed - booked * 2),
  };
}
export function holdExpiry(time: number, onTime: boolean, guarded: boolean) {
  if (!Number.isInteger(time) || time < 0 || time > 20) throw new RangeError('Invalid hold clock');
  let a: 'HELD' | 'CONFIRMED' | 'EXPIRED' = 'HELD',
    b: 'NOT_ATTEMPTED' | 'CONFIRMED' | 'SOLD_OUT' = 'NOT_ATTEMPTED',
    available = 0,
    recovery = false,
    revived = false;
  if (onTime && time >= 9) a = 'CONFIRMED';
  if (time >= 11 && a === 'HELD') {
    a = 'EXPIRED';
    available++;
  }
  if (time >= 13) {
    if (available > 0) {
      available--;
      b = 'CONFIRMED';
    } else b = 'SOLD_OUT';
  }
  if (!onTime && time >= 15) {
    if (guarded) recovery = true;
    else {
      a = 'CONFIRMED';
      revived = true;
    }
  }
  const confirmed = Number(a === 'CONFIRMED') + Number(b === 'CONFIRMED'),
    held = Number(a === 'HELD');
  const captured = time >= (onTime ? 8 : 12),
    callback = time >= (onTime ? 9 : 15);
  return {
    a,
    b,
    available,
    confirmed,
    held,
    recovery,
    revived,
    overbooked: confirmed + held > 1,
    derivedAvailable: 1 - confirmed - held,
    captured,
    localPayment:
      time < 5
        ? 'NOT_SUBMITTED'
        : callback
          ? 'CAPTURE_CONFIRMED'
          : time >= 7
            ? 'UNKNOWN'
            : 'PROCESSING',
    eligibleHold: a === 'HELD' && time < 10,
  };
}
