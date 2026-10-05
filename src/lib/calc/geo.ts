const EARTH_RADIUS_M = 6_371_000;

/** Distancia en metros entre dos coordenadas (fórmula de haversine). */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * Media móvil centrada de la altitud. El barómetro y el GPS meten ruido de
 * ±1–3 m que, sumado punto a punto, infla el desnivel; suavizar antes de
 * acumular D+/D− evita contar ese ruido como subida o bajada.
 */
export function smooth(values: readonly number[], window: number): number[] {
  if (window <= 1) return [...values];
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const from = Math.max(0, i - half);
    const to = Math.min(values.length - 1, i + half);
    let sum = 0;
    for (let j = from; j <= to; j++) sum += values[j] ?? 0;
    return sum / (to - from + 1);
  });
}
