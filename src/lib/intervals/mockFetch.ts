/**
 * fetch simulado para tests: responde según método y ruta, y guarda cada
 * petición para poder comprobar URL, cabeceras y cuerpo.
 */
export interface RecordedRequest {
  method: string;
  url: URL;
  headers: Record<string, string>;
  body: unknown;
}

export type MockResponse = { status?: number; body?: unknown; headers?: Record<string, string> };
export type Route = (req: RecordedRequest) => MockResponse | undefined;

export function mockFetch(routes: Record<string, MockResponse | MockResponse[] | Route>) {
  const calls: RecordedRequest[] = [];
  const counters = new Map<string, number>();

  const fetchImpl = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = (init.method ?? "GET").toUpperCase();
    const req: RecordedRequest = {
      method,
      url,
      headers: Object.fromEntries(Object.entries((init.headers ?? {}) as Record<string, string>)),
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    };
    calls.push(req);
    const key = `${method} ${url.pathname}`;
    const route = routes[key];
    let res: MockResponse | undefined;
    if (typeof route === "function") res = route(req);
    else if (Array.isArray(route)) {
      const n = counters.get(key) ?? 0;
      counters.set(key, n + 1);
      res = route[Math.min(n, route.length - 1)];
    } else res = route;
    if (!res) return new Response(`No mock for ${key}`, { status: 404 });
    const status = res.status ?? 200;
    const body = res.body === undefined ? null : typeof res.body === "string" ? res.body : JSON.stringify(res.body);
    return new Response(status === 204 ? null : body, { status, headers: res.headers ?? {} });
  }) as typeof fetch;

  return { fetch: fetchImpl, calls };
}
