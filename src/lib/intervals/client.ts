import type { TrackPoint } from "../calc/types";
import type {
  EventCategory,
  IntervalsActivity,
  IntervalsEvent,
  IntervalsEventInput,
  IntervalsStream,
  IntervalsWellness,
} from "./types";

export const INTERVALS_BASE_URL = "https://intervals.icu";

export interface IntervalsClientOptions {
  /** Athlete ID (p. ej. "i123456"). "0" significa "el dueño de la API key". */
  athleteId: string;
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  /** Reintentos ante 429 y 5xx. */
  retries?: number;
  /** Inyectable para que los tests no esperen. */
  sleep?: (ms: number) => Promise<void>;
}

export class IntervalsConfigError extends Error {
  override name = "IntervalsConfigError";
}

export class IntervalsApiError extends Error {
  override name = "IntervalsApiError";
  constructor(
    readonly status: number,
    readonly method: string,
    readonly path: string,
    readonly body: string,
  ) {
    super(`intervals.icu ${method} ${path} → ${status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
}

type Query = Record<string, string | number | boolean | readonly string[] | undefined>;

export type StreamType = "time" | "distance" | "altitude" | "fixed_altitude" | "heartrate" | "latlng" | "cadence" | "velocity_smooth" | "temp";

/** Lee las credenciales de las variables de entorno. */
export function intervalsClientFromEnv(
  env: Record<string, string | undefined> = process.env,
  overrides: Partial<IntervalsClientOptions> = {},
): IntervalsClient {
  const athleteId = env.INTERVALS_ATHLETE_ID?.trim();
  const apiKey = env.INTERVALS_API_KEY?.trim();
  if (!athleteId || !apiKey) {
    throw new IntervalsConfigError("Faltan INTERVALS_ATHLETE_ID o INTERVALS_API_KEY en las variables de entorno");
  }
  return new IntervalsClient({ athleteId, apiKey, ...overrides });
}

export function hasIntervalsCredentials(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.INTERVALS_ATHLETE_ID?.trim() && env.INTERVALS_API_KEY?.trim());
}

/**
 * Cliente de la API REST de intervals.icu. Autenticación Basic con usuario
 * literal "API_KEY" y la API key personal como contraseña.
 */
export class IntervalsClient {
  private readonly athleteId: string;
  private readonly auth: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly retries: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(opts: IntervalsClientOptions) {
    if (!opts.athleteId || !opts.apiKey) throw new IntervalsConfigError("athleteId y apiKey son obligatorios");
    this.athleteId = opts.athleteId;
    this.auth = `Basic ${base64(`API_KEY:${opts.apiKey}`)}`;
    this.baseUrl = (opts.baseUrl ?? INTERVALS_BASE_URL).replace(/\/$/, "");
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.retries = opts.retries ?? 2;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  // ── Actividades ─────────────────────────────────────────────

  /**
   * Actividades entre dos fechas locales, de la más reciente a la más
   * antigua. Las que llegan vía Strava vienen vacías por los términos de
   * Strava: por eso COROS debe conectarse directo a intervals.icu.
   */
  listActivities(params: { oldest: string; newest?: string; limit?: number }): Promise<IntervalsActivity[]> {
    return this.request("GET", `/api/v1/athlete/${this.athleteId}/activities`, { query: params });
  }

  getActivity(id: string): Promise<IntervalsActivity> {
    return this.request("GET", `/api/v1/activity/${encodeURIComponent(id)}`);
  }

  getActivityStreams(id: string, types?: readonly StreamType[]): Promise<IntervalsStream[]> {
    return this.request("GET", `/api/v1/activity/${encodeURIComponent(id)}/streams.json`, {
      query: { types: types?.length ? types.join(",") : undefined },
    });
  }

  /** Streams listos para los cálculos (altitud, distancia, FC, GPS). */
  async getActivityTrack(id: string): Promise<TrackPoint[]> {
    const streams = await this.getActivityStreams(id, ["time", "distance", "altitude", "fixed_altitude", "heartrate", "latlng"]);
    return streamsToTrack(streams);
  }

  // ── Wellness ────────────────────────────────────────────────

  listWellness(params: { oldest?: string; newest?: string; cols?: readonly string[] } = {}): Promise<IntervalsWellness[]> {
    return this.request("GET", `/api/v1/athlete/${this.athleteId}/wellness.json`, {
      query: { oldest: params.oldest, newest: params.newest, cols: params.cols?.join(",") },
    });
  }

  /** Actualiza un día; solo cambian los campos enviados. */
  updateWellness(date: string, data: Omit<Partial<IntervalsWellness>, "id">): Promise<IntervalsWellness> {
    return this.request("PUT", `/api/v1/athlete/${this.athleteId}/wellness/${date}`, { body: data });
  }

  // ── Calendario ──────────────────────────────────────────────

  listEvents(params: { oldest?: string; newest?: string; category?: readonly EventCategory[] } = {}): Promise<IntervalsEvent[]> {
    return this.request("GET", `/api/v1/athlete/${this.athleteId}/events`, {
      query: { oldest: params.oldest, newest: params.newest, category: params.category?.join(",") },
    });
  }

  /**
   * Crea un evento. Con categoría WORKOUT y el texto del Workout Builder en
   * `description`, intervals.icu lo convierte en entrenamiento estructurado
   * y lo envía al reloj si "Upload planned workouts" está activo en la
   * conexión de COROS.
   */
  createEvent(event: IntervalsEventInput): Promise<IntervalsEvent> {
    return this.request("POST", `/api/v1/athlete/${this.athleteId}/events`, { body: event });
  }

  createEvents(events: readonly IntervalsEventInput[], opts: { upsert?: boolean } = {}): Promise<IntervalsEvent[]> {
    return this.request("POST", `/api/v1/athlete/${this.athleteId}/events/bulk`, {
      query: { upsert: opts.upsert || undefined },
      body: events,
    });
  }

  updateEvent(eventId: number, event: Partial<IntervalsEventInput>): Promise<IntervalsEvent> {
    return this.request("PUT", `/api/v1/athlete/${this.athleteId}/events/${eventId}`, { body: event });
  }

  async deleteEvent(eventId: number): Promise<void> {
    await this.request("DELETE", `/api/v1/athlete/${this.athleteId}/events/${eventId}`);
  }

  /**
   * Crea o actualiza por `external_id`. No depende de `upsert=true` del
   * endpoint bulk, que la documentación limita a clientes OAuth: busca el
   * evento ese día y lo actualiza si ya existe.
   */
  async upsertEvent(event: IntervalsEventInput & { external_id: string }): Promise<IntervalsEvent> {
    const day = event.start_date_local.slice(0, 10);
    const existing = (await this.listEvents({ oldest: day, newest: day, category: [event.category] })).find(
      (e) => e.external_id === event.external_id,
    );
    return existing ? this.updateEvent(existing.id, event) : this.createEvent(event);
  }

  // ── Transporte ──────────────────────────────────────────────

  private async request<T>(method: string, path: string, opts: { query?: Query; body?: unknown } = {}): Promise<T> {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v === undefined || v === "") continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }
    const headers: Record<string, string> = { Authorization: this.auth, Accept: "application/json" };
    const init: RequestInit = { method, headers };
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }

    for (let attempt = 0; ; attempt++) {
      const res = await this.fetchImpl(url.toString(), init);
      if (res.ok) {
        const text = await res.text();
        return (text ? JSON.parse(text) : undefined) as T;
      }
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < this.retries) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await this.sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt);
        continue;
      }
      throw new IntervalsApiError(res.status, method, path, await res.text().catch(() => ""));
    }
  }
}

/**
 * Convierte los streams de intervals.icu (arrays paralelos por tipo) en
 * puntos. Prefiere `fixed_altitude` (altitud corregida) si existe. Las
 * muestras sin tiempo o altitud se descartan; los huecos de GPS (null) dejan
 * el punto sin coordenadas.
 */
export function streamsToTrack(streams: readonly IntervalsStream[]): TrackPoint[] {
  const by = new Map(streams.map((s) => [s.type, s]));
  const time = by.get("time")?.data;
  const alt = (by.get("fixed_altitude") ?? by.get("altitude"))?.data;
  if (!time || !alt) return [];
  const dist = by.get("distance")?.data;
  const hr = by.get("heartrate")?.data;
  const latlng = by.get("latlng");

  const pts: TrackPoint[] = [];
  for (let i = 0; i < time.length; i++) {
    const t = time[i];
    const a = alt[i];
    if (t == null || a == null) continue;
    const p: TrackPoint = { t, alt: a, dist: dist?.[i] ?? pts[pts.length - 1]?.dist ?? 0 };
    const h = hr?.[i];
    if (h != null && h > 0) p.hr = h;
    const lat = latlng?.data[i];
    const lng = latlng?.data2?.[i];
    if (lat != null && lng != null) {
      p.lat = lat;
      p.lng = lng;
    }
    pts.push(p);
  }
  return pts;
}

/** Actividad que llegó por Strava y la API devuelve sin datos. */
export function isStravaStub(a: IntervalsActivity): boolean {
  return a.source === "STRAVA" && a.moving_time == null && a.distance == null;
}

function base64(s: string): string {
  return typeof btoa === "function" ? btoa(s) : Buffer.from(s).toString("base64");
}
