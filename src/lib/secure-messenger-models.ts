/** Counts/receipt/key-possession fixtures only: no key generation, encryption or protocol security proof. */
export function messengerFanout(
  members: number,
  devices: number,
  activeSenders: number,
  messagesPerEpoch: number,
  requestedLeaves: number,
) {
  const active = Math.min(activeSenders, members - 1),
    leaves = Math.min(requestedLeaves, members - active),
    epochs = Array.from({ length: leaves + 1 }, (_, e) => {
      const size = members - e,
        recipients = size * devices - 1;
      return {
        epoch: e + 1,
        members: size,
        recipientDevices: recipients,
        keyEnvelopes: active * recipients,
        payloadEncryptions: active * messagesPerEpoch,
        dataDeliveries: active * messagesPerEpoch * recipients,
      };
    });
  const keyEnvelopes = epochs.reduce((s, e) => s + e.keyEnvelopes, 0),
    payloadEncryptions = epochs.reduce((s, e) => s + e.payloadEncryptions, 0),
    dataDeliveries = epochs.reduce((s, e) => s + e.dataDeliveries, 0);
  return {
    active,
    leaves,
    epochs,
    keyEnvelopes,
    payloadEncryptions,
    dataDeliveries,
    pairwiseDataEnvelopes: dataDeliveries,
    senderKeyUploads: keyEnvelopes + payloadEncryptions,
    senderKeyDeliveries: keyEnvelopes + dataDeliveries,
  };
}
export function deviceDelivery(
  stage: number,
  persistBeforeAck: boolean,
  perDeviceAck: boolean,
  dedup: boolean,
) {
  const pending = new Set(['D1', 'D2']);
  let d1 = 0,
    d2 = 0;
  const rows: string[] = ['SERVER_ACCEPTED_D1_D2'];
  if (stage >= 1) {
    if (persistBeforeAck) d1 = 1;
    rows.push(persistBeforeAck ? 'D1_PERSISTED' : 'D1_VOLATILE_ONLY');
  }
  if (stage >= 2) {
    if (perDeviceAck) pending.delete('D1');
    else pending.clear();
    rows.push(perDeviceAck ? 'ACK_D1_ONLY' : 'ACK_ACCOUNT_DELETES_ALL');
  }
  if (stage >= 3) rows.push('D1_CRASH_VOLATILE_LOST');
  if (stage >= 4 && pending.has('D2')) {
    d2 = 1;
    rows.push('D2_PERSIST_ACK_LOST');
  }
  if (stage >= 5 && pending.has('D2')) {
    if (!dedup) d2++;
    pending.delete('D2');
    rows.push(dedup ? 'D2_REPLAY_DEDUP_ACK' : 'D2_DUPLICATE_VISIBLE_ACK');
  }
  return {
    rows,
    d1,
    d2,
    queued: [...pending],
    volatileD1: stage >= 1 && stage < 3 && !persistBeforeAck ? 1 : 0,
    d1Lost: stage >= 3 && d1 === 0 && !pending.has('D1'),
    d2Lost: stage >= 4 && d2 === 0 && !pending.has('D2'),
    duplicates: Math.max(0, d2 - 1),
  };
}
export function groupKeyBoundary(
  stage: number,
  rotate: boolean,
  deliverNewKey: boolean,
  currentEpochGuard: boolean,
) {
  const membershipEpoch = stage >= 1 ? 2 : 1,
    keyEpoch = stage >= 2 && rotate ? 2 : 1;
  const oldHolders = ['A', 'B', 'C'],
    holders = keyEpoch === 1 ? oldHolders : ['A', 'C', ...(deliverNewKey ? ['D'] : [])];
  const accepted = stage >= 3 && (!currentEpochGuard || keyEpoch === membershipEpoch),
    status = stage < 3 ? 'WAIT_FOR_SEND' : accepted ? 'SENT' : 'REJECT_STALE_EPOCH';
  return {
    membership: membershipEpoch === 1 ? ['A', 'B', 'C'] : ['A', 'C', 'D'],
    membershipEpoch,
    keyEpoch,
    holders,
    accepted,
    status,
    formerMemberHasFutureKey: accepted && holders.includes('B'),
    newMemberHasFutureKey: accepted && holders.includes('D'),
    formerMemberRetainsPastHistory: true,
    newMemberReceivedPastHistory: false,
  };
}
