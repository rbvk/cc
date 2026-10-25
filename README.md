# 🧠 RV Command Center V9

**Versión única de la aplicación: V9.** Gestiona información operativa privada desde Google Calendar y cuatro Google Sheets, además de captación agregada, memoria de tareas, oportunidades, simulaciones y Arica Live.

## Entradas y privacidad

| Componente | Ubicación | Protección |
|---|---|---|
| Portal | https://cc.rodolfovalle.com · GitHub Pages | Público: entrada sin datos de pacientes |
| Motor V9 | `apps-script/Code.gs` + `V9_Core.gs` + `V9_Intelligence.gs` | Google Apps Script, solo propietario |
| Interfaz V9 única | `apps-script/Index.html` | Google Apps Script, solo propietario |
| Fuentes | Matrix, MTS Execution Log, PSICOPRO, Finanzas y Calendar | Solo lectura, nunca se publican |
| Captura | Script Properties del proyecto privado | Conteos anónimos y pendientes operativos |
| Vista previa | `preview-v9.html` publicada por Pages | Datos exclusivamente ficticios |

**Nunca se publica información clínica, financiera personal ni identificadores de hojas en GitHub.** La aplicación requiere sesión Google y despliegue `Execute as: Me / Who has access: Only myself`.

## Actualizar la Web App ya existente

El proyecto privado **RV-CCv9** y su URL /exec ya existen; no es necesario crear uno nuevo.

1. [Abre la guía V9](apps-script/README.md) y sustituye los archivos en el proyecto Apps Script existente.
2. Mantén `Code.gs`, `Index.html`, `V9_core.gs` y `V9_Intelligence.gs`. La interfaz solo está en `Index.html`; elimina del editor cualquier HTML `V9` duplicado.
3. Revisa `appsscript.json`, guarda y autoriza.
4. Implementar > Administrar implementaciones > editar **RV-CCV9** > **Nueva versión**. Mantén `Solo yo`.
5. Abre la misma URL /exec. Si muestra **⚙️ Configurar fuentes privadas**, pega los enlaces de las cuatro hojas. Las propiedades no se copian entre proyectos Apps Script.
6. En el portal web guarda la URL /exec de V9 en «Configurar acceso».

**El despliegue de GitHub Pages no actualiza la Web App privada de Google.** La aplicación solo cambia al publicar una nueva versión del proyecto Apps Script.

## Funciones

- ⚡ Oportunidades con evidencia, sin escritura automática en calendario ni hojas.
- 📲 Consultas nuevas agregadas desde WhatsApp Business, sin lectura de mensajes o vínculos individuales.
- 🧠 Buzón de pendientes e ideas, decisiones y calibración de resultados.
- 🏥 Control de pacientes, capacidad y servicios, con marcadores explícitos para primeras atenciones.
- 🥊 Entrenamiento, DRG, adherencia, sueño y metas.
- 💰 Presupuesto, planes mensuales e inventario BOXINGCI.
- 🌆 Arica: reloj, clima modelado, aire, mar, cámaras públicas listadas y avisos oficiales por enlace.
- 📷 29 imágenes de terceros etiquetadas, acreditadas y cargadas bajo demanda, sujetas a accesibilidad del proveedor.

## Estado y tests

- Código V9, demo y pruebas sintéticas en el repositorio.
- Tu Web App puede estar desplegada con una **versión anterior del código** hasta que la actualices manualmente.
- Validación local: `node apps-script/tests/command-center-v9.mjs`.
- Reversión: restablecer un commit anterior desde GitHub y volver a desplegarlo. **No se conservan interfaces de versiones anteriores dentro del código actual.**

No registres datos de pacientes, credenciales o motivos clínicos en las capturas de V9.
