import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeDependencies, initialDependencies } from '../src/lib/dependency-composition';
test('composition combines heterogeneous conditional replica groups and a shared catastrophic event', () => {
  const rows = [
    { id: 1, name: 'A', availability: 0.9, replicas: 2, required: true },
    { id: 2, name: 'B', availability: 0.8, replicas: 1, required: true },
  ];
  const independent = composeDependencies(rows, 0),
    common = composeDependencies(rows, 0.1);
  assert.ok(Math.abs(independent.conditional - 0.99 * 0.8) < 1e-12);
  assert.ok(Math.abs(common.withCommonCause - 0.9 * 0.99 * 0.8) < 1e-12);
  assert.equal(independent.required, 2);
  assert.equal(
    composeDependencies(
      rows.map((r) => ({ ...r, replicas: 5 })),
      0.1,
    ).withCommonCause <= 0.9,
    true,
  );
  const soft = composeDependencies(
    rows.map((r) => (r.id === 2 ? { ...r, required: false } : r)),
    0,
  );
  assert.ok(Math.abs(soft.conditional - 0.99) < 1e-12);
  assert.equal(soft.required, 1);
  assert.equal(composeDependencies([], 0).conditional, 1);
  assert.equal(composeDependencies([], 1).withCommonCause, 0);
  assert.equal(initialDependencies[0].replicas, 1);
});
test('composition rejects invalid probability and replica inputs instead of displaying a plausible percentage', () => {
  for (const common of [-1, 1.01, NaN, Infinity])
    assert.throws(() => composeDependencies(initialDependencies, common), RangeError);
  for (const availability of [-0.01, 1.1, NaN])
    assert.throws(
      () => composeDependencies([{ ...initialDependencies[0], availability }], 0),
      RangeError,
    );
  for (const replicas of [0, 1.5, Infinity])
    assert.throws(
      () => composeDependencies([{ ...initialDependencies[0], replicas }], 0),
      RangeError,
    );
});
