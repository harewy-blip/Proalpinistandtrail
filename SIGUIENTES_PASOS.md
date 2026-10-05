# Siguientes pasos

Base de la versión 1, construida la noche del 5 de octubre de 2026 a partir de
`docs/especificacion.md`. No usa ninguna credencial ni cuenta externa: todo
funciona con datos de ejemplo y respuestas simuladas.

Comprobación: `npm run check` (typecheck + 119 tests + build) pasa en limpio.

---

## 1. Qué está hecho

### Proyecto
- Next.js 16 (App Router) + React 19 + TypeScript estricto (`strict`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- PWA: `src/app/manifest.ts`, service worker en `public/sw.js`, iconos
  192/512/maskable/apple en `public/icons` (se regeneran con `npm run icons`).
- Tests con Vitest. CI de GitHub Actions (`.github/workflows/ci.yml`):
  typecheck, tests y build en cada push.

### Esquema SQL para Supabase — `supabase/migrations/` (no ejecutado)
- 7 migraciones, 21 tablas: perfil, zonas con fecha de validez, actividades
  (+ streams aparte), wellness, objetivos, bloques, sesiones planificadas,
  segmentos de referencia y sus pasos detectados, benchmarks y resultados con
  condiciones, nutrición, material, rutas, reglas y evaluaciones, contrato de
  temporada y revisiones semanales.
- Todas llevan `user_id` (por defecto `auth.uid()`) y RLS activada con cuatro
  políticas (ver, crear, editar y borrar solo tus filas). Lo hace la función
  `app.enable_owner_rls()`, así no hay tablas olvidadas.
- `src/db/migrations.test.ts` aplica las migraciones en un Postgres embebido
  (PGlite) con un `auth` simulado y comprueba que todas las tablas tienen RLS y
  que un usuario no puede ver, crear, editar ni borrar filas de otro.

### Librería de cálculos — `src/lib/calc/`
| Módulo | Qué hace |
|---|---|
| `eccentric.ts` | Carga excéntrica: Σ metros de bajada × factor de pendiente (×1; ×1,25 desde el 10 %; ×1,5 desde el 15 %; ×2 desde el 25 %). Aviso semanal si superas en más de 12,5 % la media de 4 semanas. |
| `vam.ts` | VAM en m/h. |
| `climb.ts` | Detecta subidas continuas en un track (tolera rellanos de hasta 15 m) y encuentra los pasos por un segmento de referencia por GPS (radio de inicio/fin + distancia ±25 %). |
| `ghost.ts` | Alinea dos intentos para la gráfica fantasma por distancia o por metros de desnivel ganados, con interpolación de tiempo y FC. |
| `nutrition.ts` | Carbohidratos y proteína del día por tipo y duración de las sesiones de hoy y de mañana, carbohidratos por hora en esfuerzo y recuperación. Cada resultado dice qué regla lo generó. |
| `zones.ts` | Zonas de FC desde el umbral (185 ppm → Z2 158–166, Z3 167–175…). |
| `readiness.ts` | Semáforo de disponibilidad (sueño, FC en reposo frente a tu media, dolor muscular, forma). |
| `weekRules.ts` | Reglas semanales: calidad solo el martes, nunca calidad y montaña en días seguidos. |

### Cliente de intervals.icu — `src/lib/intervals/`
- `IntervalsClient`: actividades, actividad, streams (convertidos a puntos
  para los cálculos), wellness (leer y actualizar un día) y calendario
  (listar, crear, crear en bloque, actualizar, borrar y `upsertEvent` por
  `external_id`).
- Lee `INTERVALS_ATHLETE_ID` e `INTERVALS_API_KEY` del entorno
  (`intervalsClientFromEnv`). Reintenta ante 429/5xx respetando `Retry-After`.
- `workoutToEvent` convierte un entrenamiento estructurado en un evento
  `WORKOUT` con el texto del Workout Builder en `description`
  (`src/lib/workouts/intervalsText.ts`).
- Tests con `fetch` simulado y fixtures realistas en `fixtures/`.

### Pantallas (datos de ejemplo: trail y montaña, umbral 185 ppm, subida de ~360 m)
- **Hoy** (`/`, también `/?d=2026-10-06` para ver otro día): tira semanal,
  sesión con pasos, zonas en ppm y premisas, semáforo con la regla de cada
  señal, carbohidratos del día y aviso de carga excéntrica.
- **Programador** (`/programador`): editor de la sesión (plantillas, pasos,
  repeticiones, zonas), avisos de reglas semanales, carbohidratos del día,
  vista previa del texto exacto que recibirá intervals.icu y botón de envío.
  Sin credenciales funciona en **modo demo** y enseña el evento que crearía.
- **Versiones de mí** (`/versiones`): último intento en la subida de
  referencia frente a hace 3, 6 y 12 meses, gráfica fantasma (ventaja en
  segundos y FC por metro de desnivel, con tooltip) e historial con
  condiciones.

Endpoint: `GET/POST /api/intervals/events` (estado de la conexión y envío).

---

## 2. Decisiones y por qué

1. **Sin librerías de UI ni de gráficas.** CSS propio con tokens claro/oscuro
   y gráficas SVG hechas a mano. Menos dependencias que mantener, y el
   fantasma necesita un eje X propio (metros de desnivel).
2. **El fantasma se alinea por metros de desnivel ganados, no por tiempo.**
   El eje es la altura ganada sobre el inicio, con la altitud suavizada:
   sumar cada subida punto a punto convertía el ruido del barómetro en metros
   y desalineaba los intentos (hay un test que lo cubre).
3. **Dos gráficas en vez de una con dos ejes:** ventaja en segundos y FC van
   por separado, cada una con una sola escala.
4. **Carga excéntrica con histéresis.** Antes de acumular la bajada se suaviza
   la altitud y se exigen tramos de ≥ 20 m horizontales y ≥ 3 m de desnivel.
   Sin esto, 5 km en llano con ruido de ±1,5 m daban más de 50 m de "bajada".
   Factores y umbrales son valores de partida configurables, no ciencia cerrada.
5. **Nutrición: mañana pesa sobre hoy.** Si mañana hay larga o carrera, hoy
   sube como mínimo a 6–8 g/kg. Si mañana hay calidad o montaña, hoy sube como
   mínimo a 4–6 g/kg. Dos sesiones aeróbicas el mismo día cuentan como "doble
   sesión" (8–10 g/kg); fuerza + rodaje no. Un aeróbico de 75–150' entra en
   la banda de 6–8 g/kg, porque la especificación no lo cubre: revísalo.
6. **Entrenamientos a intervals.icu como texto en `description`, no como
   `workout_doc`.** Según la documentación y proyectos que lo han probado en
   vivo, el texto se interpreta (pasos, carga, zonas) y se envía al reloj. El
   `workout_doc` se guarda sin interpretar y los objetivos de FC llegan mal.
7. **`upsertEvent` propio** (busca por `external_id` ese día y actualiza o
   crea) en lugar de `events/bulk?upsert=true`, que la documentación limita a
   clientes OAuth.
8. **Código de acceso (`APP_PASSCODE`) para escribir en intervals.icu.**
   Mientras no haya login, cualquiera con la URL podría escribir en tu
   calendario. Con credenciales configuradas y sin `APP_PASSCODE`, el
   servidor se niega a escribir. Se sustituirá por Supabase Auth.
9. **Zonas de Friel en 5 zonas** (85/90/95/100 % de la FC umbral).
10. **Semáforo = la peor señal.** Umbrales: sueño 7/6 h, FC en reposo +3/+7
    ppm, dolor 3/6, forma −20/−30. Todos configurables.
11. **Peso de ejemplo 68 kg.** Es un supuesto mío: pon el tuyo.
12. **Las migraciones se prueban con PGlite**, que detecta errores de SQL y de
    RLS sin cuenta de Supabase. No sustituye a aplicarlas en Supabase.
13. **TypeScript 5.9 en lugar de 7.** Next 16 se apoya en la API de
    TypeScript 5.

### Sin verificar (la red de esta sesión bloqueaba intervals.icu y su foro)
La API se documentó con una copia de su OpenAPI y con proyectos que la usan en
vivo. Hay que comprobarlo con tu cuenta:
- Que el texto con `Press lap` y rangos de FC (`Z1-Z2 HR`, `86-89% LTHR`) llega
  bien a COROS.
- Si existen ambos streams `altitude` y `fixed_altitude` en tus actividades de
  COROS (el cliente usa el corregido si existe).

---

## 3. Lo que tienes que hacer tú

### a) intervals.icu y COROS (10 min)
1. intervals.icu → Settings → Developer Settings (abajo del todo) → generar la
   API key. Apunta el Athlete ID (aparece en la URL: `intervals.icu/athlete/i123456`).
2. intervals.icu → Settings → Connections → **COROS**: conectar directo (no
   vía Strava: las actividades que llegan por Strava salen vacías en la API) y
   activar **subir entrenamientos planificados** (Upload planned workouts).

### b) Probar en local con tus datos
```bash
npm install
cp .env.example .env.local
# Rellena en .env.local:
#   INTERVALS_ATHLETE_ID=i123456
#   INTERVALS_API_KEY=tu_key
#   APP_PASSCODE=una-frase-larga   # para el botón de envío
npm run dev           # http://localhost:3000
```
En Programador, envía una sesión de prueba a un día libre y comprueba que
aparece en el calendario de intervals.icu y luego en el reloj.

### c) Supabase
1. Crear un proyecto en supabase.com (región UE: los datos de salud son
   categoría especial en el RGPD).
2. Aplicar las migraciones con la CLI:
   ```bash
   npx supabase login
   npx supabase init            # crea supabase/config.toml (no toca migrations/)
   npx supabase link --project-ref TU_PROJECT_REF
   npx supabase db push         # aplica supabase/migrations/*.sql
   ```
3. Copiar a `.env.local` (Project Settings → API):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (esta última solo en el servidor, nunca en el
   navegador).

### d) Vercel
1. Importar el repo en vercel.com (framework Next.js, sin cambios).
2. Environment Variables: las de intervals.icu, `APP_PASSCODE` y las de
   Supabase.
3. Abrir la URL en el móvil → Compartir → **Añadir a pantalla de inicio**.

### e) Datos personales
- **Test de umbral** (plantilla «Test de umbral» en Programador) para
  sustituir los 185 ppm provisionales.
- **Tu peso** y las coordenadas de inicio y fin de tu subida de referencia
  (Chalo). Las coordenadas del ejemplo son ficticias.
- **Archivo de Strava**: Ajustes → Mi cuenta → Descarga o elimina tu cuenta →
  Solicitar archivo (histórico desde 2023).

---

## 4. Siguiente trabajo de código (cuando haya cuentas)
1. Supabase Auth (enlace mágico) y quitar `APP_PASSCODE`.
2. Ingesta: tarea programada (Supabase cron o Vercel Cron, cada 15 min) que
   llama a `listActivities` + `getActivityTrack`, guarda en `activities`,
   `activity_streams`, calcula `eccentric_load` y busca la subida de
   referencia con `matchSegment` → `segment_efforts`.
3. Sustituir los datos de ejemplo: las pantallas leen de `getTodayView()`
   (`src/lib/today.ts`) y `getVersionsView()` (`src/lib/versions.ts`), que son
   el único punto que hay que cambiar.
4. Formulario de wellness de la mañana (30 s), que escriba en Supabase y en
   intervals.icu (`updateWellness`).
5. Guardar en `planned_workouts` lo que se envía desde Programador (con el
   `intervals_event_id` devuelto).

---

## 5. Ideas para la próxima sesión (6 oct 2026)

### a) Comparador basado en tus mejores rendimientos
Ahora "Versiones de mí" compara solo contra la subida del Chalo hace 3, 6 y 12
meses. La idea es que la referencia sean **las carreras, pruebas o tests que tú
marques como tus puntos de mejor rendimiento**.
- Marcar una actividad como "referencia" (carrera, test de umbral, benchmark…)
  con un nombre y un motivo ("mi mejor Chalo", "Trail X 2026").
- Elegir contra cuál comparar el intento de hoy, en vez de fijarlo por meses.
- Comparar solo lo comparable: mismo segmento o tipo de prueba, guardando las
  condiciones (temperatura, sueño, forma).
- Base técnica: ya existen `benchmarks`, `benchmark_results` y
  `segment_efforts` en el esquema; falta un campo tipo `is_reference` / tabla de
  referencias y la UI para marcarlas.

### b) Nutrición mucho más completa
Hoy solo hay el total de carbohidratos y proteína del día. Ampliarlo con:
- **Reparto por comidas**: desayuno, comida, merienda, cena y antes/durante/
  después de entrenar, con gramos de carbohidratos, proteína y grasa en cada
  una, ajustados a la hora de la sesión.
- **Apartado propio en la barra de abajo** (cuarta pestaña "Nutrición") con:
  - recomendaciones de comida concretas por tipo de día (plantillas de menús,
    no conteo de calorías, como dice la especificación);
  - ajuste de macros en cada comida cuando cambia la sesión;
  - plan de avituallamiento durante la sesión (geles, bebida, g/h).
- Añadir grasa y calorías totales al cálculo (ahora solo hay CHO y proteína).

### c) Revisar y exponer las variables más importantes
Revisar todos los valores que ahora están fijos en el código y decidir cuáles
deben verse y poder cambiarse (pantalla de ajustes / perfil). Candidatas:
- Peso, FC umbral, FC máxima y FC en reposo de referencia.
- Umbrales del semáforo (sueño, FC en reposo, dolor muscular, forma).
- Factores de pendiente de la carga excéntrica y % de aviso semanal (12,5 %).
- Rangos de carbohidratos y proteína por tipo de día.
- Día de calidad y reglas de la semana.
Por aclarar: si "variables más importantes" se refiere a esto (ajustes) o a qué
datos mostrar más destacados en cada pantalla.
