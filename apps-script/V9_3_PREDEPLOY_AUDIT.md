# RV Command Center V9.3 — Auditoría predespliegue

**Fecha del examen:** 2026-10-25 (America/Santiago).  
**Alcance:** fuente GitHub `rbvk/cc` en `main`, manifiesto Apps Script, Web App privada, indicadores esenciales, reconciliaciones, captación, Arica, UI y tests automáticos.  
**Veredicto:** **NO PUBLICAR SIN VALIDACIÓN FINAL**. Este examen no tuvo acceso a sesión propietaria y screenshots del `/exec` real. Los checks de CI son sintéticos, no verificación de producción.

## Hallazgos bloqueantes (P1, alto impacto)

### P1-A — Semántica y conciliación con cuatro fuentes reales
- La fidelidad de clases completadas, sesiones PSICOPRO semanales y subtotal mensual depende de texto, fechas, pestañas y estado real de ejecución.
- Código: `readTraining_`, `rv9ClinicalWeekly_`, `readClinical_`, `readFinance_` en `Code.gs`; `rv9Extra_` en `V9_Intelligence.gs`.
- Las pruebas sintéticas demuestran casos puntuales, pero **no validan la instalación real ni las diferencias por semana y mes**.
- Aceptación: abrir cada KPI, cotejar valores actuales y 2 ventanas anteriores con filas de las hojas; conservar unidades, período y enlaces directos. Si falta fuente, mostrar «No verificado», no 0.

### P1-B — Fuente disponible ≠ fuente fresca
- `sourceHealth_` mide lectura y disponibilidad de pestañas, no el instante real de última modificación del archivo de Drive. `getV9Dashboard` muestra hora de cálculo aunque algunos datos podrían ser antiguos.
- Aceptación: distinguir hora de consulta de fecha del dato; un estado de fuente leída no debe presentarse como «actualizada» sin evidencia temporal. Definir anomalía de período vigente y difundir advertencias en tarjetas afectadas.

### P1-C — Integraciones Arica y licencias
- `V9_Local.gs` consulta bajo demanda **seis endpoints** usando `UrlFetchApp.fetchAll`: tres modelos Open-Meteo, CSN y dos índices Google News.
- SENAPRED y noticias marítimas son publicaciones *indexadas*, no certificados de alertas vigentes. Open-Meteo es pronóstico/modelo, no estación oficial.
- El plan gratuito de Open-Meteo restringe uso **comercial**; antes de activarlo en una web para negocio debe obtenerse autorización/licencia apropiada o retirarse el proveedor de la app.
- Aceptación: mantener no-apto-para-alarmas, fecha individual del dato y fallbacks; verificar tolerancia a fallo de una de las seis peticiones sin perder todas.

### P1-D — Aceptación real privada y permisos
- `appsscript.json` requiere `webapp.access=MYSELF`, `executeAs=USER_DEPLOYING` y scopes `spreadsheets.readonly`, `calendar.readonly`, `script.external_request` por consulta manual de Arica.
- CI no verifica contenido renderizado en una sesión autenticada ni la versión `/exec`. No sustituye prueba de editor `/dev` y publicación nueva `/exec`.
- Aceptación: en el proyecto del propietario, probar carga, pestañas, gráficos, capturas y fuentes; comprobar acceso denegado con otra cuenta. Confirmar que los cuatro Sheet IDs solo viven en Script Properties.

## Incidencias no bloqueantes y mejora (P2)

### P2-A — Refresco de pestaña inactiva
- `Index.html` llama `setInterval(refresh,5*60*1000)` incluso cuando la pestaña está oculta.
- Recomendación: refrescar solo cuando `!document.hidden`, permitiendo actualización manual y al recuperar foco; reducir cuotas y carga de Sheets/Calendar.

### P2-B — Duplicación de lectura
- `getV9Dashboard` lee Matrix, MTS, PSICOPRO, Finanzas y Calendar; `getV9Extended` vuelve a leer partes de Matrix y PSICOPRO.
- Recomendación: consolidar o cachear selectivamente cuando se observe latencia, con invalidación corta y marca de antigüedad. No rediseñar la arquitectura antes de medir.

### P2-C — Versionado discordante
- El servidor y el registro de release se marcaron como `9.3.0`; la constante de cliente en `Index.html` conserva un valor anterior. **No asumir que el rótulo mostrado identifica siempre el código implantado**.
- Recomendación: declarar la versión solo desde el bootstrap del servidor, cotejar SHA/release esperado y probar en `/dev` y `/exec`.

### P2-D — Charts y fotografía
- Radar de 15 ejes, barras de progreso, gráficos clínicos y fotografías externas dependen de navegador/móvil/tamaños y host de imágenes. En CI se comprueba sintaxis/fixture, no legibilidad real, clipping, navegación por teclado ni fallas de proveedores.
- Aceptación: captura y revisión a ancho desktop y móvil, paisaje/retrato, sin datos de pacientes; mostrar placeholders accesibles y metadatos de fuente.

### P2-E — Gobernanza de almacenamientos propios
- Consultas agregadas, pendientes e hipótesis se almacenan en Script Properties con límites por mes y lectura acotada a seis meses. Los registros anteriores no se borran automáticamente.
- Aceptación: política de retención explícita o archivo únicamente de estadísticas anónimas si resulta indispensable; no crear una quinta Sheet ni duplicar PSICOPRO.

### P2-F — Proyección económica y metas MTS
- La comisión clínica por defecto del simulador es 40% si la propiedad no existe; validar porcentaje real antes de citar ingresos potenciales.
- Las barras basadas en cargas y metas no sustituyen las restricciones DRG, dolor, reconstrucción técnica y jerarquía de boxeo.

## Módulos nuevos recomendados (sin páginas adicionales por defecto)

1. **Centro de confianza / Integridad** (P1): añadir a Inteligencia un estado de calidad por fuente, «última fecha del dato», diferencias con la fecha del panel y un test de coherencia por dominio. Mostrar solo incidencias relevantes.
2. **Discrepancias por resolver** (P1): integrar en la auditoría la distinción NUEVA/PERSISTENTE/RESUELTA/NO VERIFICABLE por hash de incidencia y enlazar a cada celda. Un incidente es RESUELTO únicamente cuando la siguiente comparación deja de detectarlo. No mantener estados manuales paralelos.
3. **Revisión semanal de decisiones** (P2, opcional): usar la evidencia ya calculada para mostrar no más de tres acciones: clínica, entrenamiento, finanzas/proyectos. Nada de nuevas hojas, CRM ni capturas adicionales.
4. **Prueba de salud de despliegue** (P1): incluir un chequeo bajo demanda en Inteligencia: versión ejecutada, accesibilidad de las fuentes, duración de lectura, fallos de permiso y estado de Arica. No incluir datos personales ni identificadores de las hojas.

## No añadir

- Nuevos CRMs/etiquetas manuales duplicadas a WhatsApp Business.
- Nuevas hojas para reescribir datos ya presentes en PSICOPRO, Matrix, MTS o Finanzas.
- Un sistema de reservas adicional o nuevas alertas inferidas desde publicaciones antiguas.
- Nuevas pestañas de fotografías o elementos decorativos sin función.

## Checklist de liberación verificable

- [ ] El último workflow CI sobre el SHA final está en verde y la versión de cliente/servidor coincide.
- [ ] `/dev` abre Hoy, Oportunidades, Arica, Inteligencia y Auditoría sin excepciones de consola.
- [ ] En `/dev` se cotejan boxeo (sesiones completadas), PSICOPRO semanal y mensual, DRG y finanzas con celdas reales.
- [ ] Las alertas de incoherencias muestran fechas, categoría, gravedad, enlaces correctos y comportamiento seguro cuando una fuente falla.
- [ ] No se presentan como «reales» datos con período antiguo, predicciones, marcadores de asistencia no verificados o alertas indexadas.
- [ ] Radar y metas MTS se leen en móvil y desktop; imágenes no parecen cámara en vivo ni son presentadas como consultorio propio.
- [ ] Permisos limitados, consentimiento correspondiente, y nueva licencia/uso no comercial compatible para Open-Meteo.
- [ ] `/exec` privado corresponde a la misma versión probada; una cuenta diferente no puede abrir datos.
- [ ] Registrar el SHA y la versión desplegada; conservar rollback por historial de Git.

**Conclusión operativa: TEST.** No añadir más funciones hasta cerrar P1-A, P1-C y P1-D; congelar V9.3 una vez comprobadas.
