# RV Command Center V9 — Roadmap / Diseño aprobado

**Estado actualizado 24-10-2026:** V9 IMPLEMENTADO EN CÓDIGO Y PRUEBAS de GitHub; Web App privada todavía NO desplegada en el proyecto Apps Script del propietario. V8 sigue disponible mediante ?view=v8 una vez se carguen los nuevos archivos.  
**Fecha de diseño:** 24-10-2026. **Zona horaria:** America/Santiago.  
**Propósito:** ampliar las capacidades del usuario mediante decisiones con evidencia, oportunidades verificables y ejecución supervisada, no simplemente añadir más contadores.

## 1. Visión y cuatro motores

1. **Memory Engine / External Brain:** captura rápida por texto o dictado de ideas, tareas, compromisos, proyectos y oportunidades que el usuario hoy recuerda mentalmente. Sin formularios obligatorios, fechas ni categorías al capturar. Normaliza entrada en próxima acción, duración estimada, dependencias, criterio de finalización y nivel de confianza; conserva los originales y permite borrar/corregir. "Finish Something Today" ordena tareas terminables por tiempo realmente libre, preparación, energía y objetivos. No inventar proyectos ni tareas.
2. **Opportunity Engine:** detectar oportunidades de ingresos clínicos, SEO, investigación, BOXINGCI, mejoras web, ahorro de tiempo y brechas de progreso utilizando fuentes autorizadas. Cada oportunidad indica evidencia, beneficio probable, coste de oportunidad, riesgos, restricciones y alternativa de no actuar.
3. **Decision Engine:** compara escenario actual versus 2–3 alternativas; respeta DRG, sueño, descansos, bloques protegidos, Calendar, PSICOPRO y objetivos. Diferencia hechos, supuestos, proyecciones y simulaciones; calcula sensibilidad y evita probabilidades inventadas.
4. **Execution Engine:** prepara cambios para revisión humana; ejecución solo después de autorización, registro de cambios y reversión cuando sea viable. Ninguna modificación clínica ni calendario de terceros se hace automáticamente.

**Modo de uso:** Capturar una vez -> interpretar -> proponer -> aprobar -> ejecutar -> verificar resultado.  
**Visibilidad:** Command (top 3), Intelligence (dominios), Opportunity (escenarios). Sin dashboard saturado.

## 2. Rodolfo Daily Intelligence

Panel diario con próximos tres compromisos, espacios utilizables de 20/45/90 minutos (no todo hueco es disponible), desplazamientos necesarios con origen y destino conocidos, indicadores de carga/DRG/sueño, horas clínicas realizadas, ingreso neto verificable, distancia a meta financiera, consultas nuevas, primeras atenciones, continuidad clínica, enfoque técnico del boxeo, KPI de fuerza, cardio ejecutado, sueño real Zz:, interferencia por emergencias/guardias si hay registro, ventanas para tesis, entregables Docs, progreso GitHub, capital en BOXINGCI, tareas concretas para terminar hoy y compromisos sin avance.

**Funciones adicionales:** Energy-aware scheduler sin sustituir DRG, time opportunity detector, next action generator, dependency unlocker, commitment pruner, goal trajectory con incertidumbre, project completion engine, blind-spot detector, opportunity experiments y decision calibration log (predicción, confianza, evidencia, criterio de fallo, resultado).

Regla: mostrar solamente datos que puedan cambiar una decisión.

## 3. Datos existentes y posibles nuevas fuentes

- Matrix: semanas, Zz real, Boxing roadmap, MONTH KPI, Bodyfat, Weight Tracker y metas. Verificar antigüedad y calidad; no tomar una meta histórica como vigente.
- MTS Execution Log: Daily log, drg; ejecución/adherencia por dominio y safety gating. No sumar filas de ejercicio como sesiones.
- RODOLFO.PSICOPRO: atenciones efectivamente mantenidas en agenda, Objetivos/Paciente, Servicios. Contrastar metas potencialmente distintas de 15 (PSICOPRO) versus 12/13 en Plan 6 meses antes de cambiar ninguna.
- Finanzas: Pre Oct, Plan 6 meses, presupuesto e ingresos netos, BOXINGCI Merch (costo, precio, stock, ventas). No mezclar cifras proyectadas con pagos conciliados.
- Google Calendar + Gmail (solo acciones/plazos), Google Docs/Drive para entregables, GitHub para trabajo verificado.
- Search Console, Business Profile Performance, Carrd analytics: oportunidad SEO/captación, pendientes de acceso y permisos. No dar por conectados.
- Otros datos solo si tienen fuente real y valor decisional. Evitar duplicación entre las cuatro hojas.

## 4. Captación mínima por WhatsApp Business: DECISIÓN CERRADA

- El usuario usa WhatsApp Business, pero **no utiliza etiquetas consistentemente**; no basar captación en etiquetas ni requerirlas.
- **Un toque "Nueva consulta"** en V9: fecha/hora automática, canal WhatsApp, origen opcional (Maps, Search, web, Instagram, recomendación, desconocido), contador semanal/mensual. No CRM adicional.
- **No guardar** nombres, teléfonos, textos, motivos clínicos ni diagnósticos en analytics. Captar una vez por consulta nueva real, sin contar cada mensaje.
- Primeras atenciones reales: extraer PSICOPRO solo cuando se distinga fiablemente primera atención. Si hace falta marcador `🆕` único, pedir aprobación antes de cambiar la hoja.
- **Medición mínima aceptada:** consultas nuevas y primeras atenciones por período y tendencia separada. No afirmar conversión individual ni por canal sin enlace de cohorte verificable; el usuario ha rechazado la arquitectura precisa con identificador individual para V9.
- No integrar Meta Cloud API ni leer automáticamente chats en v9 por defecto. No pedir uso consistente de etiquetas.
- Cualquier dato de ingresos atribuidos por canal debe indicarse como desconocido salvo fuente que lo demuestre.

## 5. Nuevo módulo Arica Live Intelligence (SOLICITADO)

**Objetivo:** añadir información local y visual de Arica que sea útil cada día: hora, meteorología, viento, UV, calidad del aire, webcams públicas, alertas, litoral, sismos, eventos locales y logística de desplazamientos.

### 5.1 Datos y fuentes verificables

| Bloque | Fuente / URL | Tipo | Decisión |
|---|---|---|---|
| Hora y fecha de Arica | Intl.DateTimeFormat timezone America/Santiago | reloj local en navegador (segundo a segundo) | horario y preparación |
| Temperatura, viento, humedad | DMC Chacalluta estación 180005: https://climatologia.meteochile.gob.cl/application/diariob/visorDeDatosEma/180005 | observación con hora de medición; estación fuera del centro (Chacalluta) | salir, actividades exteriores, equipamiento |
| Pronóstico + sensación/UV/viento | https://open-meteo.com/en/docs ; alternativa DMC https://www.meteochile.gob.cl | modelo meteorológico, actualizar ~15 min, marcar predicción | clima de próximas horas |
| UV urbano | DMC Arica UTA 180016: https://climatologia.meteochile.gob.cl/application/informacion/fichaDeEstacion/180016 y API pronóstico | verificar que existe actualización efectiva antes de etiquetar live | exposición solar |
| Aire MP2,5 | SINCA Arica https://sinca.mma.gob.cl/index.php/estacion/index/key/F01 | estación pública online declarada, pero último registro observado 10-09-2026; si no está fresco, mostrar desactualizado | actividad exterior |
| Alertas oficiales | SENAPRED https://senapred.cl/alertas/ y DMC | avisos vigentes con vigencia/fecha | tomar precauciones; no reemplaza notificación oficial |
| Sismos | CSN https://www.csn.uchile.cl/ | eventos publicados, hora UTC/local, latencia y magnitud | contexto de monitoreo, no predicción sísmica |
| Litoral, marejadas | Armada/Servicio Meteorológico https://meteoarmada.directemar.cl/ ; SHOA como autoridad | aviso y vigencia verificadas, no confundir pronóstico de oleaje con habilitación de baño | seguridad playa |
| Agenda local | Municipalidad https://muniarica.cl/eventos | eventos públicos con fecha, comprobar actualización | oportunidades culturales y logística |
| Tránsito y llegada | Calendar + Waze (enlace contextual) | ruta en servicio externo; sin inventar ETA o acceso API | salida a tiempo |

### 5.2 Cámaras y fotos: estados investigados el 24/10/2026

**Regla innegociable:** una página rotulada "LIVE" NO demuestra streaming actual. Mostrar `EN VIVO` solo si hay reproducción verificable + tiempo reciente. Si es frame, marcar "imagen capturada" + timestamp. Si no hay vídeo o imágenes recientes, marcar "sin transmisión verificada".

- **Ubiavis / Humedal Río Lluta** https://www.ubiavis.cl/ : sitio ofrece acceso público anunciado como cámara live, pero reproducción efectiva y autorización de incrustación no comprobadas. Puede aparecer como "ver transmisión en proveedor".
- **DGAC Chacalluta Norte/S-Oeste** https://aipchile.dgac.gob.cl/camara_ubicacion/show/designador/SCAR : dos cámaras listadas como activas con fotografías fechadas; son **imágenes periódicas**, no video streaming. Marca de tiempo visible de días anteriores; controlar frescura y no calificarlas como tiempo real.
- **SkylineWebcams costa rocosa Arica** https://www.skylinewebcams.com/es/webcam/chile/arica-and-parinacota-region/arica/arica.html : aparece OFFLINE; no mostrar como activo.
- **Vision-Environnement / Isla Alacrán / El Buey** https://www.vision-environnement.com/es/webcam/chile/arica-et-parinacota/5376-arica-plage-de-isla-alacran/ y https://www.vision-environnement.com/es/webcam/chile/arica-et-parinacota/5370-arica-plage-de-el-buey/ : fichas anuncian LIVE, pero últimas imágenes reportadas del 18/10/2026; no tratar como live hasta verificar frames nuevos, zona horaria y permisos.
- **CCTV municipal (Morro, Chinchorro, Capitán Ávalos)** https://muniarica.cl/seguridad/innovacion-comunitaria : hay sistema municipal centralizado, **NO** se verificó portal autorizado de señales públicas. No intentar descubrir o incorporar streams internos ni indexadores de cámaras no autorizadas.

**Diseño sugerido de tarjeta de cámara:** foto/fotograma o reproductor solo si el propietario permite embed y la señal está verificada, rótulo "en vivo" / "imagen reciente" / "offline", última captura, propietario y botón «Abrir fuente». Fallback con enlace, sin placeholder que simule imagen real. Evitar almacenado continuo de CCTV, reconocimiento facial, identificación de personas, y acceso no autorizado.

### 5.3 Arica local contextual

- Vista principal: hora local + clima observado + viento + UV/protección solar + evento meteorológico relevante (si existe). Zona primaria: Arica/Chinchorro; observación Chacalluta advertir que está distante.
- Panel «Ver Arica»: cámaras permitidas en directorio, fotos de aeropuerto con marca de hora, marejadas y alertas.
- Alertas emergencias oficiales diferenciadas de noticias, caducadas = ocultas o etiquetadas caducas; **no** reemplazar canales oficiales SENAPRED/SHOA/Armada.
- Añadir «calidad de señal» de todas las fuentes: dato, proveedor, instante medido, instante consultado, latencia, estado (actual/desactualizado/no disponible), zona horaria. Nunca sustituir con cero.

## 6. Implementación por fases (NO INICIADA)

1. **V9.0 Foundation:** quick capture + inbox privado + captura mínima WhatsApp + reloj local + clima oficial/pronóstico, con caché y timestamps.
2. **V9.1 Intelligence:** panel diario contextual y objetivos, tendencias, fuentes climáticas oficiales, directorio cámaras validadas y estado de las fuentes.
3. **V9.2 Opportunity:** detección de oportunidades, comparador escenario actual/alternativas, Finish Something Today, contexto Arica para desplazamientos y clima.
4. **V9.3 Execution (solo previa autorización):** acciones propuestas, vista previa, confirmación y verificación/rollback; nunca edición clínica automática.

**Criterios de éxito:** menos trabajo manual, cero duplicación clínica, ninguna cámara falsa etiquetada live, cero pronósticos tratados como mediciones, una oportunidad accionable y medible por día cuando realmente existe, y pruebas con datos sintéticos.  
**Protección de V8:** no alterar el código existente ni implementación de Apps Script por crear esta hoja de ruta.  
**Verificación:** revisar disponibilidad de webcams, permisos de iframe/stream, políticas de fuentes y credenciales antes de implementar.

## 7. Diseño de interfaz, lectura y sistema visual — propuesta V9

**Estado: propuesta de diseño registrada, V8 no se modifica.** La prioridad es legibilidad móvil, velocidad de decisión y densidad informativa adaptativa; nunca añadir emojis como decoración.

### 7.1 Identidad visual y estructura
- Identidad: **RV Command Center** sobria, profesional, oscura con acentos azul hielo/cian, fondo grafito. Variante clara si el usuario lo solicita. El color se reserva para estados o acciones, no para decorar cada tarjeta.
- Pantalla de iPhone diseñada primero (mobile-first); desktop expande paneles laterales sin duplicar tarjetas.
- Navegación primaria móvil propuesta: **Hoy · Oportunidades · Arica · Inteligencia**. Acción flotante global **+ Capturar** para ideas, compromisos y consultas nuevas; requiere menú contextual para evitar confundir acciones. Áreas por dominio (Clínica, MTS, Finanzas, Tesis, Proyectos) dentro de Inteligencia.
- Home «Hoy»: fecha/hora de Arica, solo próxima decisión, próxima cita con distancia temporal, 2–3 indicadores de máxima relevancia, ventana libre real, tarea terminable y una tarjeta breve Arica Live. Evitar muro de 20 KPIs.
- Usar *progressive disclosure*: tarjeta resumida -> detalles y evidencia -> enlace a la fuente -> acción revisable. Filtros `Hoy / 7 días / Mes` con unidades visibles; no mezclar horizontes en el mismo número.

### 7.2 Tipografía y accesibilidad
- Texto base 17–18 px móvil, encabezados de tarjeta 21–24 px, títulos de sección 25–30 px, KPIs 34–42 px; secundaria y pie no por debajo de 13–14 px.
- Line-height 1,45–1,6; textos en 2–3 líneas como máximo en tarjetas plegadas, con acción clara para expandir; anchos y separación suficientes.
- Contraste WCAG AA, foco visible, etiquetas accesibles, navegación por teclado, preferencia por movimiento reducido, tamaños dinámicos y control de zoom del navegador.
- Botones/filas táctiles de al menos 44×44 CSS px; acciones importantes separadas para prevenir pulsaciones accidentales. Tipografía numérica tabular para CLP, horas y KPIs.
- No mostrar solo un número: formato `12,5 h de boxeo esta semana`, `8/15 pacientes`, `+CLP 54.000 vs presupuesto`. Unidades, período y nivel de certeza siempre visibles.

### 7.3 Emojis semánticos (máximo uno por título de dominio)
- 📅 Agenda; 🏥 Clínica; 🥊 Boxeo; 🏋️ Fuerza; 🫀 Cardio; 💤 Sueño; 💰 Finanzas; 📈 Captación/SEO; 🎓 Tesis; 🚒 Bomberos; 💻 Proyectos; 🌆 Arica Live; ⚡ Mejor oportunidad; 🧠 Captura/ideas.
- Una sola aparición del emoji por tarjeta: evitar repetirlo en encabezado, número y botón simultáneamente.
- Estados por **texto e icono**: `✅ Al día`, `⚠️ Revisar`, `⛔ Crítico`, `○ Sin dato`. Colores no deben transmitir significado sin texto. No abusar de rojo/amarillo.
- «EN VIVO» solo para video confirmado; `Imagen · hace 12 min`, `Sin señal`, `Dato desactualizado` para otros casos. No usar un punto verde si no se verificó la señal.

### 7.4 Patrones útiles de lectura
1. **Línea de tiempo del día** en lugar de nueve eventos independientes; indicador «ahora», tiempo hasta siguiente evento y ventanas libres reales.
2. **KPI con contexto:** valor grande, comparación relevante, horizonte, fuente y hora de actualización. La variación precisa más importante que un gráfico decorativo.
3. **Alertas agrupadas** por decisión, prioridad y tipo; enlazar la celda concreta. Evitar duplicados entre Home, Inteligencia y notificaciones.
4. **Más detalles bajo demanda**: título breve, evidencia, origen, incertidumbre y «Ver en fuente»; información personal/clinica en panel privado y solo cuando sea pertinente.
5. **Tarjeta Arica Live** compacta: hora, temperatura, viento/UV, estado de alertas y fotografía verificada con fecha de captura; la galería completa vive en sección Arica.
6. **Tarjeta Opportunity Engine**: `Oportunidad -> impacto -> tiempo -> riesgo -> acción`, comparador `actual vs propuesta` con consentimiento antes de ejecutar.
7. **Captura rápida**: entrada única, aceptar voz por dictado del teclado, reconocimiento de duplicados antes de registrar, sin 12 campos obligatorios.
8. **Modos de densidad:** `Compacto` para revisión en 15 segundos, `Detallado` para auditoría. Preferencia local no sensible.

### 7.5 Estados y degradación segura
- Cada tarjeta admite `Cargando / Actual / Desactualizado / No disponible / Requiere conexión`; conservar último dato conocido **solo** con fecha claramente visible y sin hacerlo pasar por actual.
- No rellenar la pantalla de rayas `—` sin causa; mostrar razón y única acción de recuperación.
- No publicar fuentes clínicas ni credenciales en GitHub Pages; UI privada en Apps Script con acceso propietario.
- Validación de diseño: pruebas móviles de 320–430 px, iPhone Safari, fuente ampliada 200 %, teclado, alto contraste, carga progresiva y enlaces a rango. Medir si se identifican las 3 decisiones del día en menos de 15 s sin recorrer toda la página.

### 7.6 Orden recomendado antes de implementación
1. Definir **componentes** (tarjeta KPI, línea de tiempo, alerta, oportunidad, webcam con frescura, lista de tareas) y jerarquía.
2. Construir una vista conceptual `Hoy` estática con datos sintéticos y probar legibilidad en iPhone.
3. Elegir el modelo de navegación definitivo, luego aplicar a V9; mantener intacto el HTML de V8.
4. Validar usuarios y accesibilidad antes de introducir animaciones, gráficos complejos o nuevas paletas.

## 8. Biblioteca fotográfica con licencias y uso profesional — APROBADA PARA DISEÑO V9

**Meta cuantitativa: 29 fotografías distintas identificadas; 11 de Arica en Wikimedia Commons y 18 temáticas en Pexels.** Inventario verificable: [V9_PHOTO_CATALOG.json](V9_PHOTO_CATALOG.json). Las fuentes son **páginas de obras concretas** (no términos de búsqueda genéricos); cada registro indica autor, licencia, enlace, texto alternativo, área, función y formato.

**Estado real del trabajo:** catálogo y política de uso seleccionados para V9. **Ningún archivo binario fue descargado ni se ha insertado una fotografía en V8 o en la Web App**. En la fase de implementación, descargar, optimizar, integrar, comprobar derechos y probar cada imagen. No afirmar que las 29 están ya visibles en producción.

### 8.1 Distribución editorial, no decoración
- **Inicio «Hoy»: máximo 1–2 fotografías** (una tarjeta Arica Live opcional y una oportunidad contextual si es relevante). Priorizar información, títulos, KPIs y botones; jamás un fondo fotográfico detrás de datos clínicos o cifras.
- **Arica Live:** 11 fotografías locales con evidencias de lugar como Morro, centro, Plaza Colón, Aduana, litoral, ferrocarril y Chinchorro. Galería accesible desde una sola tarjeta, no mosaico permanente. Fotografías de archivo etiquetadas **«Foto de archivo»**, nunca **«EN VIVO»**.
- **Inteligencia clínica:** 3 fotografías de espacios vacíos ilustrativos, sin pacientes ni confusión con imágenes reales de CasaPsicoPro.
- **Boxeo:** 4 fotografías contextuales sobre guantes, manoplas, sparring y material; nunca presentarlas como imágenes de entrenamientos del usuario o del inventario real de BOXINGCI.
- **Fuerza/cardio:** 2 fotografías contextuales; KPI real siempre proviene de MTS.
- **Tesis:** 2 fotografías de libros y estudio para entregables/progreso.
- **GitHub/proyectos:** 3 fotografías de desarrollo para proyectos y Finish Something Today.
- **Finanzas, sueño, bomberos y captura:** 1 fotografía de cada categoría.
- **Merchandising BOXINGCI:** usar solo fotos reales de productos del usuario; **no reemplazar con stock**.

### 8.2 Reglas jurídicas y de crédito
- **Pexels:** su licencia permite uso comercial gratuito y modificaciones sin atribución obligatoria; preferir crédito voluntario. No revender imágenes sin editar, insinuar respaldo de personas representadas ni convertir fotos de stock en identidad marcaria.
- **Wikimedia Commons:** cada archivo tiene licencia propia CC BY/CC BY-SA. Aplicar reconocimiento del autor, enlace a la obra y licencia, indicar modificaciones; observar el requisito ShareAlike en derivados.
- Registro permanente de fuente, autor, licencia, fecha de descarga, ruta local, modificaciones y URL de licencia. No reutilizar una foto por el solo hecho de aparecer en Google Images.
- No usar fotografías de terceros para aparentar imágenes actuales, instalaciones propias, pacientes reales, equipo de BOXINGCI real o material de cámaras públicas.
- Cumplir requisitos de privacidad/imagen de personas, especialmente si son identificables o el contexto se interpreta como clínico.

### 8.3 Reglas de diseño y rendimiento
- Recorte editorial `object-fit: cover` preservando sujeto y horizonte; 16:9 para hero local, 3:2 para galería, 4:3 para tarjetas y retrato 2:3 solo cuando aporta. No estirar fotos.
- Tratamiento cromático uniforme, contraste y espacio negativo; fotografía como **evidencia o contexto**, no como sustituto de gráficos de datos. Pies breves con crédito y fecha si son lugares que cambiaron.
- Al construir V9: descargar desde la fuente legal, servir versiones AVIF/WebP optimizadas, `srcset` 320/640/960, dimensiones explícitas, carga diferida fuera del primer viewport, fallback neutral y revisiones de accesibilidad con alt específico.
- Pesos orientativos: tarjetas <160–240 KB e imagen principal <350 KB, ajustable a calidad. No cargar las 29 en la portada. Vista «Arica» solo carga imágenes al abrir galería.
- Verificar que cada URL exacta y licencia sigue vigente, que el archivo visual tiene suficiente resolución y que no hay fotografías duplicadas/sobrepuestas antes de descargar o publicar. **El catálogo no sustituye esta comprobación final**.

**Criterio de aceptación V9:** 29 fotos distintas asignadas a secciones pertinentes, 100% con fuente/licencia/crédito verificables, 0 fotos de archivo tratadas como contenido en vivo, 0 binarios en el HTML principal, portada ligera, y 100% de imágenes con alt útil o marcadas decorativas si no aportan significado.


## 9. Estado real de entrega del código V9

- **Implementado en GitHub:** V9_Core.gs (captación, memoria, agenda potencial, tareas y log de predicciones), V9_Intelligence.gs (fuentes Arica, inventario, rendimiento, servicios, escenarios y oportunidades), V9.html (cuatro pantallas, captura, hipótesis y galería remota de 29 fotografías), test command-center-v9.mjs y release.json versión 2026.10.24.9.
- **Vista previa GitHub Pages:** preview-v9.html con datos ficticios, sin acceso a hojas, mensajes o cuentas privadas. La publicación Pages se prueba aparte de la app propietaria.
- **No desplegado automáticamente:** se deben cargar V9_Core.gs, V9_Intelligence.gs y V9.html además de Code.gs e Index.html en el Google Apps Script propietario, guardar appsscript.json, autorizar external_request y publicar nueva versión manteniendo acceso Solo yo.
- **Diferimientos comprobables:** la tasa exacta de conversión individual no existe por decisión de captación mínima; primeras atenciones solo con marcador explícito en PSICOPRO; CCTV municipal no es público; webcams no se etiquetan activas; Open-Meteo gratuita requiere revisar condiciones para usos comerciales; no se modifican Calendar ni Sheets automáticamente; integración de Gmail y contenido Docs requiere autorización y delimitación de fuentes; las 29 imágenes se solicitan a servidores de origen, no se descargan a binarios del repo.
- **Motor de ejecución supervisado realmente disponible:** cerrar/descartar pendientes en su almacén privado y abrir un borrador genérico de Calendar; el usuario guarda el evento en Google Calendar, no se escribe nada por detrás.
- **Calibración de decisiones:** el motor ahora registra hipótesis por mes con confianza explícita y su resultado; no transforma este porcentaje en una probabilidad estadística comprobada sin historial suficiente.

**Regla de cierre:** no declarar V9 operativo en /exec hasta verificar permisos, carga y flujo con fuentes reales en una instalación Google Apps Script autenticada.
