# RV Command Center V9 · Aplicación privada única

**Versión activa en código:** `9.3.0` (revisión: sin consultas meteorológicas externas). Esta versión sustituye completamente la interfaz anterior. Git guarda el historial para recuperar cualquier commit: no se distribuyen paneles antiguos ni enlaces a versiones de respaldo.

## Arquitectura

- **Portal público:** `cc.rodolfovalle.com` (solo entrada, sin datos privados).
- **Web App privada:** proyecto Google Apps Script **RV-CCv9**, accesible exclusivamente al propietario, ejecutándose como su cuenta de Google.
- **Google Sheets + Calendar:** cuatro fuentes originales, todas **solo lectura**. Las consultas nuevas y las tareas se guardan únicamente como conteos anónimos y pendientes operativos dentro de Script Properties. No se crea otra hoja clínica.
- **Arica:** muestra hora local, temperatura, viento, UV, aire, oleaje modelados y publicaciones fechadas de SENAPRED/CSN. Consulta **solo al abrir Arica** mediante `V9_Local.gs`, con caché de 15 minutos; no hay sondeos periódicos. Los comunicados indexados no demuestran alertas vigentes.

## ✅ Reparación y actualización del proyecto YA EXISTENTE

**No crees un nuevo proyecto Apps Script.** Los ajustes y las Script Properties no se transfieren automáticamente entre proyectos. Trabaja sobre `RV-CCv9` y su implementación actual.

1. Abre en tu cuenta el proyecto **RV-CCv9** de Apps Script.
2. Copia el contenido de [Code.gs](Code.gs) en **Code.gs** (reemplazar).
3. Copia el contenido de [Index.html](Index.html) en **Index.html** (reemplazar). Esta es la **única** interfaz vigente.
4. Actualiza **V9_core.gs** (nombre en tu proyecto) con [V9_Core.gs](V9_Core.gs) del repositorio.
5. Actualiza **V9_Intelligence.gs** con [V9_Intelligence.gs](V9_Intelligence.gs) del repositorio.
5a. Crea **V9_Local.gs** copiando [V9_Local.gs](V9_Local.gs). **Obligatorio** para que Arica consulte condiciones y comunicados fechados.
6. **Elimina el antiguo archivo V9.html del proyecto Apps Script**, porque ahora la interfaz V9 vive en `Index.html`. No es necesario conservar archivos de interfaz duplicados.
7. Abre `appsscript.json` y verifica que coincida con [appsscript.json](appsscript.json): runtime **V8 de JavaScript**, servicio avanzado Google Sheets v4, scopes `spreadsheets.readonly`, `calendar.readonly` y `script.external_request` (solo Arica bajo demanda), webapp `MYSELF`/`USER_DEPLOYING`. **Nota:** `runtimeVersion: V8` es el nombre del motor JavaScript moderno de Google, **no** una versión antigua de RV Command Center; es obligatorio conservarlo.
8. Guarda el proyecto. Desde el editor, selecciona **getV9Dashboard** y ejecútalo una vez, autorizando los permisos nuevos si Google los solicita.
9. Ve a **Implementar > Administrar implementaciones**; edita la implementación existente **RV-CCV9**; selecciona **Nueva versión** y **Implementar**, manteniendo **Ejecutar como: Yo** y **Quién tiene acceso: Solo yo**.
10. Abre la **misma URL /exec**. Si faltan las Script Properties de las fuentes, V9 mostrará la tarjeta **⚙️ Configurar fuentes privadas**. Pulsa **Configurar conexiones**, pega los enlaces de tus cuatro hojas (Matrix, MTS Execution Log, PSICOPRO, Finanzas), y **Verificar y guardar fuentes**. Cada enlace se comprueba con acceso de solo lectura y la estructura esperada. No publica IDs en GitHub.
11. En `cc.rodolfovalle.com`, abre **⚙️ Configurar acceso** y guarda la URL /exec de RV-CCv9. El portal V9 utiliza una nueva clave del navegador para evitar seguir abriendo el despliegue anterior.

## Diagnóstico de datos vacíos

Si abre V9 pero hay guiones o fuentes como «No configurada», el problema puede ser que se creó otro proyecto Apps Script; **Script Properties no se copian**. Completa «Configurar conexiones» y verifica los cuatro estados. Si una fuente aparece «Error al consultar», comprueba permisos de tu cuenta y el servicio avanzado Sheets. Si hay un error de autorización o el panel no carga, revisa **Apps Script > Ejecuciones** y confirma que el proyecto tiene los archivos nuevos guardados.

V9 carga primero `getV9Bootstrap`, luego `getV9Dashboard` y `getV9Extended`. **Solo cuando se entra en la pestaña Arica**, `getV9LocalData` consulta meteorología modelada, fuentes oficiales o indexadas y utiliza un caché de 15 minutos. Si alguna fuente falla, el resto del panel sigue funcionando.

## Módulos actuales

| Módulo | Estado técnico | Nota |
|---|---|---|
| Agenda y fuentes | Implementado | Calendar + las cuatro hojas, estado de configuración y diagnósticos |
| Captación por WhatsApp Business | Implementado | +1 consulta, origen opcional, deshacer; SIN acceso a chats; sin cálculo de conversión individual |
| Primera atención | Parcial | Solo con marcador explícito en PSICOPRO; si no está validado, «No verificado» |
| Memory Engine | Implementado | Capturar pendientes, evitar duplicados, marcar terminados y descartar |
| Time Opportunity | Heurístico | Ventanas potenciales comparando Matrix y Calendar predeterminado |
| Opportunity Engine | Heurístico | Prioridades basadas en evidencia, nunca cambios automáticos |
| Decision Engine | Implementado | Escenarios con supuestos, no predicción garantizada |
| Decision Calibration | Implementado | Hipótesis, confianza y resultado posterior |
| Execution | Supervisado | Abrir borrador en Calendar; solo se guarda manualmente por el usuario |
| Arica | Bajo demanda | Reloj local, modelo de temperatura/viento/UV/aire/oleaje y comunicados SENAPRED indexados/sismos CSN fechados; 15 min caché, no polling |
| Fotografías | Integrado remotamente | 29 fuentes con crédito, texto alternativo y fallback; no fotos binario local |

## Privacidad y fuentes externas

- No incluir pacientes, teléfonos, conversaciones ni historias clínicas en capturas.
- Los ID privados de Google Sheets solo residen en el proyecto Apps Script, nunca se insertan en el HTML público.
- El área de captación registra únicamente conteos por día, origen y mes; no identifica pacientes. No calcular tasas individuales de conversión.
- Las webcams sin señal comprobada figuran «no verificadas»; las fotografías de archivo no son CCTV.
- **Arica consulta con `UrlFetchApp.fetchAll`** solo cuando abres la sección y no al actualizar el resumen del CC. Usa `script.external_request` por autorización del propietario; ninguna tarea programada sondea el clima. SENAPRED puede no ofrecer un estado activo verificable y la información marítima modelada no reemplaza un aviso oficial.
- Los permisos de Sheets y Calendar permanecen de **solo lectura**. Capturar tareas y consultas modifica Script Properties, no las fuentes originales.

## Verificación automatizada

```bash
node apps-script/tests/command-center-v9.mjs
```

La suite utiliza datos ficticios, verifica el único HTML, acceso `MYSELF`, fuentes, flujo de configuración, captación y reversión, escenarios y licencia de imágenes. **GitHub Actions no publica automáticamente la Web App privada de Google.** Su despliegue requiere la operación explícita del propietario descrita arriba.

## Reversión

Si alguna versión introduce un fallo, recupera el commit anterior desde el historial GitHub y vuelve a desplegarlo en RV-CCv9. No es necesario conservar código o pestañas antiguas en el proyecto actual.


## Restauraciones auditables de octubre 2026

- **Boxeo dirigido:** indicador de 7 días cuenta fechas únicas de la fila “Coached Boxing” marcada Done en MTS. El 19/10 y el 21/10 deben dar **2**, sin duplicar trabajos dentro de cada clase; con enlaces a filas.
- **PSICOPRO:** usa `Objetivos/Paciente!A25:D75`, “Seguimiento Semanal”. Semanas 5/10 9, 12/10 12, 19/10 6 = **27 sesiones registradas** en octubre hasta el 25/10; la semana 26/10 con 18 es FUTURA y se excluye. Registro de sesiones no equivale a verificación independiente.
- **Incongruencias:** se muestran comparaciones con fecha y enlaces entre Matrix, PSICOPRO, MTS, Calendar, conciliación de Finanzas y salud de fuentes. Prioridad alta de auditoría se presenta antes que Opportunity Engine.
- **Boxing roadmap:** radar SVG 15 habilidades con valores sept/objetivos oct y enlaces exactos; **MONTH KPI** usa barras de progreso solo donde la magnitud es comparable.
- **Fotografías:** imágenes insertadas en contexto en 28 tarjetas y hero; sin pestañas/galerías independientes de imágenes.
- **Avisos y sismos:** muestra fuentes con hora/fecha, frescura y advertencia cuando no hay estado oficial de vigencia verificable. La disponibilidad del índice depende de Google News y del formato CSN.
