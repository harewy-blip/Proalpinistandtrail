/** Muestra de un stream de actividad, alineada por índice como en intervals.icu. */
export interface TrackPoint {
  /** Segundos desde el inicio de la actividad. */
  t: number;
  /** Altitud en metros. */
  alt: number;
  /** Distancia acumulada en metros. */
  dist: number;
  lat?: number;
  lng?: number;
  /** Frecuencia cardiaca en ppm. */
  hr?: number;
}
