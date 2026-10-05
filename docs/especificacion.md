
# Especificación App de Rendimiento en Montaña
2026-10-05 · 
## Visión y principios
La app es el sistema operativo de tu temporada: une datos, cargas, nutrición, material, rutas y objetivos, y te enseña tu progreso frente a tus propias versiones anteriores. Empieza como herramienta personal, pero se diseña multiusuario desde el día 1 para poder convertirla en producto sin reescribirla.
Perfil de uso: deportista autoentrenado de trail corto/medio, montaña y alpinismo. Terreno de referencia: Xalo (~500 m, subida continua máx. ~360 m, 70–90 m/km habituales). Stack actual: COROS (ejecución), Strava (histórico), TrainingPeaks (planificación).
Principios de diseño
- 
El tiempo de entrenamiento es la métrica de carga principal; el desnivel es consecuencia del terreno, no un objetivo.
- 
Cada recomendación muestra la regla que la genera y su fuente (sección Motor de reglas). Nada de cajas negras.
- 
La carga excéntrica (metros de bajada) se modela aparte: es tu limitante y la causa probable de los calambres en carrera.
- 
Fuerza y escalada van fuera del presupuesto aeróbico; la fuerza sin TSS o con un valor fijo bajo.
- 
La disciplina se construye con evidencia objetiva de progreso (benchmarks repetibles), no con rachas ni gamificación vacía.
- 
Móvil para el día a día (sesión de hoy, nutrición, registro rápido); escritorio para análisis y planificación.
Fuera de alcance en v1: prescripción médica, planes para terceros y funciones sociales.
## Arquitectura e integraciones
Los datos entran por intervals.icu como hub, porque su API es abierta y ya sincroniza COROS y Strava; TrainingPeaks queda como planificador hasta confirmar si te dan acceso a su API. Los accesos y términos de cada API pueden haber cambiado: verificarlos en la Fase 0.
Fuente
Qué aporta
Vía de acceso
Riesgo
COROS
Actividades, FC, GPS, potencia, sueño/HRV si disponible
Sincronización COROS → intervals.icu (y Strava)
La API directa de COROS es para partners
Strava
Histórico completo
API Strava (OAuth), importación inicial masiva
Límites de peticiones; sus términos restringen ciertos usos con IA y mostrar datos a terceros: revisar antes de producto
intervals.icu
Fitness/fatiga/forma, zonas, wellness, calendario
API REST con API key personal
Bajo
TrainingPeaks
Plan y PMC actuales
API solo para partners aprobados; alternativa: planificar en la app o en intervals.icu
Alto: verificar antes de construir
Wellness manual
Peso, sueño, dolor muscular, sensaciones
Formulario en la app (30 s por la mañana)
Bajo
Flujo: ingesta (webhooks + tarea programada cada 15 min) → normalización a modelo propio → cálculos (cargas, excéntrico, benchmarks) → motor de reglas → interfaz web/móvil. Una capa de IA (Claude API) redacta resúmenes semanales y responde preguntas sobre tus datos, siempre leyendo los resultados del motor de reglas.
### Conexiones: qué configurar en cada servicio
Detalles de memoria, sin buscador: comprueba pantallas, límites y términos actuales al configurar cada uno.
Servicio
Papel en la v1
Qué necesitas
Cómo
intervals.icu
Fuente principal: actividades, streams (FC, altitud, GPS), wellness y calendario
Athlete ID + API key personal
Ajustes → Developer settings → generar la key; autenticación Basic con usuario API_KEY y la key como contraseña
COROS → intervals.icu
Que tus actividades lleguen completas
Vincular COROS directamente en intervals.icu
Clave: intervals.icu no puede reexponer por su API lo que le llega desde Strava, así que COROS debe entrar directo
Strava
Histórico desde 2023
Opción rápida: archivo de exportación de tu cuenta (todos los FIT/GPX). Opción API: app propia con Client ID, Secret y OAuth activity:read_all
Archivo: Ajustes → Mi cuenta → solicitar archivo. API: strava.com/settings/api, respetando límites por 15 min y por día
TrainingPeaks
Planificación; no necesaria en la v1
Acceso de desarrollador/partner a su API
Su FAQ dice que no aceptan solicitudes para uso personal (comprobado el 5 oct 2026); solo partners, vía api.trainingpeaks.com/request-access. Retomarlo si la app pasa a producto
Claude API
Resúmenes e IA (v2)
API key de la consola de Anthropic
No necesaria en la v1
Plan semanal en la v1: la app lee la sesión del día del calendario de intervals.icu. La app también programa: crea la sesión estructurada y la envía por API al calendario de intervals.icu, que la sincroniza con el reloj (comprobado el 5 oct 2026). Flujo completo: app → intervals.icu → reloj COROS → intervals.icu → app para el análisis.
## Dashboard y gestión de cargas
La pantalla principal responde a una pregunta: qué toca hoy y si estás en condiciones de hacerlo.
- 
Hoy (móvil): sesión planificada con su objetivo fisiológico, zonas en FC, premisas (p. ej. bajada activa), carbohidratos del día y semáforo de disponibilidad (sueño, FC reposo, dolor muscular, forma).
- 
Semana: tiempo planificado frente a realizado por tipo (aeróbico, calidad, fuerza, bici, escalada) y verificación de las reglas de arquitectura.
- 
Bloque: curva de fitness/fatiga/forma, distribución de intensidad y progresión de volumen hacia el pico histórico (~15 h).
Métrica
Cálculo
Para qué
Carga de sesión
hrTSS/TRIMP de intervals.icu; fuerza = 0 o valor fijo bajo
Base del modelo fitness-fatiga
Fitness / Fatiga / Forma
Medias exponenciales de 42 d y 7 d; forma = diferencia
Tendencia, descargas, taper
Ratio agudo:crónico
Fatiga / fitness
Alerta orientativa si > 1,3 (evidencia debatida; configurable)
Carga excéntrica
Σ metros de bajada × factor de pendiente (más peso > 15 %)
Índice propio de bajada con progresión semanal limitada
Distribución de intensidad
% de tiempo en Z1–2 / Z3 / Z4–5
Detectar exceso de zona gris
Monotonía y strain
Media / desviación de la carga diaria; × carga semanal (Foster)
Riesgo de sobrecarga
Desacople Pa:FC
Deriva de FC frente a ritmo o potencia en Z2 larga
Calidad de la base aeróbica
Reglas de arquitectura que valida (configurables):
- 
Calidad solo el martes, con ~72 h hasta la larga de montaña del sábado.
- 
Calidad y montaña con premisas nunca en días consecutivos.
- 
Ciclos 3:1; la semana de descarga baja el tiempo un 30–40 % por defecto.
- 
No mezclar umbral y VO2max en el mismo bloque de base.
- 
Aumento de tiempo semanal ≤ ~10 % fuera de la descarga (valor por defecto).
Zonas: por FC, con umbral pendiente de test (estimación actual 185–188 ppm). Cada test crea un conjunto de zonas nuevo con fecha; las sesiones antiguas conservan las zonas con las que se hicieron.
## Nutrición periodizada
La nutrición se calcula a partir de la sesión de hoy y la de mañana: más carbohidratos donde hay calidad o tiradas largas y menos en días suaves (comer para el trabajo que toca). Los rangos son valores de partida de las guías de nutrición deportiva (ACSM, Burke, Jeukendrup), citados de memoria y ajustables.
Tipo de día
Carbohidratos (g/kg/día)
Proteína (g/kg/día)
Descanso o fuerza
3–5
1,6–2,0
Aeróbico suave < 75'
4–6
1,6–2,0
Calidad o montaña 1,5–2,5 h
6–8
1,6–2,0
Larga > 2,5 h o doble sesión
8–10
1,6–2,0
1–2 días antes de prueba A
8–10 (carga)
1,6
Durante el esfuerzo:
- 
Menos de 60': agua.
- 
60–150': 30–60 g de carbohidratos por hora.
- 
Más de 150' o carrera: 60–90 g/h con mezcla glucosa:fructosa. Entrenamiento intestinal: +10 g/h cada 1–2 tiradas largas hasta tolerar el objetivo, con registro de tolerancia digestiva (0–10).
- 
Sodio y líquido según tu tasa de sudor: la app la calcula pesándote antes y después de sesiones a distinta temperatura.
Recuperación: 1–1,2 g/kg de carbohidratos y ~0,3 g/kg de proteína en las 2 h siguientes a calidad o larga.
Funciones: plan diario automático desde el calendario; plantillas de comidas por tipo de día en vez de conteo calórico; planificador de avituallamiento por carrera (geles y bebida por tramo); peso como dato de contexto con media semanal, no diaria.
## Versiones de mí: benchmarks y disciplina
La app compara tu yo actual con tus versiones de hace 3, 6 y 12 meses mediante sesiones repetibles en condiciones controladas: el progreso se demuestra con datos, no con sensaciones.
Benchmark
Protocolo
Métrica
Cuándo
Subida al Xalo a FC fija
Subida continua ~360 m a FC constante (Z2 alta)
Tiempo y VAM (m/h) a la misma FC
Cada 4 semanas, final de la semana 3
3×8' Z3 en llano
Calentamiento estándar + 3×8' en Z3
Ritmo medio a FC Z3
Una vez por bloque
Test de umbral en subida
30' al máximo sostenible; umbral ≈ FC media de los últimos 20'
FC umbral y VAM
Inicio de cada bloque
Desacople aeróbico
60–90' en Z2 llano
% de deriva Pa:FC (< 5 % = base sólida)
Mensual
Bajada estandarizada
Misma bajada a esfuerzo controlado
Tiempo + dolor muscular a 24/48 h (0–10)
Cada 4 semanas
Fuerza
Step-up con carga, búlgara, gemelo excéntrico
Carga × repeticiones
Una vez por bloque
Cada resultado guarda sus condiciones (temperatura, sueño, forma del día) para comparar solo lo comparable.
Mecánicas de disciplina:
- 
Fantasma: superpone el benchmark de hoy con el de meses atrás (curva de FC, VAM). Compites contra ti.
- 
Contrato de temporada: objetivo, por qué te importa y qué estás dispuesto a sacrificar. Aparece en los días de baja adherencia.
- 
Adherencia a lo clave, no rachas: % de sesiones clave cumplidas por semana (calidad, larga, fuerza). Saltarse un rodaje no rompe nada; saltarse lo clave sí se ve.
- 
Intención de implementación: cada sesión clave con día, hora y lugar fijados, y recordatorio la víspera.
- 
Revisión semanal de 3 minutos (domingo): RPE, sensaciones y una mejora; la IA resume la tendencia.
- 
Récords objetivos: mejor VAM, mejor Xalo y semanas seguidas en plan.
Evitar: castigos, comparaciones con otros en v1 y métricas de vanidad (km totales).
## Objetivos y pruebas
La fecha de la prueba A define la temporada: la app genera los bloques hacia atrás desde ella y coloca las B y C como entrenamiento.
Prioridades: A (1–2 por temporada, pico de forma), B (preparación, con miniafinamiento de 3–4 días), C (se entrenan a través, sin descarga).
Ficha de objetivo: fecha, tipo (trail corto < 30 km, medio 30–50 km, montaña/alpinismo), distancia, D+, D−, altitud máxima, terreno técnico, tiempo objetivo y material obligatorio.
Fase
Duración
Foco
Base
8–12 semanas
Volumen aeróbico, fuerza, umbral y tolerancia excéntrica
Específico
6–8 semanas
VO2max en subida, ritmo de carrera, bajada técnica y simulacros
Afinamiento
7–14 días
−40–60 % de volumen manteniendo intensidad
Transición
1–2 semanas
Recuperación activa
Objetivos de montaña y alpinismo añaden: muchas horas en Z1 con mochila cargada, fuerza de piernas y core, técnica (crampones, trepada), exposición a altitud si se supera ~3000 m y un checklist de condiciones (meteo, nivología, horarios de retirada).
Simulador de prueba: estima tu tiempo por tramo a partir de tu VAM en subida y tu velocidad histórica en llano y bajada según pendiente. Se acopla al planificador de avituallamiento de Nutrición.
## Material
Cada actividad se vincula al material usado (por defecto según tipo, editable), así la app sabe el desgaste real y avisa antes de que algo falle.
Categoría
Qué registra
Alerta
Zapatillas
km, horas y D− por par; foto de suela
600–800 km (configurable) o desgaste visible
Bastones, mochila, frontal
Uso, baterías
Revisión antes de prueba A
Crampones y piolet
Salidas, último afilado
Afilado y revisión de correas por temporada
Cuerda, arnés, casco
Fecha de fabricación y caídas
Vida útil según fabricante; retiro tras caída fuerte
ARVA, pala, sonda
Pilas, último test
Test de grupo antes de cada salida invernal
Ropa técnica
Capas y membranas
Reimpermeabilizado por uso
Funciones: checklists por tipo de salida (trail corto, ultra, invernal, alpinismo) y por material obligatorio de cada carrera; coste por uso; lista de reposición.
## Rutas y terreno
Las rutas se clasifican por lo que entrenan, no solo por distancia: la app propone la ruta que cumple los requisitos de la sesión planificada.
Ficha de ruta: GPX, distancia, D+, D−, pendiente media y máxima en subida y bajada, % de tramos > 15 %, minutos de subida continua, tipo de firme (pista, sendero, técnico, roca, nieve), fuentes de agua y accesos.
Etiquetas de uso:
- 
Umbral en subida: al menos 10' de subida continua.
- 
VO2max: rampas de 3–5'.
- 
Bajada técnica y bajada rápida.
- 
Larga de montaña y recuperación.
- 
Benchmark (Xalo).
Ejemplo: 3×10' Z3 en subida → la app busca rutas con ≥ 30' de subida continua o rampas repetibles de ≥ 10'.
Especificidad: compara el ratio desnivel/distancia y la pendiente de tus rutas habituales (70–90 m/km) con el perfil de la prueba objetivo, e indica qué tipo de terreno te falta entrenar.
Fuentes: segmentos repetidos de tus actividades, importación de GPX y alta manual. Mapa topográfico (Mapbox o MapLibre) y previsión meteo (p. ej. Open-Meteo) para las salidas del fin de semana.
## Motor de reglas y bibliografía
Cada recomendación sale de una regla escrita, versionada y con su fuente; la IA explica y resume, pero nunca inventa prescripciones.
Formato de regla: id, condición, acción, fuente, nivel de evidencia y si es configurable. 1.3 durante 3 días seguidos
Entonces: proponer cambiar la próxima calidad por Z1–Z2
Fuente: Gabbett (2016), ratio agudo:crónico
Evidencia: debatida → solo aviso, no bloqueo
Configurable: sí]]>
Bibliografía base. Citada de memoria, sin buscador: verifica títulos, ediciones en castellano y años antes de usarla.
Obra
Qué aporta a la app
House, Johnston y Jornet, Training for the Uphill Athlete (2019)
Déficit aeróbico, test de deriva, fuerza específica de montaña, progresión de volumen
House y Johnston, Training for the New Alpinism (2014)
Alpinismo: horas a baja intensidad, fuerza, paso a específico
Seiler, trabajos sobre distribución de intensidad (~2010)
Proporción de tiempo por zonas
Friel, métodos de umbral
Test de 30' y cálculo de zonas
Burke, Jeukendrup y guías ACSM
Carbohidratos periodizados y g/h en esfuerzo
Foster (1998)
Monotonía y strain
Banister, modelo impulso-respuesta
Fitness-fatiga
Si tu Manual de entrenamiento para atletas de montaña es una obra distinta de las anteriores, se añade como fuente principal.
Derechos de autor: la app traduce principios a reglas redactadas por ti; no reproduce texto, tablas ni planes de los libros. Para un producto es imprescindible.
## Modelo de datos
Todas las tablas llevan user_id con aislamiento por fila desde el primer día, para que pasar a multiusuario no exija migraciones.
Entidad
Campos clave
User
Perfil, peso de referencia, preferencias
ZoneSet
Fecha de validez, FC umbral, método (test o estimación), límites de zona
Activity
Fuente e id externo, fecha, tipo, duración, distancia, D+, D−, FC media/máx, carga, carga excéntrica, RPE, material, ruta
PlannedWorkout
Fecha, tipo, objetivo fisiológico, estructura, premisas, ruta sugerida, origen (app/intervals)
Block
Fase, fechas, posición en ciclo 3:1, objetivo del bloque
Goal
Prioridad A/B/C, fecha, perfil (distancia, D+, D−, altitud), tiempo objetivo, material obligatorio
Benchmark / BenchmarkResult
Protocolo; fecha, métricas, condiciones (temperatura, sueño, forma)
Wellness
Fecha, sueño, HRV, FC reposo, dolor muscular, sensaciones
NutritionPlan / IntakeLog
Carbohidratos y proteína objetivo; g/h en esfuerzo, tolerancia digestiva, tasa de sudor
Gear / GearUsage
Categoría, fecha de compra y fabricación, vida útil, km y horas acumuladas
Route
GPX, métricas de pendiente, subida continua, firme, etiquetas
Rule / RuleEvaluation
Condición, acción, fuente, evidencia; resultado y fecha de cada evaluación
SeasonContract
Objetivo, motivo, compromisos; revisiones semanales
## Stack y hoja de ruta
Empieza por una web instalable en el móvil (PWA) sobre Supabase; la app nativa solo si en uso real hace falta. Construcción con Claude Code; Cowork para especificación, investigación y documentación.
Stack propuesto: Next.js + PWA; Supabase (Postgres, autenticación, aislamiento por fila, tareas programadas); Vercel para despliegue; Claude API para resúmenes y preguntas; MapLibre/Mapbox y Open-Meteo para rutas. Expo/React Native en una fase posterior si se necesita nativo.
Versión 1 — en uso diario en 2 semanas. Solo lo que intervals.icu no te da:
- 
Hoy: sesión programada desde la app (enviada al reloj vía intervals.icu) con objetivo, premisas y carbohidratos del día según tipo y duración.
- 
Versiones de mí: subida al Xalo detectada automáticamente por GPS, con tiempo, VAM y FC media, y gráfica fantasma frente a las anteriores.
- 
Carga excéntrica semanal: metros de bajada ponderados por pendiente, con aviso si supera en más de ~10–15 % la media de 4 semanas.
- 
Cimientos: user_id + RLS en todas las tablas y zonas con fecha de validez.
- 
Generar la API key de intervals.icu y conectar COROS directo
- 
Pedir el archivo histórico de Strava
- 
Comprobado: los entrenamientos planificados en intervals.icu llegan al reloj
- 
Hacer el test de umbral para la primera versión de zonas
- 
Repo + Supabase + Vercel, y añadir la web a la pantalla de inicio del móvil
Criterio de éxito: la abres cada mañana durante 2 semanas. Lo que eches en falta decide la v2.
Fase 2: según lo que eches en falta en la v1; candidatos: revisión semanal con resumen IA, resto de benchmarks, nutrición en esfuerzo y tasa de sudor, motor de reglas completo e integración con TrainingPeaks si hay acceso.
Fase 3: objetivos con periodización inversa, simulador de prueba y avituallamiento.
Fase 4: material y rutas con recomendador.
Fase 5 — Producto: onboarding multiusuario, pagos, cumplimiento RGPD (los datos de salud son categoría especial) y acuerdos comerciales con las APIs.
## Prompt de arranque para Claude Code
Pega este prompt junto con el documento exportado en Markdown al empezar la Fase 1.