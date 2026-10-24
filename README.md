# CC — RV Command Center

Código del panel privado que reúne alertas operativas de MTS, PSICOPRO, finanzas y Google Calendar.

**Dominio solicitado:** `cc.rodolfovalle.com`.

## Estado de la migración

- Código completo importado de la versión 7 publicada del panel, conservando su identidad y reglas.
- Repositorio privado. La instantánea operativa, los registros originales y las credenciales no se incluyen en Git.
- Dominio reservado en el servidor actual; falta configurar y verificar los registros descritos en [deploy/DNS.md](deploy/DNS.md).
- La aplicación requiere servidor, base de datos y almacenamiento, además del cliente web. GitHub aloja el código de este repositorio; el servidor privado existente continúa atendiendo la aplicación. Esto no constituye una migración del alojamiento a GitHub Pages.

GitHub Pages sirve archivos estáticos y no ejecuta el servidor de esta aplicación. No activar Pages con una exportación de los datos operativos: un repositorio privado no vuelve privado un sitio de Pages de una cuenta personal.

## Código y actualización

- `src/content/dashboard/DashboardContent.jsx`: interfaz del panel.
- `src/content/dashboard/rv-command.css`: presentación propia.
- `src/content/shared/rv-logic.mjs`: reglas y cálculos.
- `src/content/shared/make-snapshot.mjs`: transformación reproducible y anónima.
- `src/content/shared/RV_REFRESH.md`: fuentes y procedimiento de revisión.
- `AGENTS.md`: límites de edición y construcción.
- `.openai/data-app-publication-source.json`: referencia inmutable a los datos de la versión original, sin sus registros.

`src/data.json`, las exportaciones completas, `dist`, dependencias y archivos temporales permanecen excluidos de Git. El código se conserva sin incrustar datos operativos en archivos públicos.

La revisión automática continúa vinculada al panel existente. Copiar el código a GitHub no cambia por sí solo su destino de publicación ni configura una integración de despliegue desde GitHub. Antes de un traslado del servidor, deben migrarse y verificarse autenticación, almacenamiento, presentación y actualización automática.

## Verificación de las reglas

Con Node instalado:

```sh
node --test src/content/shared/rv-logic.test.mjs
```

Para reconstruir el panel, primero recuperar la instantánea autorizada y seguir `AGENTS.md` y el flujo de Data indicado en `RV_REFRESH.md`. No sustituir los datos por una plantilla vacía ni inventar valores para hacer pasar una compilación.

## Procedencia

- Proyecto original: `appgprj_6ada96f75ed48191854c26b317a88cbe`.
- Versión publicada recuperada: 7.
- Commit de origen: `ee3bc760d15992dc6fdeb7d92315be7f771d6169`.
- Identidad de la aplicación: `dashboard:7f1b1c70-f5b8-4140-8f5b-cfc9aa99cd38`.

Panel operativo durante la transición: <https://rv-command-center.rbastianvalle.chatgpt.site>.
