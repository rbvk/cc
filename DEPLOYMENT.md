# Despliegue de RV Command Center

## 1. Portal GitHub Pages

Repositorio `rbvk/cc`; dominio `cc.rodolfovalle.com`. GitHub Actions publica únicamente `index.html`, `styles.css`, `app.js` y el registro CNAME. El portal público no tiene acceso a las hojas.

En GitHub, revisar **Settings > Pages** y **Actions > Publish RV Command Center**. Para el dominio personalizado debe existir `CNAME cc -> rbvk.github.io` y certificado HTTPS activo.

## 2. Aplicación privada de Google (configuración única obligatoria)

Ver [apps-script/README.md](apps-script/README.md). En resumen:

1. Crear proyecto en `https://script.google.com/home/projects/create`.
2. Copiar `apps-script/Code.gs` y `apps-script/Index.html`.
3. Mostrar el manifiesto `appsscript.json` y copiar `apps-script/appsscript.json` (incluye Google Sheets API avanzado y ámbitos de solo lectura).
4. Configurar en **Script Properties** los IDs de las cuatro hojas: `MATRIX_SHEET_ID`, `TRAINING_SHEET_ID`, `CLINICAL_SHEET_ID`, `FINANCE_SHEET_ID`.
5. Autorizar el script inicialmente con tu cuenta de Google.
6. **Deploy > New deployment > Web app**: `Execute as = Me`, `Who has access = Only myself`.
7. Copiar su URL terminada en `/exec`, abrir `https://cc.rodolfovalle.com` y pulsar **Configurar acceso**, pegar y guardar la URL.

La URL /exec es una ubicación, **no** una credencial. Solo Google, con la configuración **Only myself**, controla el acceso real. No desplegar como Anyone.

## 3. Pruebas de seguridad y datos

- En incógnito/otra cuenta, debe denegarse el acceso al panel privado.
- Verificar que las fuentes se leen y muestran estado; un error no se interpreta como cero citas.
- Comparar recuentos MTS/PSICOPRO con hojas originales; los primeros son **bloques horarios aproximados**, no sesiones confirmadas.
- Verificar que DRG ABORT histórico no activa alerta hoy.
- Confirmar que el HTML y la respuesta RPC no contienen nombres, RUT, diagnósticos, títulos de eventos ni filas completas.
- No publicar ni la aplicación ni ninguna Google Sheet con opción Anyone.

## Estado

El portal de GitHub y el código privado están preparados. **La web app de Apps Script aún no se ha desplegado ni probado en tu cuenta**, porque esta conexión GitHub no administra despliegues de Google Apps Script. El nuevo panel empezará a analizar información real después de la autorización inicial.
