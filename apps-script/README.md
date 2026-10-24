# 🧠 RV Command Center — análisis privado, sin OAuth recurrente

**GitHub Pages (`cc.rodolfovalle.com`) publica únicamente el portal.** Los datos reales se procesan dentro de una Web App de Google Apps Script, desplegada por el propietario como **Execute as: Me / Who has access: Only myself**.

La sesión de Google permite acceder sin crear un OAuth Client ID ni autorizar cada apertura; la primera autorización del script sigue siendo necesaria. El navegador pasa a la URL segura `script.google.com/.../exec`. GitHub Pages no puede ofrecer el mismo análisis privado solo con una contraseña local.

## Controles implementados

| Control | Fuente 1 | Fuente 2 | Acción |
|---|---|---|---|
| 🥊 Entrenamientos planificados pero no agendados | MTS Execution Log, `Daily log` | MTS System Matrix, pestañas semanales | Comparar **fecha + dominio** (boxeo, gym, cardio). Excluir sesiones explícitamente canceladas. No declarar todo conforme si no hay plan MTS futuro |
| 🏥 Citas PSICOPRO no reflejadas en Matrix | PSICOPRO, agenda semanal | MTS System Matrix, misma semana | Comparar **fecha + hora**; diferenciar ausencias, posibles solapamientos y posibles discrepancias de identidad. Solo fechas/horas y recuentos en pantalla, no nombres |
| 🥊 DRG diario | MTS Execution Log, pestaña `drg` | Fecha local America/Santiago | Ver evaluación del día (puntuación, output, hard stop). **Nunca aplicar un ABORT histórico como señal de hoy** |
| 💰 Desviación presupuestaria | Hoja financiera, pestaña del mes | Total presupuesto (columna B) y gasto real (columna C) | Diferencia real - presupuesto, exceso en CLP y %. Marcar cifras de un mes anterior como desactualizadas |
| 🎯 Cupos semanales | PSICOPRO, `Objetivos/Paciente` | Meta de **15** | Comparar clasificados semanales contra la meta. Distinguir faltantes, objetivo y superávit |

Calendario adicional: muestra número de eventos próximos 48 h y horario de próximo compromiso sin revelar títulos.

**Limitaciones explícitas:** las celdas libres repetidas se identifican por su frecuencia. Las diferencias de paciente se determinan por coincidencias de tokens normalizados y pueden ser falsos positivos. Las alertas son **candidatos a revisar**, no modificaciones de agenda. Si falta un mesociclo o una pestaña, el estado debe ser "sin datos comparables", no "0 errores".

## Configuración inicial única

1. Abre [script.google.com/home/projects/create](https://script.google.com/home/projects/create) con tu cuenta propietaria de Calendar y de las cuatro hojas.
2. En `Code.gs`, pega el contenido completo de [Code.gs](Code.gs).
3. Crea un archivo HTML llamado exactamente `Index` y pega [Index.html](Index.html).
4. En Project Settings, habilita el manifiesto. Pega el archivo [appsscript.json](appsscript.json). El manifiesto habilita el servicio avanzado Sheets (v4) y permisos estrictamente **solo lectura** a Calendar y Sheets.
5. En Project Settings → Script Properties, agrega estas variables:
   - `MATRIX_SHEET_ID`: tu hoja MTS System Matrix
   - `TRAINING_SHEET_ID`: tu hoja MTS Execution Log vigente
   - `CLINICAL_SHEET_ID`: tu hoja compartida RODOLFO.PSICOPRO
   - `FINANCE_SHEET_ID`: tu hoja financiera operativa y **actual**, con pestaña de presupuesto
   - `FINANCE_BUDGET_TAB` (opcional): pestaña de presupuesto, por defecto `Pre Oct`. Cambiar si el mes operativo se traslada a otra pestaña.
   
   Cada ID es el tramo de la URL entre `/d/` y `/edit`. No pongas IDs ni credenciales en el frontend público.
6. Guarda el script, ejecuta `getDashboard` en el editor una vez y acepta los permisos de lectura solicitados.
7. Deploy → New deployment → Web app → **Execute as: Me** y **Who has access: Only myself**. Copia la URL completa acabada en `/exec`.
8. En `cc.rodolfovalle.com`, pulsa **Configurar acceso** y guarda esa URL. Después usa **Entrar al panel privado**.

Los ID de archivos no otorgan acceso por sí mismos; únicamente los permisos existentes de Google permiten la lectura.

## Reglas de seguridad

- **Nunca** usar `Anyone` o `Anyone with Google account` cuando la Web App se ejecuta como el propietario.
- No mostrar nombres, RUT, notas, diagnósticos, títulos de eventos ni filas completas.
- No registrar contenidos privados en logs, commits, Analytics o un sitio estático.
- No guardar access tokens en `localStorage` ni en el repositorio.
- Probar en incógnito y desde otra cuenta: debe impedirse el acceso a la Web App.
- Comparar resultados agregados con los datos originales antes de tomar decisiones operativas importantes.

## Estado de despliegue

El motor, la interfaz privada y el manifiesto están preparados en GitHub; **aún deben copiarse, autorizarse y desplegarse desde una cuenta Google**. Las pruebas en esta conversación han usado lecturas de hojas por conector y ejecución del código con servicios simulados; no sustituyen una prueba dentro de Apps Script.
