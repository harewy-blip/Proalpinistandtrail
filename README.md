# Pro Alpinist & Trail

App de rendimiento en montaña (PWA): sesión de hoy, programador de
entrenamientos que llegan al reloj COROS vía intervals.icu, y "Versiones de mí"
con la subida de referencia detectada por GPS y gráfica fantasma.

- Especificación: [`docs/especificacion.md`](docs/especificacion.md)
- Estado, decisiones y qué falta: [`SIGUIENTES_PASOS.md`](SIGUIENTES_PASOS.md)

```bash
npm install
npm run dev      # http://localhost:3000 (datos de ejemplo)
npm run check    # typecheck + tests + build
```

| Carpeta | Contenido |
|---|---|
| `src/app` | Pantallas Hoy, Programador, Versiones de mí y la API |
| `src/lib/calc` | Cálculos: carga excéntrica, VAM, subidas, fantasma, nutrición, zonas |
| `src/lib/intervals` | Cliente de la API de intervals.icu |
| `src/lib/workouts` | Entrenamientos estructurados y su texto para intervals.icu |
| `supabase/migrations` | Esquema SQL con RLS |
