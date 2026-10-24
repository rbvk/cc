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

**Reconciliación bidireccional:** también identifica bloques clínicos de Matrix ausentes en PSICOPRO. La comparación cubre la misma semana y días laborales; cada diferencia se presenta solo con fecha y hora, como **candidato para revisar**, nunca como una reserva confirmada. El sistema no modifica ni copia pacientes entre hojas.

## Recomendaciones automáticas y confiabilidad

El motor entrega **hasta tres recomendaciones**, priorizadas por gravedad y distribuidas entre dominios para evitar que decenas de avisos clínicos oculten DRG o finanzas. Cada recomendación incluye evidencia, acción, estado «verificado» o «revisar», y un enlace a la fuente original. No se hacen cambios en las hojas automáticamente.

- **DRG ABORT / Hard Stop hoy:** prioridad máxima. No usar una evaluación histórica para bloquear la actividad actual.
- **PSICOPRO vs Matrix:** compara día/hora y, internamente, coincidencia aproximada del nombre. Los nombres y tokens nunca se envían al navegador; las diferencias requieren comprobación manual.
- **MTS vs Matrix:** solo evalúa modalidades con sesión activa planificada. Si no hay planificación, devuelve **sin plan**, no «cero faltantes». Informa la última fecha programada disponible.
- **Finanzas:** concilia el total con sus categorías. Muestra las tres mayores desviaciones por categoría y el importe gastado en partidas sin presupuesto asignado. Un presupuesto de otro mes se marca **desactualizado**.
- **PSICOPRO:** controla que la meta de `Objetivos/Paciente` sea exactamente **15**, distinguiendo **pacientes clasificados semanalmente** de bloques horarios de agenda. Si la fuente usa otro objetivo, el KPI queda pendiente de verificación.
- **Estado de las fuentes:** `4/4` indica que el cálculo de las cuatro fuentes produjo un estado utilizable, **no** que todos los registros sean recientes o correctos.

El dashboard refresca al abrirse y **cada cinco minutos mientras está abierto**. No envía correos, avisos push ni tareas en segundo plano cuando está cerrado. Una alerta externa recurrente requeriría un trigger de Apps Script y permisos adicionales, y conviene evitar duplicarla con otras revisiones nocturnas existentes.

### Cambios y despliegue

**Los commits de GitHub NO actualizan automáticamente la Web App privada de Apps Script.** Después de cambios en `apps-script/Code.gs` o `apps-script/Index.html`, copia las versiones nuevas en tu proyecto y utiliza **Deploy > Manage deployments > Edit > New version > Deploy**. La URL `/exec` puede mantenerse sin cambios. Antes de dar por válido el nuevo motor, prueba con otra cuenta que `Only myself` siga bloqueando el acceso.

La validación automatizada del código fuente está en `apps-script/tests/command-center-smoke.mjs` y se ejecuta al modificar los archivos de Apps Script, mediante `.github/workflows/validate-command-center.yml`. También puedes ejecutarla con:

```bash
node apps-script/tests/command-center-smoke.mjs
```

Usa exclusivamente datos de prueba inventados, no información personal ni de pacientes.
