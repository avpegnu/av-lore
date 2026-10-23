export interface ModelDependency {
  id: number;
  name: string;
  availability: number;
  replicas: number;
  required: boolean;
}
export const initialDependencies: ModelDependency[] = [
  { id: 1, name: 'Load balancer', availability: 0.9999, replicas: 1, required: true },
  { id: 2, name: 'Application', availability: 0.999, replicas: 3, required: true },
  { id: 3, name: 'Cache', availability: 0.999, replicas: 1, required: true },
  { id: 4, name: 'Primary database', availability: 0.9995, replicas: 1, required: true },
  { id: 5, name: 'External provider', availability: 0.999, replicas: 1, required: true },
];
/** Conditional model: independent replica/domain outcomes WHEN the shared catastrophic event is absent. */
export function composeDependencies(
  dependencies: readonly ModelDependency[],
  commonFailure: number,
) {
  if (!Number.isFinite(commonFailure) || commonFailure < 0 || commonFailure > 1)
    throw new RangeError('Invalid common-cause probability');
  const rows = dependencies.map((dependency) => {
    if (
      !Number.isFinite(dependency.availability) ||
      dependency.availability < 0 ||
      dependency.availability > 1 ||
      !Number.isInteger(dependency.replicas) ||
      dependency.replicas < 1
    )
      throw new RangeError('Invalid dependency assumptions');
    return { ...dependency, effective: 1 - (1 - dependency.availability) ** dependency.replicas };
  });
  const required = rows.filter((row) => row.required),
    conditional = required.reduce((product, row) => product * row.effective, 1);
  return {
    rows,
    required: required.length,
    conditional,
    withCommonCause: (1 - commonFailure) * conditional,
  };
}
