import fs from 'node:fs';
import {evaluate} from './rv-logic.mjs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const today=process.argv[4]||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago'}).format(new Date());
input.referenceNow=input.referenceNow||new Date().toISOString();
const result=evaluate(input,today);
const files={
 psico:{title:'RODOLFO.PSICOPRO.compartido',url:'https://docs.google.com/spreadsheets/d/1RqO_SQoCDrJaZ9l26w7OaeWUw8hY0mE1y-euOQ58qrk/edit',id:'1RqO_SQoCDrJaZ9l26w7OaeWUw8hY0mE1y-euOQ58qrk'},
 mtsMatrix:{title:'MTS · Matrix & KPIs',url:'https://docs.google.com/spreadsheets/d/1bBzA7Hn0_HyRtNUz-VxPR3f1tiIu3jykN3MlM4MQZbI/edit',id:'1bBzA7Hn0_HyRtNUz-VxPR3f1tiIu3jykN3MlM4MQZbI'},
 mtsLog:{title:'MTS_M9final',url:'https://docs.google.com/spreadsheets/d/1ApXqBMes39Rs44LHkHrL272gIzVHwOB5UaJQkLMnNFo/edit',id:'1ApXqBMes39Rs44LHkHrL272gIzVHwOB5UaJQkLMnNFo'},
 finance:{title:'Gastos integrados · octubre',url:'https://docs.google.com/spreadsheets/d/1bdR9Q_EF6pnbBQywTy2KOFdIg8BbP15aRse5KUuBcsY/edit',id:'1bdR9Q_EF6pnbBQywTy2KOFdIg8BbP15aRse5KUuBcsY'}
};
const generatedAt=new Date().toISOString();
const executedAt=input.executedAt||generatedAt;
const defaultRequests=[
 {file:files.psico,tool:'get_spreadsheet_range',arguments:{spreadsheet_id:files.psico.id,sheet_name:'19/10',range:'A1:AA22'}},
 {file:files.psico,tool:'get_spreadsheet_range',arguments:{spreadsheet_id:files.psico.id,sheet_name:'26/10',range:'A1:I24'}},
 {file:files.mtsMatrix,tool:'get_spreadsheet_range',arguments:{spreadsheet_id:files.mtsMatrix.id,sheet_name:'19/10',range:'A1:W22'}},
 {file:files.mtsMatrix,tool:'get_spreadsheet_range',arguments:{spreadsheet_id:files.mtsMatrix.id,sheet_name:'19/10',range:'A23:H27'}},
 {file:files.mtsLog,tool:'get_spreadsheet_range',arguments:{spreadsheet_id:files.mtsLog.id,sheet_name:'drg',range:'A1:P45'}},
 {file:files.finance,tool:'get_spreadsheet_range',arguments:{spreadsheet_id:files.finance.id,sheet_name:'MOV OCT',range:'A1:M20'}},
 {file:files.finance,tool:'get_spreadsheet_range',arguments:{spreadsheet_id:files.finance.id,sheet_name:'MOV OCT',range:'A20:G80'}},
 {file:files.finance,tool:'get_spreadsheet_range',arguments:{spreadsheet_id:files.finance.id,sheet_name:'Pre Oct',range:'A1:N30'}},
 {file:null,tool:'search_events',arguments:{calendar_id:'primary',time_min:'2026-10-26T00:00:00-03:00',time_max:'2026-10-31T00:00:00-03:00',timezone_str:'America/Santiago',max_results:100}}
];
const requests=input.requests||defaultRequests;
const source=(title,defs=[])=>({title,provider:'Google Drive y Google Calendar',executedAt,files:Object.values(files).map(f=>({name:f.title,url:f.url})),metricDefinitions:defs,evidenceFlow:requests.map(r=>({title:`${r.file?.title||'Google Calendar'} · ${r.tool}`,detail:JSON.stringify(r.arguments)})),caveats:['Revisión de fuentes conectadas; el panel contiene una instantánea, no una lectura en vivo.','Finanzas: la fecha del último movimiento está en el resumen; no se asume cobertura posterior.','PSICOPRO: reservas y disponibilidad registradas; una reserva no demuestra asistencia ni pago.','MTS: las filas futuras o los componentes vacíos no se interpretan como una evaluación completada.']});
const q=(rows,title,defs)=>({rows,source:source(title,defs),methods:[{language:'JavaScript',code:'Usar src/content/shared/rv-logic.mjs y make-snapshot.mjs. Contar solo celdas horarias reconocidas. Libre requiere coincidencia exacta. Comparar con el contador B:C o la cifra explícita de Horas disponibles esta semana, sin convertir el texto en reservas. DRG requiere fecha y los cinco componentes no vacíos. Los cruces son intervalos semiabiertos. Los importes vacíos o con guion son null. Las categorías de Pre Oct abarcan desde el encabezado Categoría/Presupuesto/Gasto real hasta antes de Total presupuesto; conservar todas y reconciliar ambas sumas al total. Ingresos netos sigue la fila de resumen; los duplicados deben coincidir. Los rescates no se suman como ingreso clínico. No exportar nombres de pacientes, detalles bancarios ni títulos sensibles.'}]});
const output={id:'rv-command-center-20261022',surface:'dashboard',title:'RV Command Center',generatedAt,status:'verified',buildStatus:'creating',filters:[],rv:{asOf:today,files,summary:result,refresh:{mode:'scheduled-snapshot',status:'pending',timezone:'America/Santiago',note:'Actualiza esta revisión mediante ChatGPT. No hay conexión directa desde el navegador.'}},queries:{
 attention:q(result.alerts,'Cola de atención',[{label:'Alerta',definition:'Regla operativa verificable activada por una inconsistencia, un dato ausente o un umbral de planificación; no es un diagnóstico.'}]),
 budget:q(result.budgetRows,'Presupuesto y gasto registrado',[{label:'Gasto registrado',definition:'Gastos reales por categoría del presupuesto activo. CLP. Corte en finance.lastMovement.'},{label:'Presupuesto',definition:'Importe mensual previsto por categoría; guion o celda vacía significa no definido, nunca cero.'}]),
 finance:q([result.finance],'Resumen financiero',[{label:'Brecha registrada',definition:'Ingresos netos registrados menos gastos registrados; no equivale al saldo bancario disponible.'}]),
 sources:q([{domain:'MTS',source:'M9final + Matrix',state:result.drg.current?'DRG completo':'DRG pendiente',coverage:'Último DRG completo: '+(result.drg.last?.date||'sin fecha'),sourceId:'mtsLog'},{domain:'PSICOPRO',source:'Agenda compartida',state:result.clinical.nextFree===result.clinical.reported?'Conteo consistente':'Conteo por revisar',coverage:'Próxima semana: '+result.clinical.weekStart,sourceId:'psico'},{domain:'Finanzas',source:'MOV OCT + Pre Oct',state:result.finance.lagDays>7?'Movimientos con desfase':'Registro reciente',coverage:'Último movimiento: '+(result.finance.lastMovement||'sin dato'),sourceId:'finance'},{domain:'Agenda',source:'Calendario principal',state:input.calendarNext.events.length?'Eventos disponibles':'Próxima semana sin eventos',coverage:'Semana de '+result.clinical.weekStart,sourceId:'psico'}],'Estado de las fuentes'),
 clinical:q([{week:result.clinical.weekStart,reserved:result.clinical.nextBooked,free:result.clinical.nextFree,reportedFree:result.clinical.reported}],'Disponibilidad registrada')
}};
// Do not duplicate raw source-derived records in app metadata.
output.rv.summary={finance:result.finance,clinical:result.clinical,drg:result.drg};
if(fs.existsSync(process.argv[3])){const prior=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));output.id=prior.id;output.rv.refresh=prior.rv?.refresh||output.rv.refresh;}
output.rv.refreshPolicy={timezone:'America/Santiago',window:'Read metadata each run. Resolve current and next Monday dd/MM tabs; month-specific finance tabs by current month and active budget label. Keep actual tool requests with every review. No guessed missing tabs or zero-filled failures.',privacy:'Only anonymous operational totals and scores; never copy names, clinical notes, bank details or emails.',comparison:'Compare stable alert IDs and actionable changes against the previous snapshot. No repeat notification for the same unresolved condition.'};
fs.writeFileSync(process.argv[3],JSON.stringify(output,null,2));
console.log(JSON.stringify({alerts:result.alerts.map(a=>({id:a.id,priority:a.priority})),finance:result.finance,clinical:result.clinical,drg:result.drg}));
