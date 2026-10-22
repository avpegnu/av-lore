export const syncBase = 'AAAABBBBCCCCDDDD';
export const syncEdits = {
  replace: 'AAAABBBXCCCCDDDD',
  insert: 'XAAAABBBBCCCCDDDD',
  append: 'AAAABBBBCCCCDDDDEEEE',
};
function chunks(text: string, size: number) {
  return Array.from({ length: Math.ceil(text.length / size) }, (_, i) =>
    text.slice(i * size, (i + 1) * size),
  );
}
export function chunkDelta(size: number, edit: keyof typeof syncEdits) {
  if (!Number.isInteger(size) || size < 2 || size > 8)
    throw new RangeError('Invalid teaching chunk size');
  const before = chunks(syncBase, size),
    after = chunks(syncEdits[edit], size),
    oldSet = new Set(before),
    needed = [...new Set(after.filter((c) => !oldSet.has(c)))];
  const ids = new Map<string, string>();
  for (const c of [...before, ...after]) if (!ids.has(c)) ids.set(c, 'block-' + (ids.size + 1));
  return {
    before: before.map((text) => ({ text, id: ids.get(text)! })),
    after: after.map((text) => ({ text, id: ids.get(text)!, reused: oldSet.has(text) })),
    needed,
    uploadBytes: needed.reduce((sum, c) => sum + c.length, 0),
    fileBytes: syncEdits[edit].length,
    reusedPositions: after.filter((c) => oldSet.has(c)).length,
  };
}
export function syncConflict(stage: number, guarded: boolean, first: 'A' | 'B') {
  if (!Number.isInteger(stage) || stage < 0 || stage > 4)
    throw new RangeError('Invalid sync stage');
  const second = first === 'A' ? 'B' : 'A';
  let revision = 5,
    content = 'base bytes';
  if (stage >= 2) {
    revision = 6;
    content = first + ' edit';
  }
  if (stage >= 3 && !guarded) {
    revision = 7;
    content = second + ' edit';
  }
  const unresolved = guarded && stage === 3,
    copy =
      guarded && stage === 4
        ? {
            id: 'copy-' + second,
            name: `report (conflicted ${second}).bin`,
            revision: 1,
            content: second + ' edit',
          }
        : null;
  return {
    first,
    second,
    revision,
    content,
    unresolved,
    copy,
    files: copy ? 2 : 1,
    overwrittenWithoutConflict: !guarded && stage >= 3,
  };
}
