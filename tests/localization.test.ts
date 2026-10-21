import test from 'node:test';
import assert from 'node:assert/strict';
import { createTranslator } from '../src/lib/translate';

test('UI translations preserve surrounding whitespace and literal replacement characters', () => {
  const t = createTranslator({ 'Lưu lại': 'Save $& $1 $$', 'Gợi ý': 'Hint' });
  assert.equal(t('  Lưu lại\n'), '  Save $& $1 $$\n');
  assert.equal(t('Gợi ý'), 'Hint');
  assert.equal(t('const x = 1;'), 'const x = 1;');
  assert.equal(t('  '), '  ');
});
test('interpolated feedback preserves values and escapes regex punctuation in the source', () => {
  const t = createTranslator({
    'Snapshot (__ITB_VAR_0__) → kết quả +__ITB_VAR_1__.':
      'Snapshot (__ITB_VAR_0__) → result +__ITB_VAR_1__.',
    'Đã lưu __ITB_VAR_0__ mục.': 'Saved __ITB_VAR_0__ items.',
  });
  assert.equal(t('Snapshot (3) → kết quả +1.'), 'Snapshot (3) → result +1.');
  assert.equal(t('Đã lưu 147 mục.'), 'Saved 147 items.');
  assert.equal(t('Snapshot [3] → kết quả +1.'), 'Snapshot [3] → kết quả +1.');
});
test('translated interpolation values keep the same identity', () => {
  const t = createTranslator({
    'Topic: __ITB_VAR_0__ đã xong.': 'Topic: __ITB_VAR_0__ is complete.',
    'Tư duy lập trình': 'Programming Fundamentals',
  });
  assert.equal(
    t('Topic: Tư duy lập trình đã xong.'),
    'Topic: Programming Fundamentals is complete.',
  );
});
