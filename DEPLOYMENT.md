# RV Command Center — GitHub Pages (sin backend)

## Estado actual

La aplicación estática es `index.html` + `styles.css` + `app.js`.
El workflow `.github/workflows/pages.yml` publica **solo** estos archivos en GitHub Pages con `CNAME=cc.rodolfovalle.com`.

No se necesita Cloud Run ni Redis para utilizar el dashboard en modo enlaces. El código legado en `backend/` **no participa** en esta versión y no se publica.

## Primer uso — inmediato

1. Abrir `https://cc.rodolfovalle.com/` cuando DNS y HTTPS estén activos. Si todavía no responde, revisar **Settings > Pages** en `rbvk/cc`.
2. Clic en **⚙️ Configurar**.
3. Pegar los enlaces privados de cuatro hojas: MTS System Matrix, MTS Execution Log, RODOLFO.PSICOPRO, Finance. Guardar.
4. Acceder a cada hoja mediante **Abrir hoja privada**. Google controla la autorización; **no** hace falta publicarlas.
5. Añadir tareas no sensibles en el panel de acciones.

Los enlaces y tareas se guardan solamente en **este navegador**, mediante `localStorage`. No se sincronizan entre dispositivos. No introducir datos personales de pacientes ni secretos.

## Activar métricas automáticas — opcional

Google OAuth requiere una configuración gratuita de credenciales de OAuth, pero **no** necesita Cloud Run.

1. En Google Cloud Console, crear o seleccionar un proyecto.
2. Habilitar **Google Sheets API** y **Google Calendar API**.
3. Configurar pantalla de consentimiento OAuth (External / Testing) y agregar **solo tu cuenta Google** como test user. No publicar la app OAuth para todos.
4. Crear **OAuth Client ID > Web application** con Authorized JavaScript origins:
   - `https://cc.rodolfovalle.com`
   - Si deseas usar también la dirección de prueba, agrega `https://rbvk.github.io`.
5. Copiar **solo el Client ID** (no el Client Secret) en ⚙️ Configurar, y opcionalmente tu correo permitido.
6. Pulsa **Conectar Google** y acepta permisos de solo lectura. No compartas la hoja por enlace público.

Los permisos solicitados son `spreadsheets.readonly`, `calendar.readonly` y `userinfo.email`. El access token permanece **solo en memoria**, no se guarda en el repositorio, el navegador persistente ni en Sheets. Al recargar debe reconectarse.

Para cada hoja, el rango predeterminado es `A1:T150` (primera pestaña). Si deseas otra pestaña, escribe `'Nombre exacto de pestaña'!A1:U150`. En la interfaz se muestra **cantidad de filas no vacías en el rango**, no un conteo de pacientes o ingresos. Los contenidos nunca se insertan en el HTML ni se transmiten a GitHub.

El Calendar consulta próximos eventos, pero **no muestra nombres ni títulos** para evitar exposición accidental de información clínica.

## Privacidad: límites reales

- GitHub Pages hospeda una **interfaz pública**. Cualquiera puede descargar su HTML, JS y CSS.
- No existe un login privado real **para la página** sin un sistema autenticado adicional. La comparación opcional de email en navegador es solo un filtro visual, no una política de servidor.
- Google exige sesión/permiso individual para cada hoja privada. Esto es lo que protege los datos.
- Un Google OAuth client ID **no es un secreto**; nunca pongas client secrets, credenciales de servicio, API keys privadas o tokens en el repositorio.
- No copies nombres, RUT, notas, diagnósticos ni contenido de fichas clínicas en tareas del dashboard.
- Los datos no deben compartirse públicamente en Google Sheets.

## GitHub Pages y DNS

- El repositorio puede ser público para usar Pages con GitHub Free.
- Settings > Pages > Build and deployment > Source: **GitHub Actions**.
- Custom domain: `cc.rodolfovalle.com`.
- En el proveedor DNS: registro **CNAME**, host `cc`, valor `rbvk.github.io` (sin protocolo).
- Habilitar **Enforce HTTPS** después de emitirse el certificado.
- Revisar Actions > Publish RV Command Center para confirmar que el workflow termina con success.
- Configurar el custom domain dentro de Pages; **CNAME por sí solo no lo registra automáticamente**.

## Condiciones de validación

- Dashboard se carga en móvil/escritorio; CSS/JS no devuelven 404.
- Modo enlaces funciona aun si OAuth no está configurado.
- Conectar Google requiere consentimiento desde tu dominio autorizado.
- Las hojas no son públicas y una cuenta sin permisos no puede leerlas.
- Recarga elimina access token; enlaces locales y tareas permanecen.
- Nunca se muestran títulos de Calendar ni filas individuales de Sheets.
- El estado «sin verificar» no se interpreta como cero pacientes ni cero citas.

Si tienes Chrome/Safari bloqueando ventanas emergentes, permite popups para el sitio antes de activar OAuth.
