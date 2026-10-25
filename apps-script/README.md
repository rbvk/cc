# RV Command Center V9 · Aplicación privada única

**Versión activa en código:** `2026.10.24.9` (revisión: sin consultas meteorológicas externas). Esta versión sustituye completamente la interfaz anterior. Git guarda el historial para recuperar cualquier commit: no se distribuyen paneles antiguos ni enlaces a versiones de respaldo.

## Arquitectura

- **Portal público:** `cc.rodolfovalle.com` (solo entrada, sin datos privados).
- **Web App privada:** proyecto Google Apps Script **RV-CCv9**, accesible exclusivamente al propietario, ejecutándose como su cuenta de Google.
- **Google Sheets + Calendar:** cuatro fuentes originales, todas **solo lectura**. Las consultas nuevas y las tareas se guardan únicamente como conteos anónimos y pendientes operativos dentro de Script Properties. No se crea otra hoja clínica.
- **Arica:** hora local desde el navegador y enlaces públicos voluntarios. Sin consultas automáticas a clima, aire u oleaje; no se usa `UrlFetchApp`.

## ✅ Reparación y actualización del proyecto YA EXISTENTE

**No crees un nuevo proyecto Apps Script.** Los ajustes y las Script Properties no se transfieren automáticamente entre proyectos. Trabaja sobre `RV-CCv9` y su implementación actual.

1. Abre en tu cuenta el proyecto **RV-CCv9** de Apps Script.
2. Copia el contenido de [Code.gs](Code.gs) en **Code.gs** (reemplazar).
3. Copia el contenido de [Index.html](Index.html) en **Index.html** (reemplazar). Esta es la **única** interfaz vigente.
4. Actualiza **V9_core.gs** (nombre en tu proyecto) con [V9_Core.gs](V9_Core.gs) del repositorio.
5. Actualiza **V9_Intelligence.gs** con [V9_Intelligence.gs](V9_Intelligence.gs) del repositorio.
6. **Elimina el antiguo archivo V9.html del proyecto Apps Script**, porque ahora la interfaz V9 vive en `Index.html`. No es necesario conservar archivos de interfaz duplicados.
7. Abre `appsscript.json` y verifica que coincida con [appsscript.json](appsscript.json): runtime **V8 de JavaScript**, servicio avanzado Google Sheets v4, scopes `spreadsheets.readonly` y `calendar.readonly` exclusivamente, webapp `MYSELF`/`USER_DEPLOYING`. **Nota:** `runtimeVersion: V8` es el nombre del motor JavaScript moderno de Google, **no** una versión antigua de RV Command Center; es obligatorio conservarlo.
8. Guarda el proyecto. Desde el editor, selecciona **getV9Dashboard** y ejecútalo una vez, autorizando los permisos nuevos si Google los solicita.
9. Ve a **Implementar > Administrar implementaciones**; edita la implementación existente **RV-CCV9**; selecciona **Nueva versión** y **Implementar**, manteniendo **Ejecutar como: Yo** y **Quién tiene acceso: Solo yo**.
10. Abre la **misma URL /exec**. Si faltan las Script Properties de las fuentes, V9 mostrará la tarjeta **⚙️ Configurar fuentes privadas**. Pulsa **Configurar conexiones**, pega los enlaces de tus cuatro hojas (Matrix, MTS Execution Log, PSICOPRO, Finanzas), y **Verificar y guardar fuentes**. Cada enlace se comprueba con acceso de solo lectura y la estructura esperada. No publica IDs en GitHub.
11. En `cc.rodolfovalle.com`, abre **⚙️ Configurar acceso** y guarda la URL /exec de RV-CCv9. El portal V9 utiliza una nueva clave del navegador para evitar seguir abriendo el despliegue anterior.

## Diagnóstico de datos vacíos

Si abre V9 pero hay guiones o fuentes como «No configurada», el problema puede ser que se creó otro proyecto Apps Script; **Script Properties no se copian**. Completa «Configurar conexiones» y verifica los cuatro estados. Si una fuente aparece «Error al consultar», comprueba permisos de tu cuenta y el servicio avanzado Sheets. Si hay un error de autorización o el panel no carga, revisa **Apps Script > Ejecuciones** y confirma que el proyecto tiene los archivos nuevos guardados.

La hora de Arica se calcula en el navegador sin solicitar información meteorológica. V9 carga primero la interfaz (`getV9Bootstrap`); posteriormente solicita por separado los datos principales (`getV9Dashboard`) y las métricas complementarias (`getV9Extended`). Si una lectura falla, muestra un diagnóstico sin bloquear todo el panel.

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
| Arica | Implementado sin meteorología | Reloj local, enlaces a cámaras públicas y fuentes oficiales; ninguna consulta automática de clima |
| Fotografías | Integrado remotamente | 29 fuentes con crédito, texto alternativo y fallback; no fotos binario local |

## Privacidad y fuentes externas

- No incluir pacientes, teléfonos, conversaciones ni historias clínicas en capturas.
- Los ID privados de Google Sheets solo residen en el proyecto Apps Script, nunca se insertan en el HTML público.
- El área de captación registra únicamente conteos por día, origen y mes; no identifica pacientes. No calcular tasas individuales de conversión.
- Las webcams sin señal comprobada figuran «no verificadas»; las fotografías de archivo no son CCTV.
- Se eliminaron los endpoints y el permiso de llamadas meteorológicas externas. Las fuentes oficiales de Arica solo se abren mediante un clic del propietario.
- Los permisos de Sheets y Calendar permanecen de **solo lectura**. Capturar tareas y consultas modifica Script Properties, no las fuentes originales.

## Verificación automatizada

```bash
node apps-script/tests/command-center-v9.mjs
```

La suite utiliza datos ficticios, verifica el único HTML, acceso `MYSELF`, fuentes, flujo de configuración, captación y reversión, escenarios y licencia de imágenes. **GitHub Actions no publica automáticamente la Web App privada de Google.** Su despliegue requiere la operación explícita del propietario descrita arriba.

## Reversión

Si alguna versión introduce un fallo, recupera el commit anterior desde el historial GitHub y vuelve a desplegarlo en RV-CCv9. No es necesario conservar código o pestañas antiguas en el proyecto actual.
