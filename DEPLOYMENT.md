# 🛡️ Publicación de RV Command Center V9

## 1. Portal público

GitHub Pages publica `index.html`, `app.js`, `styles.css` y `preview-v9.html` en `cc.rodolfovalle.com`. `preview-v9.html` contiene solo datos ficticios y se marca `noindex`. Ninguna de estas páginas tiene acceso a PSICOPRO, Matrix, MTS, Finanzas ni Calendar.

El workflow de Pages es `.github/workflows/pages.yml`. Para configurar el dominio, DNS CNAME `cc` apunta a `rbvk.github.io`; verificar HTTPS.

## 2. Aplicación PRIVADA existente en Google Apps Script

El propietario ya tiene un proyecto Apps Script denominado **RV-CCv9**. Actualizar ese proyecto; no crear otro, pues las Script Properties son locales a cada proyecto.

- Cargar **todos** estos archivos: `Code.gs`, `Index.html`, `V9_Core.gs`, `V9_Intelligence.gs`, **`V9_Local.gs`** y `appsscript.json` desde [apps-script](apps-script/). Si falta `V9_Local.gs`, la pestaña Arica generará error.
- Borrar del proyecto Apps Script la página HTML duplicada `V9.html`, porque la única interfaz está en `Index.html`.
- Comprobar Google Sheets avanzado v4 y ámbitos de lectura `spreadsheets.readonly`, `calendar.readonly` y `script.external_request` (solo consultas Arica solicitadas por el propietario). El valor `runtimeVersion: V8` del manifiesto es **JavaScript V8 de Google**, no una versión de RV CC.
- Guardar, ejecutar `getV9Dashboard` una vez en el editor si requiere autorización, y después **Implementar > Administrar implementaciones > RV-CCV9 > Editar > Nueva versión > Implementar**. Ejecutar como `Me`, acceso `Only myself`.
- La URL /exec de la implementación existente se conserva. La versión publicada es independiente del último código guardado en el editor.
- **Arica vuelve a ofrecer mediciones modeladas** y publicaciones fechadas, únicamente al abrir la pestaña o pulsar «Comprobar fuentes». Usa caché 15 minutos, no peticiones recurrentes. Las fuentes externas requieren `script.external_request`; no se hace vigilancia continua.
- La interfaz se abre por etapas: arranque sin dependencias, después lectura principal de Sheets/Calendar y finalmente métricas opcionales. Si una fuente falla, el panel muestra su diagnóstico en vez de quedar en blanco.

## 3. Configuración de datos en el nuevo proyecto

Si no se copiaron las Script Properties del proyecto anterior, la aplicación mostrará **⚙️ Configurar fuentes privadas**. Pegar dentro de la Web App los enlaces de **Matrix**, **MTS Execution Log**, **RODOLFO.PSICOPRO** y **Finanzas**. Se guardan únicamente sus IDs en las propiedades privadas después de verificar acceso de solo lectura y estructura de pestañas.

Esta acción **no** cambia las cuatro hojas originales. No introducir ni subir IDs de hojas en GitHub.

## 4. Comprobaciones posteriores

- Entrar como propietario y comprobar V9 en pantalla, versión, estado de las cuatro fuentes, Calendar, DRG, finanzas y Arica. V9 no debe mostrar V8 ni un selector de versiones.
- Si no hay datos, revisar **Configuración de fuentes**, acceso Google, pestañas y Apps Script > Ejecuciones. No interpretar una fuente vacía como un valor cero.
- Registrar un conteo de consulta de prueba y deshacerlo; capturar una tarea ficticia y marcarla completada.
- En una cuenta Google ajena o modo incógnito, el panel privado debe denegar el acceso.
- Comprobar que ninguna respuesta accesible públicamente contiene datos clínicos, correos, RUT o credenciales.
- No modificar fuentes sin autorización ni permitir acceso `Anyone`.
- Si existe fallo, recuperar la versión anterior mediante Git e implementar nuevo código; **no mantener HTML anterior en producción**.

## 5. Verificación automatizada

La única suite actual es `node apps-script/tests/command-center-v9.mjs`. El éxito de pruebas GitHub no sustituye la prueba de una implementación real bajo la cuenta Google del propietario.

[Instrucciones detalladas](apps-script/README.md)


## Nuevas comprobaciones críticas (25/10/2026)

- MTS 19/10 y 21/10: dos fechas distintas de “Coached Boxing” realizadas; no contar día completo ni drills por separado.
- PSICOPRO registro semanal 19/10=6 y octubre hasta la semana 19/10=27 (futura 26/10=18 no incluida); cifras según “Seguimiento Semanal”.
- Sección Inteligencia > Incongruencias restaurada; revisar enlaces a cada celda de los sistemas.
- 15 habilidades Boxing roadmap visibles en radar; objetivos MTS como barras solo para cifras comparables, cada una enlazada.
- Arica muestra fechas y advertencias de datos indexados o modelados; la publicación de una alerta no acredita su vigencia.
