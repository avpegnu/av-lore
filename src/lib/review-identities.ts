import { createHash } from 'node:crypto';

/** Explicit IDs survive wording edits; the fallback preserves older content's stored keys. */
export function handbookQuestionIdentity(question: { id?: string; question: { vi: string } }) {
  return (
    question.id ||
    createHash('sha256').update(JSON.stringify(question.question.vi)).digest('hex').slice(0, 24)
  );
}
