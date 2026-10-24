# RV Command Center — Panel privado con Google Apps Script

## Objetivo

**Leer y analizar Google Sheets privados**, sin OAuth personalizado en cada visita, sin Cloud Run y sin publicar los datos en GitHub Pages.

Este código crea un panel real con acceso controlado **por la sesión Google del propietario**, usando un Google Apps Script Web App desplegado como:
- **Execute as:** Me (USER_DEPLOYING)
- **Who has access:** Only myself (MYSELF)

**Nunca** desplegar como Anyone / Anyone with Google Account. Un despliegue público que ejecuta como el propietario puede exponer información privada.

El sitio `cc.rodolfovalle.com` en GitHub Pages continúa siendo una página pública. **No puede mostrar información privada de Apps Script sin autenticarse ante Google**. La opción simple es usarlo como lanzador hacia la URL segura `script.google.com/.../exec`. No se puede mantener el dominio en la barra de direcciones y prescindir simultáneamente de un backend y un proveedor de autenticación.

## Instalación inicial (una vez)

1. Entrar a **https://script.google.com/home/projects/create** con la cuenta propietaria de las cuatro hojas.
2. Sustituir el contenido de `Code.gs` por `apps-script/Code.gs` de este repositorio.
3. Crear un archivo HTML llamado **Index** y pegar `apps-script/Index.html`.
4. En **Project Settings**, habilitar **Show "appsscript.json" manifest file in editor**, abrir `appsscript.json` y pegar su versión de `apps-script/appsscript.json`. Así se habilita el servicio avanzado **Google Sheets API**, con permiso de **solo lectura**. Si se usa el proyecto Cloud predeterminado de Apps Script, la API se habilita al añadir el servicio.
5. En **Project Settings > Script Properties**, añadir:
   - `MATRIX_SHEET_ID`: ID de Google Sheet MTS System Matrix.
   - `TRAINING_SHEET_ID`: ID de Google Sheet MTS M9 Execution Log.
   - `CLINICAL_SHEET_ID`: ID de Google Sheet RODOLFO.PSICOPRO.
   - `FINANCE_SHEET_ID`: ID de la hoja financiera operativa elegida; no asumir que un presupuesto antiguo es el actual.
   
   El ID se encuentra en la URL de cada hoja, entre `/d/` y `/edit`. **No agregar estos IDs al repositorio público**, aunque por sí solos no conceden permisos.
6. Guardar. Seleccionar función **getDashboard** y ejecutar una vez para conceder permisos solicitados. Revisar que la autorización incluya únicamente la lectura de Sheets y Calendar.
7. **Deploy > New deployment > Web app**. Ejecutar como **Me**; acceso **Only myself**. Copiar URL `/exec` de la web app.
8. Abrir la URL, verificar datos agregados y guardar el enlace en favoritos. Google solicitará inicio de sesión solo cuando tu sesión lo requiera; la autorización de los servicios no se repite cada vez que abres el dashboard, salvo cambios de permisos/revocación.
9. Para que `cc.rodolfovalle.com` sea el punto de entrada, configurar un botón **Entrar al panel privado** que navegue a esta URL. No usar un `iframe` público ni pegar resultados de datos privados en GitHub.

## Qué analiza (MVP)

- **Google Calendar:** eventos durante las próximas 48 horas, primera hora de evento; no se envían títulos ni descripciones al cliente.
- **MTS System Matrix:** localiza la pestaña de la semana en formato `dd/MM`, selecciona la columna del día (B–H), agrupa bloques horarios por boxeo, gym, clínica, academia y bomberos. Reporta **bloques, no sesiones**; la coincidencia de palabras es aproximada.
- **MTS Execution Log:** lee columnas **A:F** de `Daily log` y **A:L** de `drg`. Cuenta registros terminados en últimos 7 días, muestra última salida DRG sin datos sensibles. **ABORT/CUT solo cambia la prioridad si el DRG es de hoy**, nunca con una salida histórica.
- **RODOLFO.PSICOPRO:** cuenta celdas anotadas en B3:F15 de la pestaña semanal (próxima semana en fin de semana). No muestra nombres ni datos de pacientes. **No equivale a número validado de sesiones**, pues el formato real puede contener notas y estados.
- **Finanzas:** verifica que la hoja configurada sea legible. El ingreso neto, gasto y margen quedan **pendientes de mapeo de celdas**; no se inventan cálculos.

Una falla de permiso en una fuente no impide abrir el resto del dashboard. No se registran en GitHub ni se publican los datos consultados.

## Seguridad

- La seguridad depende de la opción **Only myself** impuesta por Google, no de un formulario de contraseña en JavaScript.
- La autorización de Apps Script se concede una vez y puede requerirse de nuevo por cambios de alcance, revocación o cambios de sesión.
- Los datos se consultan en el servidor de Google y solo se envían indicadores agregados al navegador del propietario.
- No exponer nunca contenido de pacientes, nombres, RUT, notas, fichas, diagnósticos ni sesiones individuales en el frontend o registros de ejecución.
- El código `backend/` de Cloud Run y el login OAuth del frontend previo no forman parte de esta implementación segura. Deben retirarse del despliegue público solo una vez que el acceso privado esté funcionando.
- Script Properties no es una bóveda de credenciales; aquí contiene IDs, no contraseñas ni tokens.

## Validación necesaria

1. Abrir web app con la cuenta propietaria: debe permitir lectura.
2. Abrir en navegador incógnito y con otra cuenta: debe **denegar acceso** antes de ejecutar código.
3. Confirmar que un evento clínico no revela nombres en HTML, DevTools ni respuesta RPC.
4. Verificar fecha / zona horaria y DRG actual vs histórico.
5. Comparar manualmente los recuentos de MTS y PSICOPRO contra sus pestañas fuente.
6. Si cambia la estructura de las hojas, actualizar los rangos antes de confiar en los KPIs.

**Estado actual:** código preparado en GitHub, pero **aún no desplegado ni autorizado en una cuenta Google Apps Script**. No afirmar que la web app funciona hasta superar la verificación.
