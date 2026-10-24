# 🧠 RV Command Center

Centro de operaciones personal con cuatro fuentes de Google Sheets y Google Calendar.

## Diseño actual

| Componente | Ubicación | Privacidad |
|---|---|---|
| Portal de entrada | `https://cc.rodolfovalle.com` · GitHub Pages | Público, sin datos privados |
| Motor de análisis | `apps-script/Code.gs` · Google Apps Script | Acceso **solo propietario** |
| Dashboard real | `apps-script/Index.html` · Google Apps Script | Acceso **solo propietario** |
| Datos originales | Tus hojas Google Sheets / Calendar | No se publican ni duplican |

**No hay Cloud Run, API keys, OAuth Client ID ni login de contraseña ficticia.** Apps Script usa la sesión autenticada de tu cuenta Google y sus permisos después de la autorización inicial. La primera autorización puede repetirse si cambian los permisos del proyecto.

## Cómo activar

Sigue [apps-script/README.md](apps-script/README.md). Necesitas desplegar el proyecto con **Execute as: Me** y **Who has access: Only myself**. Después coloca la URL `/exec` en **⚙️ Configurar acceso** del portal.

**Importante:** GitHub Pages no puede mostrar automáticamente los datos privados de Google Sheets sin una autenticación válida. El portal lleva a una aplicación de Google que sí puede analizarlos. La URL del navegador cambiará al entrar al panel privado.

## Estado verificado

- Implementación de GitHub Pages en `main`; workflow `.github/workflows/pages.yml`.
- Código y manifest para Apps Script preparados, pero **no implementados ni probados en una cuenta Google real**.
- Análisis disponible en código: calendario 48 h, clasificación horaria MTS, DRG y ejecución reciente, agenda PSICOPRO agregada.
- **Finanzas:** conexión preparada, definición de KPIs pendiente de identificar la hoja y rangos vigentes.

No colocar nombres de pacientes, historiales clínicos, RUT, credenciales, tokens ni datos financieros personales en GitHub, tareas locales o commits.

El código React/Vite heredado `src/` no se publica por el workflow actual y permanece únicamente como histórico.
