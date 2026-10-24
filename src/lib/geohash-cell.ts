const alphabet = '0123456789bcdefghjkmnpqrstuvwxyz';
export function geohashCell(latitude: number, longitude: number, precision: number) {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude >= 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude >= 180 ||
    !Number.isInteger(precision) ||
    precision < 1 ||
    precision > 8
  )
    throw new RangeError('Invalid bounded geohash coordinate/precision');
  const bounds = { latitude: [-90, 90], longitude: [-180, 180] },
    steps: {
      axis: 'latitude' | 'longitude';
      min: number;
      max: number;
      mid: number;
      bit: number;
    }[] = [];
  let code = '',
    digit = 0;
  for (let i = 0; i < precision * 5; i++) {
    const axis = i % 2 ? 'latitude' : 'longitude',
      coordinate = axis === 'latitude' ? latitude : longitude,
      [min, max] = bounds[axis],
      mid = (min + max) / 2,
      bit = Number(coordinate >= mid);
    steps.push({ axis, min, max, mid, bit });
    bounds[axis] = bit ? [mid, max] : [min, mid];
    digit = digit * 2 + bit;
    if (i % 5 === 4) {
      code += alphabet[digit];
      digit = 0;
    }
  }
  return {
    code,
    steps,
    south: bounds.latitude[0],
    north: bounds.latitude[1],
    west: bounds.longitude[0],
    east: bounds.longitude[1],
  };
}
export function geohashNeighbors(latitude: number, longitude: number, precision: number) {
  const cell = geohashCell(latitude, longitude, precision),
    height = cell.north - cell.south,
    width = cell.east - cell.west,
    lat = (cell.north + cell.south) / 2,
    lon = (cell.east + cell.west) / 2;
  return [1, 0, -1].flatMap((dy) =>
    [-1, 0, 1].map((dx) => {
      const nextLat = lat + dy * height,
        nextLon = ((((lon + dx * width + 180) % 360) + 360) % 360) - 180;
      return {
        dx,
        dy,
        latitude: nextLat,
        longitude: nextLon,
        cell: nextLat >= -90 && nextLat < 90 ? geohashCell(nextLat, nextLon, precision) : null,
      };
    }),
  );
}
