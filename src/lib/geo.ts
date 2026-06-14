export const LOCATION_SHARE_PROMPT_RADIUS_METERS = 120;

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function getDistanceMeters(
  fromLat?: number,
  fromLng?: number,
  toLat?: number,
  toLng?: number,
) {
  if (
    !isFiniteCoordinate(fromLat) ||
    !isFiniteCoordinate(fromLng) ||
    !isFiniteCoordinate(toLat) ||
    !isFiniteCoordinate(toLng)
  ) {
    return null;
  }

  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function isLocationWithinRadius(
  fromLat?: number,
  fromLng?: number,
  toLat?: number,
  toLng?: number,
  radiusMeters = LOCATION_SHARE_PROMPT_RADIUS_METERS,
) {
  const distanceMeters = getDistanceMeters(fromLat, fromLng, toLat, toLng);
  return distanceMeters !== null && distanceMeters <= radiusMeters;
}
