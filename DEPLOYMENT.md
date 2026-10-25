# 🛡️ Publicación de RV Command Center V9

## 1. Portal público

GitHub Pages publica `index.html`, `app.js`, `styles.css` y `preview-v9.html` en `cc.rodolfovalle.com`. `preview-v9.html` contiene solo datos ficticios y se marca `noindex`. Ninguna de estas páginas tiene acceso a PSICOPRO, Matrix, MTS, Finanzas ni Calendar.

El workflow de Pages es `.github/workflows/pages.yml`. Para configurar el dominio, DNS CNAME `cc` apunta a `rbvk.github.io`; verificar HTTPS.

## 2. Aplicación PRIVADA existente en Google Apps Script

El propietario ya tiene un proyecto Apps Script denominado **RV-CCv9**. Actualizar ese proyecto; no crear otro, pues las Script Properties son locales a cada proyecto.

- Cargar `Code.gs`, `Index.html`, `V9_Core.gs` (en el editor puede llamarse `V9_core.gs`), `V9_Intelligence.gs` y `appsscript.json` desde [apps-script](apps-script/).
- Borrar del proyecto Apps Script la página HTML duplicada `V9.html`, porque la única interfaz está en `Index.html`.
- Comprobar Google Sheets avanzado v4 y ámbitos de lectura `spreadsheets.readonly`, `calendar.readonly`, `script.external_request`. El valor `runtimeVersion: V8` del manifiesto es **JavaScript V8 de Google**, no una versión de RV CC.
- Guardar, ejecutar `getV9Dashboard` una vez en el editor si requiere autorización, y después **Implementar > Administrar implementaciones > RV-CCV9 > Editar > Nueva versión > Implementar**. Ejecutar como `Me`, acceso `Only myself`.
- La URL /exec de la implementación existente se conserva. La versión publicada es independiente del último código guardado en el editor.

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
