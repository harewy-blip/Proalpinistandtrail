/**
 * Subconjunto de los tipos de la API de intervals.icu que usa la app.
 * Nombres de campo tal como los devuelve la API (OpenAPI v1).
 */

export type IntervalsSource =
  | "STRAVA" | "UPLOAD" | "MANUAL" | "GARMIN_CONNECT" | "OAUTH_CLIENT" | "DROPBOX"
  | "POLAR" | "SUUNTO" | "COROS" | "WAHOO" | "ZWIFT" | "ZEPP";

export interface IntervalsActivity {
  id: string;
  start_date_local: string;
  start_date?: string;
  type?: string;
  name?: string;
  source?: IntervalsSource;
  moving_time?: number;
  elapsed_time?: number;
  distance?: number;
  total_elevation_gain?: number;
  total_elevation_loss?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  icu_training_load?: number;
  trimp?: number;
  icu_hr_zone_times?: number[];
  stream_types?: string[];
  external_id?: string;
  strava_id?: string;
  device_name?: string;
}

export interface IntervalsStream {
  type: string;
  name?: string | null;
  data: (number | null)[];
  /** En latlng, data son latitudes y data2 longitudes. */
  data2?: (number | null)[];
}

export interface IntervalsWellness {
  /** Fecha ISO (YYYY-MM-DD). */
  id: string;
  ctl?: number;
  atl?: number;
  rampRate?: number;
  weight?: number;
  restingHR?: number;
  hrv?: number;
  hrvSDNN?: number;
  sleepSecs?: number;
  sleepScore?: number;
  sleepQuality?: number;
  soreness?: number;
  fatigue?: number;
  stress?: number;
  mood?: number;
  motivation?: number;
  comments?: string;
  locked?: boolean;
}

export type EventCategory =
  | "WORKOUT" | "RACE_A" | "RACE_B" | "RACE_C" | "NOTE" | "HOLIDAY" | "SICK" | "INJURED"
  | "SET_EFTP" | "FITNESS_DAYS" | "SEASON_START" | "TARGET" | "SET_FITNESS";

export interface IntervalsEventInput {
  category: EventCategory;
  /** "YYYY-MM-DDT00:00:00", hora local del atleta. */
  start_date_local: string;
  type?: string;
  name: string;
  /** Texto del Workout Builder: intervals.icu lo interpreta en pasos. */
  description?: string;
  moving_time?: number;
  distance?: number;
  external_id?: string;
  target?: "AUTO" | "POWER" | "HR" | "PACE";
  tags?: string[];
}

export interface IntervalsEvent extends IntervalsEventInput {
  id: number;
  icu_training_load?: number;
  push_errors?: unknown[];
}
