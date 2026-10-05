/**
 * VAM (velocità ascensionale media): metros de desnivel positivo por hora.
 */
export function vam(elevationGainM: number, durationS: number): number {
  if (durationS <= 0) return 0;
  return Math.round((elevationGainM / durationS) * 3600);
}
