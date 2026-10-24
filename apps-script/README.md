# RV Command Center V9 — implementación privada y despliegue

**Estado:** V9 implementado y validado en GitHub. El enlace privado /exec de Google Apps Script **NO** se actualiza mediante commits; el propietario debe incorporar los nuevos archivos y publicar una nueva versión. No se debe confundir GitHub Pages (portal público) con el motor privado.

## Archivos que debes cargar en tu proyecto existente

1. Sustituir Code.gs por la última versión de [Code.gs](Code.gs). V8 se conserva como respuesta opcional con ?view=v8.
2. Mantener el archivo histórico HTML Index.html para que ?view=v8 siga funcionando.
3. Crear nuevo archivo de script con el nombre V9_Core y pegar [V9_Core.gs](V9_Core.gs).
4. Crear nuevo archivo de script con el nombre V9_Intelligence y pegar [V9_Intelligence.gs](V9_Intelligence.gs).
5. Crear archivo HTML llamado V9, pegando [V9.html](V9.html). No insertar las fotos en Github Pages.
6. Actualizar appsscript.json con [appsscript.json](appsscript.json), conservar las Script Properties con IDs de Matrix, MTS, PSICOPRO y Finanzas; añadir únicamente opciones explícitas deseadas.

**Activación:** en el editor Apps Script, guardar todos los archivos; ejecutar getV9Dashboard una vez para autorizar la nueva capacidad de solicitudes externas; luego **Implementar > Administrar implementaciones > Editar > Nueva versión > Implementar**. Mantener SIEMPRE Ejecutar como Yo y acceso Solo yo. La URL /exec será la misma. La lectura de Sheets y Calendar permanece bajo permisos de solo lectura, mientras que UrlFetchApp pide autorización external_request.

**Verificación:** abrir la URL /exec con tu cuenta, recorrer Hoy/Oportunidades/Arica/Inteligencia, usar un registro de prueba anónimo y deshacerlo, capturar una tarea sin datos personales y marcarla como terminada, comprobar que los KPI coincidan con la hoja, comprobar que todas las fotos carguen y que las no disponibles tengan fallback; usar ?view=v8 si aparece un error. Confirmar que una cuenta ajena no puede acceder a /exec.

## Implementaciones V9

- 🧠 **External Brain:** botón Capturar -> tarea anónima no clínica almacenada en Script Properties por mes, categorización y duración estimadas, detección de duplicado exacto, estado abrir/terminar/descartar; solo 6 meses recientes y límite de 28 entradas/mes para respetar 9KB por valor. No se exige hoja nueva.
- 📲 **Captación mínima:** clic de nueva consulta con origen opcional; contador agregado por día/semana/mes, botón deshacer durante cinco minutos; no se lee WhatsApp ni se guardan números o nombres. Sin conversión individual exacta.
- 🏥 **Primeras atenciones:** se cuentan ÚNICAMENTE los bloques completados que contengan marca explícita 🆕 o texto primera sesión/atención en PSICOPRO. Si no está estandarizada se muestra NO VERIFICADO, no 0. No se modifican hojas.
- ⏳ **Time Opportunity:** ventanas potenciales de Matrix + calendario predeterminado, con margen de 15 minutos por Calendar; las tareas capturadas de duración estimada compatible pueden proponerse para finalizar.
- ⚡ **Opportunity Engine:** reglas vinculadas a DRG ABORT, faltantes de cupos clínicos, sobrepresupuesto, entregables terminables, stock BOXINGCI, habilidades de boxeo y pendientes de registro MTS. Incertidumbres y origen explícitos.
- 🔬 **Decision Engine:** simulación de cupos clínicos por tarifa registrada en PSICOPRO y comisión 40% por defecto, ahorro presupuestario hipotético y tiempo de foco. NO hay escrituras de PSICOPRO/Calendar/Finanzas ni promesa de ingresos.
- 🎯 **Calibration Log:** guardar una hipótesis con confianza propia (5–95%), predicción, criterio de evaluación y resultado logrado/fallido/inconcluso. Agregado de éxito descriptivo solo tras cinco evaluaciones, interpretación de calibración solo después de diez. No significa causalidad ni éxito garantizado.
- 📅 **Execution Engine supervisado:** los pendientes capturados pueden generar borradores genéricos de bloques en Google Calendar; tú decides si guardar el evento. Marcar tareas terminadas/descartadas opera únicamente sobre el buzón privado, no sobre archivos clínicos.
- 📊 **Inteligencia nueva:** Boxing roadmap, MONTH KPI, Bodyfat, Plan 6 meses, BOXINGCI Merch, Servicios. Cifras sin marca de fecha vigente no se consideran medidas actuales.
- 🌆 **Arica Live:** reloj America/Santiago, pronóstico meteorológico Open-Meteo, modelo PM2.5, modelo marítimo, enlaces SENAPRED/CSN/DMC/SINCA/Armada y directorio webcams públicas con estado SIN VERIFICAR/OFFLINE o FOTOS FECHADAS. No se accede a CCTV municipal, ni se declara emisión EN VIVO sin comprobarla. Los modelos NO equivalen a observaciones oficiales.
- 📷 **29 fotografías referenciadas desde sus proveedores:** 11 Arica de Wikimedia Commons, 18 temáticas Pexels; están integradas en V9.html por URL remota, con carga diferida, texto alternativo, créditos y fallback. **No hay archivos fotográficos descargados en este repositorio** y algunas URLs podrían no cargar por políticas de hotlink/bloqueo. Fotografías de archivo no son webcams.
- 🛡️ **Seguridad:** Script Web App Solo yo; nunca llevar datos privados a GitHub Pages; sin acceso de escritura a Sheets o Calendar. GitHub Pages únicamente distribuye el portal. Los controles públicos nunca reciben datos del proyecto Apps Script.

### Configuración opcional
- CLINIC_COMMISSION_PCT: porcentaje comisión clínica (por defecto 40).
- RV9_GITHUB_REPOS: repositorios públicos separados por coma, bajo rbvk (por defecto rbvk/cc,rbvk/boxingCI).
- FINANCE_BUDGET_TAB: continúa siendo la pestaña de presupuesto vigente del sistema anterior.

### Restricciones y fuentes externas
- Open-Meteo publica su API gratuita **para uso no comercial**, y dispone de producto comercial. Antes de emplear datos meteorológicos como parte de un producto de negocio, verificar la licencia y pasar al endpoint comercial. Esta integración inicial está pensada para evaluar el panel privado.
- No se consulta automáticamente Gmail ni el contenido de documentos Drive para evitar scopes nuevos y uso de información sensible sin delimitación. Los repositorios GitHub aparecen como enlaces públicos, no como falsa verificación de entregables.
- No se obtienen automáticamente cámaras municipales ni eventos/sismos en un feed validado. Los enlaces a fuentes oficiales funcionan como acceso directo y las etiquetas informan la falta de verificación.
- La captura V9 es una memoria operativa, no un sistema de historias clínicas: no registrar pacientes, diagnósticos, contraseñas ni mensajes.
- La cifra de consultas nuevas es agregada y manual; no atribuible automáticamente a una atención individual.

### Pruebas
Ejecutar las tres suites sintéticas (sin nombres clínicos reales):
  node apps-script/tests/command-center-smoke.mjs
  node apps-script/tests/command-center-v8.mjs
  node apps-script/tests/command-center-v9.mjs

---

# RV Command Center V8 — documentación histórica de respaldo

**GitHub Pages (`cc.rodolfovalle.com`) publica únicamente el portal.** Los datos reales se procesan dentro de una Web App de Google Apps Script, desplegada por el propietario como **Execute as: Me / Who has access: Only myself**.

La sesión de Google permite acceder sin crear un OAuth Client ID ni autorizar cada apertura; la primera autorización del script sigue siendo necesaria. El navegador pasa a la URL segura `script.google.com/.../exec`. GitHub Pages no puede ofrecer el mismo análisis privado solo con una contraseña local.

## Controles implementados

| Control | Fuente 1 | Fuente 2 | Acción |
|---|---|---|---|
| 🥊 Entrenamientos planificados pero no agendados | MTS Execution Log, `Daily log` | MTS System Matrix, pestañas semanales | Comparar **fecha + dominio** (boxeo, gym, cardio). Excluir sesiones explícitamente canceladas. No declarar todo conforme si no hay plan MTS futuro |
| 🏥 Citas PSICOPRO no reflejadas en Matrix | PSICOPRO, agenda semanal | MTS System Matrix, misma semana | Comparar **fecha + hora**; diferenciar ausencias, posibles solapamientos y posibles discrepancias de identidad. Solo fechas/horas y recuentos en pantalla, no nombres |
| 🥊 DRG diario | MTS Execution Log, pestaña `drg` | Fecha local America/Santiago | Ver evaluación del día (puntuación, output, hard stop). **Nunca aplicar un ABORT histórico como señal de hoy** |
| 💰 Desviación presupuestaria | Hoja financiera, pestaña del mes | Total presupuesto (columna B) y gasto real (columna C) | Diferencia real - presupuesto, exceso en CLP y %. Marcar cifras de un mes anterior como desactualizadas |
| 🎯 Cupos semanales | PSICOPRO, `Objetivos/Paciente` | Meta de **15** | Comparar clasificados semanales contra la meta. Distinguir faltantes, objetivo y superávit |

Calendario adicional: muestra los eventos restantes del día con sus títulos **solo en la Web App privada** y comprueba la coordinación con Matrix.

**Limitaciones explícitas:** las celdas libres repetidas se identifican por su frecuencia. Las diferencias de paciente se determinan por coincidencias de tokens normalizados y pueden ser falsos positivos. Las alertas son **candidatos a revisar**, no modificaciones de agenda. Si falta un mesociclo o una pestaña, el estado debe ser "sin datos comparables", no "0 errores".

## RV Command Center v8 — ocho mejoras operativas

1. **Ir a la celda exacta del problema.** Los conflictos PSICOPRO/Matrix y las discrepancias con Calendar muestran enlaces directos a la celda (`#gid=…&range=…`) o al día de Calendar. Si Matrix contiene una actividad clínica ausente de PSICOPRO, el botón **Mostrar descripción de Matrix** solicita el texto por un RPC privado y solo al pulsarlo.
2. **Calendar vs Matrix, bidireccional.** Consulta eventos próximos con hora e identifica los ausentes en Matrix, posibles incompatibilidades de actividad y compromisos explícitos de Matrix que parecen requerir Calendar. No se considera error que falte la pestaña semanal: se señala como falta de cobertura. **No se duplican** los bloques clínicos rutinarios ya controlados por PSICOPRO.
3. **Historial mínimo.** Script Properties guarda únicamente códigos anónimos de alertas abiertas y resueltas; presenta nuevas, resueltas y persistentes durante 24 horas. La primera ejecución registra línea base. Si una fuente falla, **no** considera las alertas como resueltas.
4. **Salud de fuentes y versión.** Señala si existe Matrix de la semana, si MTS tiene plan próximo, si PSICOPRO tiene agenda, si la hoja financiera corresponde al mes y si Calendar responde. Compara la versión del motor e interfaz con el archivo público `release.json`. **No es un timestamp de edición de Drive**: no se necesita permiso Drive adicional.
5. **Adherencia MTS en siete días.** Calcula sesiones/exposiciones planificadas, completadas, omitidas y no verificadas, separadas en boxeo, gimnasio y cardio. Una sesión mixta puede contar en varios dominios; el porcentaje es **finalización confirmada** sobre lo programado, no rendimiento ni cumplimiento presumido.
6. **Sueño Zz de siete noches.** Agrupa el sueño real por noche, asignando la madrugada a la noche anterior; calcula promedio, noches bajo 7 h 30 y registros ausentes. Si existen suficientes pares, reporta coincidencias con DRG **sin inferir causalidad**.
7. **Proyección presupuestaria.** Con totales de mes actual conciliados y al menos cinco días transcurridos, estima gasto final con extrapolación lineal del gasto hasta la fecha. No predice pagos futuros ni reemplaza el presupuesto.
8. **Capacidad clínica.** Distingue pacientes semanales activos (meta 15), sesiones ya atendidas según PSICOPRO depurado, bloques de la agenda operativa y celdas marcadas explícitamente `Libre`. **Una hora libre no equivale a un cupo estable para un nuevo paciente.**

### Privacidad y activación de v8

- Google Apps Script debe continuar desplegado **Ejecutar como: Yo / Acceso: Solo yo**. La página de GitHub Pages no obtiene permisos sobre las hojas.
- Los textos de eventos del día se ven en el panel privado, pero no se guardan en el historial ni en GitHub. Las descripciones clínicas aparecen únicamente tras pulsar el botón de detalle.
- Los cambios de GitHub **no se trasladan automáticamente** a tu proyecto Apps Script. Reemplaza `Code.gs` e `Index.html` por las versiones de este repositorio y selecciona **Implementar > Administrar implementaciones > Editar > Nueva versión > Implementar**. Conserva el manifest y las Script Properties existentes.
- Comprueba los enlaces a celdas, que la cifra de sesiones atendidas coincida con PSICOPRO y que un usuario sin acceso no pueda abrir la Web App.
- La validación automática ejecuta `command-center-smoke.mjs` y `command-center-v8.mjs` con **datos sintéticos**.

## Configuración inicial única

1. Abre [script.google.com/home/projects/create](https://script.google.com/home/projects/create) con tu cuenta propietaria de Calendar y de las cuatro hojas.
2. En `Code.gs`, pega el contenido completo de [Code.gs](Code.gs).
3. Crea un archivo HTML llamado exactamente `Index` y pega [Index.html](Index.html).
4. En Project Settings, habilita el manifiesto. Pega el archivo [appsscript.json](appsscript.json). El manifiesto habilita el servicio avanzado Sheets (v4) y permisos estrictamente **solo lectura** a Calendar y Sheets.
5. En Project Settings → Script Properties, agrega estas variables:
   - `MATRIX_SHEET_ID`: tu hoja MTS System Matrix
   - `TRAINING_SHEET_ID`: tu hoja MTS Execution Log vigente
   - `CLINICAL_SHEET_ID`: tu hoja compartida RODOLFO.PSICOPRO
   - `FINANCE_SHEET_ID`: tu hoja financiera operativa y **actual**, con pestaña de presupuesto
   - `FINANCE_BUDGET_TAB` (opcional): pestaña de presupuesto, por defecto `Pre Oct`. Cambiar si el mes operativo se traslada a otra pestaña.
   
   Cada ID es el tramo de la URL entre `/d/` y `/edit`. No pongas IDs ni credenciales en el frontend público.
6. Guarda el script, ejecuta `getDashboard` en el editor una vez y acepta los permisos de lectura solicitados.
7. Deploy → New deployment → Web app → **Execute as: Me** y **Who has access: Only myself**. Copia la URL completa acabada en `/exec`.
8. En `cc.rodolfovalle.com`, pulsa **Configurar acceso** y guarda esa URL. Después usa **Entrar al panel privado**.

Los ID de archivos no otorgan acceso por sí mismos; únicamente los permisos existentes de Google permiten la lectura.

## Reglas de seguridad

- **Nunca** usar `Anyone` o `Anyone with Google account` cuando la Web App se ejecuta como el propietario.
- No mostrar nombres, RUT, notas, diagnósticos, títulos de eventos ni filas completas.
- No registrar contenidos privados en logs, commits, Analytics o un sitio estático.
- No guardar access tokens en `localStorage` ni en el repositorio.
- Probar en incógnito y desde otra cuenta: debe impedirse el acceso a la Web App.
- Comparar resultados agregados con los datos originales antes de tomar decisiones operativas importantes.

## Estado de despliegue

El motor, la interfaz privada y el manifiesto están preparados en GitHub; **aún deben copiarse, autorizarse y desplegarse desde una cuenta Google**. Las pruebas en esta conversación han usado lecturas de hojas por conector y ejecución del código con servicios simulados; no sustituyen una prueba dentro de Apps Script.

**Reconciliación bidireccional:** también identifica bloques clínicos de Matrix ausentes en PSICOPRO. La comparación cubre la misma semana y días laborales; cada diferencia se presenta solo con fecha y hora, como **candidato para revisar**, nunca como una reserva confirmada. El sistema no modifica ni copia pacientes entre hojas.

## Recomendaciones automáticas y confiabilidad

El motor entrega **hasta tres recomendaciones**, priorizadas por gravedad y distribuidas entre dominios para evitar que decenas de avisos clínicos oculten DRG o finanzas. Cada recomendación incluye evidencia, acción, estado «verificado» o «revisar», y un enlace a la fuente original. No se hacen cambios en las hojas automáticamente.

- **DRG ABORT / Hard Stop hoy:** prioridad máxima. No usar una evaluación histórica para bloquear la actividad actual.
- **PSICOPRO vs Matrix:** compara día/hora y, internamente, coincidencia aproximada del nombre. La comparación de identidad se realiza en el servidor; los detalles de una actividad exclusiva de Matrix se muestran solo bajo demanda en la Web App privada.
- **MTS vs Matrix:** solo evalúa modalidades con sesión activa planificada. Si no hay planificación, devuelve **sin plan**, no «cero faltantes». Informa la última fecha programada disponible.
- **Finanzas:** concilia el total con sus categorías. Muestra las tres mayores desviaciones por categoría y el importe gastado en partidas sin presupuesto asignado. Un presupuesto de otro mes se marca **desactualizado**.
- **PSICOPRO:** controla que la meta de `Objetivos/Paciente` sea exactamente **15**, distinguiendo **pacientes clasificados semanalmente** de bloques horarios de agenda. Si la fuente usa otro objetivo, el KPI queda pendiente de verificación.
- **Estado de las fuentes:** `5/5` indica que el cálculo de las cuatro fuentes produjo un estado utilizable, **no** que todos los registros sean recientes o correctos.

El dashboard refresca al abrirse y **cada cinco minutos mientras está abierto**. No envía correos, avisos push ni tareas en segundo plano cuando está cerrado. Una alerta externa recurrente requeriría un trigger de Apps Script y permisos adicionales, y conviene evitar duplicarla con otras revisiones nocturnas existentes.

### Cambios y despliegue

**Los commits de GitHub NO actualizan automáticamente la Web App privada de Apps Script.** Después de cambios en `apps-script/Code.gs` o `apps-script/Index.html`, copia las versiones nuevas en tu proyecto y utiliza **Deploy > Manage deployments > Edit > New version > Deploy**. La URL `/exec` puede mantenerse sin cambios. Antes de dar por válido el nuevo motor, prueba con otra cuenta que `Only myself` siga bloqueando el acceso.

La validación automatizada del código fuente está en `apps-script/tests/command-center-smoke.mjs` y se ejecuta al modificar los archivos de Apps Script, mediante `.github/workflows/validate-command-center.yml`. También puedes ejecutarla con:

```bash
node apps-script/tests/command-center-smoke.mjs
```

Usa exclusivamente datos de prueba inventados, no información personal ni de pacientes.
