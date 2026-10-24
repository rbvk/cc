# RV Command Center V9 — Roadmap / Diseño aprobado

**Estado:** ESPECIFICACIÓN PARA V9, NO IMPLEMENTADO. V8 se conserva en producción hasta validación.  
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

