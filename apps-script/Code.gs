/**
 * RV Command Center — Google Apps Script, private owner-only deployment.
 * SECURITY: Deploy as Me / Only myself. Never Anyone.
 * Spreadsheet IDs live only in Script Properties, never in the GitHub Pages build.
 * Authorized scopes: spreadsheets.readonly and calendar.readonly.
 */
const RV_TZ = 'America/Santiago';
const RV_TARGET_WEEKLY = 15;
const RV_MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const RV_EN_MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('RV Command Center — privado')
    .addMetaTag('viewport','width=device-width,initial-scale=1');
}
function iso_(d) { return Utilities.formatDate(d,RV_TZ,'yyyy-MM-dd'); }
function day_(d) { return Number(Utilities.formatDate(d,RV_TZ,'u')); }
function startMonday_(d) {
  const now = new Date(d.getTime());
  now.setDate(now.getDate()-(day_(d)-1));
  now.setHours(12,0,0,0);
  return now;
}
function plusDays_(d,n) { const x=new Date(d.getTime());x.setDate(x.getDate()+n);return x; }
function weekKey_(d) { return Utilities.formatDate(d,RV_TZ,'dd/MM'); }
function matchTab_(tabs,key) {
  const wanted=key.split('/').map(Number);
  return tabs.find(s=>{const m=String(s).match(/^(\d{1,2})\/(\d{1,2})$/);return m&&Number(m[1])===wanted[0]&&Number(m[2])===wanted[1];})||null;
}
function parseDmy_(value) {
  const m=String(value||'').match(/(?:^|\b)(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if(!m)return null;
  const day=Number(m[1]),month=Number(m[2]),year=Number(m[3]);
  const d=new Date(year,month-1,day,12);
  return d.getDate()===day&&d.getMonth()+1===month&&d.getFullYear()===year?d:null;
}
function hour_(value) {
  const m=String(value||'').trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
  if(!m)return null;
  const h=Number(m[1]),min=Number(m[2]||0);
  return h<=23&&min<=59?h*60+min:null;
}
function values_(id,a1) {
  const result=Sheets.Spreadsheets.Values.get(id,a1,{valueRenderOption:'FORMATTED_VALUE',majorDimension:'ROWS'});
  return result.values||[];
}
function titles_(id) {
  const data=Sheets.Spreadsheets.get(id,{fields:'sheets.properties(title)'});
  return (data.sheets||[]).map(s=>s.properties.title);
}
function money_(value) {
  if(typeof value==='number')return Number.isFinite(value)?Math.round(value):null;
  const s=String(value??'').trim();
  if(!s||/^(?:-|—|n\/a)$/i.test(s))return null;
  const n=Number(s.replace(/[^0-9-]/g,''));
  return Number.isSafeInteger(n)?n:null;
}
function patientTokens_(input) {
  // Compare names internally only. Never return these tokens to the browser.
  const stop=new Set(['paciente','psicopro','psicologia','psicologo','psicologa',
    'sesion','clinica','clinico','atencion','consulta','terapia','presencial','online',
    'nuevo','nueva','trabajo','agendar','agenda','hora','cita','reserva','confirmado',
    'confirmada','semana','lunes','martes','miercoles','jueves','viernes','de','del',
    'la','las','el','los','para','con','una','uno','por','and','psico','pro','rodolfo']);
  return [...new Set(String(input||'').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').split(/[^a-z]+/)
    .filter(s=>s.length>=3&&!stop.has(s)))];
}
function isFree_(input) {
  const s=String(input||'').trim().toLowerCase();
  return !s||/^(?:libre|disponible|vacante|sin paciente|sin agendar|cancelad[ao]|no agendado|no asignado|—|-|--|null|n\/a|sin datos|free)$/i.test(s);
}
function registerError_(publicData) { return {state:'error',message:'No se pudo leer la fuente. Revisar permisos, pestañas y estructura.'}; }
function monthKey_(text) {
  const m=String(text||'').toLowerCase().match(/([a-záéíóú]+)\s+(\d{4})/);
  if(!m)return null;
  let index=RV_EN_MONTHS.indexOf(m[1]);
  if(index<0)index=RV_MONTHS.indexOf(m[1]);
  return index<0?null:m[2]+'-'+String(index+1).padStart(2,'0');
}
function clampNumber_(n,min,max){return Math.max(min,Math.min(max,n));}
function todayMonth_(){return Utilities.formatDate(new Date(),RV_TZ,'yyyy-MM');}

function readCalendar_(now) {
  const until=plusDays_(now,2);
  const calendar=CalendarApp.getDefaultCalendar();
  const events=calendar.getEvents(now,until).filter(e=>e.getEndTime()>now)
    .sort((a,b)=>a.getStartTime()-b.getStartTime());
  const next=events[0]||null;
  return {state:'ok',upcoming48h:events.length,
    next:next?{start:next.getStartTime().toISOString(),minutesUntil:Math.round((next.getStartTime()-now)/60000)}:null,
    message:events.length+' eventos próximos 48 h, sin títulos ni participantes'};
}
/**
 * Read current & next Matrix weekly tabs. Return a public aggregate and
 * ephemeral INTERNAL enum-only slot map: no appointment text leaves server.
 */
function readMatrix_(id,now) {
  const tabs=titles_(id);
  const start=startMonday_(now);
  const needed=[start,plusDays_(start,7)];
  const slots={};
  const available=[];
  let todayCounts={boxing:0,gym:0,cardio:0,clinical:0};
  for(const begin of needed){
    const key=weekKey_(begin);
    const tab=matchTab_(tabs,key);
    if(!tab)continue;
    available.push(key);
    const rows=values_(id,"'"+tab.replace(/'/g,"''")+"'!A3:H26");
    for(const row of rows){
      const time=hour_(row[0]);
      if(time===null)continue;
      for(let weekday=0;weekday<7;weekday++){
        const cell=String(row[weekday+1]||'').trim();
        const iso=iso_(plusDays_(begin,weekday));
        if(!slots[iso])slots[iso]={};
        const t=cell.toLowerCase();
        const free=isFree_(cell)||/^(?:sueño|dormir|sleep|descanso|comida|almuerzo|siesta)\s*:?\s*$/i.test(cell);
        const boxing=!free&&/(?:boxeo|boxing|sparring|\bppm\b|saco de box|clase box)/i.test(t);
        const gym=!free&&/(?:\bgym\b|gimnasio|\bsquat\b|\bdeadlift\b|\bbench\b|\bpesas\b|entrenamiento fuerza)/i.test(t);
        const cardio=!free&&/(?:\bz[1-4]\b|cardio|aer[oó]bic|treadmill|cinta|escaladora|stair stepper|bicicleta)/i.test(t);
        // Generic "plan paciente" is clinical administration, NOT an appointment.
        const prep=/(?:plan pac|planificar paciente|preparar paciente|notas de pacientes|revisar fichas)/i.test(t);
        const clinical=!free&&!prep&&/(?:\bpaciente\b|psicopro|psic[oó]log|psicoterapia|terapia|sesi[oó]n cl[ií]nica|consulta cl[ií]nica)/i.test(t);
        const busy=!free&&cell.length>0;
        slots[iso][time]={boxing,gym,cardio,clinical,busy,patientTokens:clinical?patientTokens_(cell):[]};
        if(iso===iso_(now)){
          if(boxing)todayCounts.boxing++;
          if(gym)todayCounts.gym++;
          if(cardio)todayCounts.cardio++;
          if(clinical)todayCounts.clinical++;
        }
      }
    }
  }
  const currentWeek=weekKey_(start);
  const publicData=available.includes(currentWeek)
    ?{state:'ok',week:currentWeek,today:todayCounts,
      message:'Hoy: '+todayCounts.boxing+' bloques boxeo · '+todayCounts.gym+' gimnasio · '+todayCounts.cardio+' cardio · '+todayCounts.clinical+' clínica'}
    :{state:'partial',week:currentWeek,today:null,message:'Sin pestaña Matrix de la semana '+currentWeek};
  return {publicData,slots,available};
}
function planTypes_(text) {
  const t=String(text||'').toLowerCase();
  const found=[];
  if(/🥊|\bboxeo\b|\bboxing\b|\bsparring\b|\bkpi\b|\bppm\b|\bdensity\b|\bspeed\b/.test(t))found.push('boxing');
  if(/🏋|\bgym\b|\blegs\b|\bpull\b|\bpush\b|\bsquat\b|\bdeadlift\b|\bbench\b|\bstrength\b|\bfuerza\b/.test(t))found.push('gym');
  if(/\bz2\b|\bz3\b|cardio|aerobic|aeróbic|\bstair\b|\btreadmill\b/.test(t))found.push('cardio');
  return found;
}
function isSessionHeader_(text) {
  // User M9 execution log: one MON/TUE/etc top-level day header.
  const first=String(text||'').split('\n')[0].trim();
  return /^[^\w]{0,5}\s*(?:MON|TUE|WED|THU|FRI|SAT|SUN)\b/i.test(first);
}
function readTraining_(id,now) {
  const daily=values_(id,"'Daily log'!A2:D1200");
  const drg=values_(id,"'drg'!A2:L800");
  const todayIso=iso_(now);
  const drgs=[];
  for(let i=0;i<drg.length;i++){
    const row=drg[i];
    const d=parseDmy_(row[2]);
    if(!d||iso_(d)>todayIso)continue;
    const rawOutput=String(row[11]||'').trim();
    const score=money_(row[9]);
    const stop=/^(yes|si|sí|true|1)$/i.test(String(row[10]||'').trim());
    if(!rawOutput&&score===null&&!stop)continue;
    drgs.push({iso:iso_(d),date:String(row[2]||''),score,
      output:rawOutput.replace(/[^A-Za-z0-9 -]/g,'').slice(0,24)||'SIN SALIDA',
      hardStop:stop,index:i});
  }
  drgs.sort((a,b)=>b.iso.localeCompare(a.iso)||b.index-a.index);
  const current=drgs.find(x=>x.iso===todayIso)||null;
  const latest=drgs[0]||null;
  const weekEnd=plusDays_(startMonday_(now),13);
  const headerDays={};
  for(const row of daily){
    const d=parseDmy_(row[1]);
    if(!d||d>weekEnd)continue;
    const plan=String(row[2]||'');
    if(!isSessionHeader_(plan))continue;
    const done=String(row[3]||'').trim();
    // Cancelled work is not a booking obligation.
    if(/not done|cancel|ill\b|enferm|⛔|abort|drop\b/i.test(done))continue;
    const iso=iso_(d);
    if(iso<todayIso)continue;
    const kinds=planTypes_(plan.split('\n')[0]);
    if(kinds.length===0)continue;
    if(!headerDays[iso])headerDays[iso]={};
    for(const k of kinds)headerDays[iso][k]=true;
  }
  const plans=[];
  for(const iso of Object.keys(headerDays).sort())for(const kind of Object.keys(headerDays[iso]))plans.push({date:iso,kind});
  const afterMonday=iso_(plusDays_(startMonday_(now),7));
  const nextWeekScheduled=plans.some(p=>p.date>=afterMonday);
  const from=iso_(plusDays_(now,-7));
  const doneCount=daily.filter(row=>{
    const d=parseDmy_(row[1]);
    return d&&iso_(d)>=from&&iso_(d)<=todayIso&&/\bdone\b|completad|realizad/i.test(String(row[3]||''));
  }).length;
  const drgToday=current?{date:current.date,score:current.score,output:current.output,hardStop:current.hardStop}:null;
  const drgLatest=latest?{date:latest.date,score:latest.score,output:latest.output}:null;
  return {publicData:{
      state:'ok',drgToday,drgLatest,
      drgState:drgToday?(drgToday.output==='SIN SALIDA'?'incomplete':'recorded'):'missing',
      completedRows7d:doneCount,scheduledKinds:plans.length,
      nextWeekScheduled,
      message:drgToday?'DRG hoy: '+drgToday.output+' · puntuación '+(drgToday.score===null?'pendiente':drgToday.score):
        'Sin DRG válido de hoy. Último registro: '+(latest?latest.date:'no disponible')
    },plans};
}
/**
 * PSICOPRO: count confirmed-looking bookings in B3:F15.
 * Repeated placeholders across six+ cells are ignored (in source: many identical
 * free/unassigned cells). Never expose patient names or original text.
 */
function readClinical_(id,now) {
  const tabs=titles_(id);
  const goals=values_(id,"'Objetivos/Paciente'!A1:C4");
  const baseline=goals[1]||[];
  const targetRow=goals[2]||[];
  const weekly=/clasificad.*semanal/i.test(String(baseline[1]||''))?money_(baseline[0]):null;
  const target= /objetivo habitual/i.test(String(targetRow[1]||'')) ? money_(targetRow[0]) : RV_TARGET_WEEKLY;
  const usable=weekly!==null&&target!==null&&target>0&&weekly>=0;
  const delta=usable?weekly-target:null;
  const monday=startMonday_(now);
  if(day_(now)>=6)monday.setDate(monday.getDate()+7);
  const key=weekKey_(monday);
  const tab=matchTab_(tabs,key);
  const publicData={
    state:usable?'ok':'partial',weekly:usable?weekly:null,target:RV_TARGET_WEEKLY,
    gap:usable?delta:null,week:key,bookedBlocks:null,
    message:usable?weekly+' / '+RV_TARGET_WEEKLY+' pacientes semanales · '+(delta<0?'faltan '+Math.abs(delta):delta>0?'sobre objetivo por '+delta:'meta alcanzada'):'No se pudo validar cupos semanales'
  };
  if(!tab){publicData.agendaState='missing';publicData.message+=' · Sin agenda de la semana '+key;return {publicData,bookings:[]};}
  // Only time rows A3:F15, not side notes nor patient-objective cells.
  const rows=values_(id,"'"+tab.replace(/'/g,"''")+"'!A3:F15");
  const freq={};
  for(const row of rows)for(let day=1;day<=5;day++){
    const s=String(row[day]||'').trim();
    if(s)freq[s]=(freq[s]||0)+1;
  }
  const bookings=[];
  for(const row of rows){
    const time=hour_(row[0]);
    if(time===null)continue;
    for(let weekday=0;weekday<5;weekday++){
      const content=String(row[weekday+1]||'').trim();
      if(isFree_(content))continue;
      // Heuristic for recurring placeholder, not 42 patient appointments.
      if(freq[content]>=6&&!/(?:\bpaciente\b|psicop|confirmad)/i.test(content))continue;
      if(/^(?:nuevo paciente|por confirmar|sin confirmar|bloqueado|no disponible)$/i.test(content))continue;
      bookings.push({date:iso_(plusDays_(monday,weekday)),time,patientTokens:patientTokens_(content)});
    }
  }
  publicData.agendaState='ok';
  publicData.bookedBlocks=bookings.length;
  publicData.message+=' · '+bookings.length+' bloques de agenda detectados en semana '+key;
  return {publicData,bookings};
}
function readFinance_(id,now,props) {
  const tabs=titles_(id);
  const preferred=props.getProperty('FINANCE_BUDGET_TAB')||'Pre Oct';
  const tab=tabs.includes(preferred)?preferred:(tabs.includes('Presupuesto')?'Presupuesto':null);
  if(!tab)return {state:'partial',message:'No existe pestaña presupuestaria configurada'};
  const rows=values_(id,"'"+tab.replace(/'/g,"''")+"'!A1:C60");
  const monthRow=rows.find(r=>/^mes activo$/i.test(String(r[0]||'').trim()));
  const sourceMonth=monthRow?monthKey_(monthRow[1]):null;
  const row=rows.find(r=>/total presupuesto/i.test(String(r[0]||'')));
  if(!row)return {state:'partial',tab,month:sourceMonth,message:'No se encontró fila «Total presupuesto»'};
  const budget=money_(row[1]),spent=money_(row[2]);
  if(budget===null||spent===null||budget<=0)return {state:'partial',tab,month:sourceMonth,message:'Presupuesto o gasto sin cifra válida'};
  const diff=spent-budget;
  const over=Math.max(0,diff);
  const remaining=Math.max(0,-diff);
  const pct=Number((100*diff/budget).toFixed(1));
  const current=sourceMonth===Utilities.formatDate(now,RV_TZ,'yyyy-MM');
  return {state:current?'ok':'stale',month:sourceMonth,
    budget,spent,difference:diff,over,remaining,pct,
    message:(current?'Mes actual':'Mes sin actualizar')+' · '+(diff>0?'Sobre presupuesto por '+clp_(over):diff<0?'Bajo presupuesto por '+clp_(remaining):'Presupuesto justo')+
      ' CLP ('+pct+'%)'};
}
function clp_(n){return Math.round(n).toLocaleString('es-CL');}
function reconcileTraining_(plans,matrix){
  const missing=[];
  const available=new Set(matrix.available);
  for(const plan of plans){
    const d=parseIso_(plan.date);
    const monday=weekKey_(startMonday_(d));
    if(!available.has(monday))continue; // missing Matrix tab != missing appointment
    const daySlots=matrix.slots[plan.date]||{};
    const covered=Object.keys(daySlots).some(key=>Boolean(daySlots[key][plan.kind]));
    if(!covered)missing.push({date:plan.date,type:plan.kind});
  }
  return {total:missing.length,items:missing.slice(0,8)};
}
function parseIso_(iso){
  const parts=String(iso).split('-').map(Number);
  return new Date(parts[0],parts[1]-1,parts[2],12);
}
function reconcileClinical_(bookings,matrix){
  const missing=[],conflicts=[],possibleDifferent=[];
  const available=new Set(matrix.available);
  for(const booked of bookings){
    const week=weekKey_(startMonday_(parseIso_(booked.date)));
    if(!available.has(week))continue;
    const slot=(matrix.slots[booked.date]||{})[booked.time];
    const issue={date:booked.date,hour:String(Math.floor(booked.time/60)).padStart(2,'0')+':'+String(booked.time%60).padStart(2,'0')};
    if(slot?.clinical){
      const left=booked.patientTokens||[],right=slot.patientTokens||[];
      // When both have identifiable tokens but no overlap, flag only for review.
      if(left.length&&right.length&&!left.some(x=>right.includes(x)))possibleDifferent.push(issue);
      continue;
    }
    if(slot?.busy)conflicts.push(issue);
    else missing.push(issue);
  }
  return {missing:missing.length,conflicts:conflicts.length,possibleDifferent:possibleDifferent.length,
    items:missing.slice(0,8),collisionItems:conflicts.slice(0,8),identityItems:possibleDifferent.slice(0,8)};
}
/**
 * Only RPC endpoint. The private UI receives aggregate metrics and dates/hours,
 * never patient names, identifiers, raw spreadsheet rows or Calendar titles.
 */
function getDashboard(){
  const now=new Date();
  const props=PropertiesService.getScriptProperties();
  const out={
    generatedAt:now.toISOString(),
    calendar:{state:'unavailable',message:'No disponible'},
    matrix:{state:'unconfigured',message:'No configurada'},
    training:{state:'unconfigured',message:'No configurada'},
    clinical:{state:'unconfigured',message:'No configurada'},
    finance:{state:'unconfigured',message:'No configurada'},
    comparisons:{training:{state:'unavailable',total:null,items:[]},
      clinical:{state:'unavailable',missing:null,conflicts:null,possibleDifferent:null,items:[],collisionItems:[],identityItems:[]}},
    nextAction:{title:'Verificar fuentes',reason:'No hay resultados confiables todavía',level:'normal'},
    alerts:[]
  };
  let matrix=null,training=null,clinical=null;
  try{out.calendar=readCalendar_(now);}catch(e){out.calendar={state:'error',message:'No se pudo consultar Calendar'};}
  const idFor=name=>{const value=String(props.getProperty(name)||'').trim();return /^[a-zA-Z0-9_-]{15,}$/.test(value)?value:null;};
  const matrixId=idFor('MATRIX_SHEET_ID'),trainingId=idFor('TRAINING_SHEET_ID'),
    clinicalId=idFor('CLINICAL_SHEET_ID'),financeId=idFor('FINANCE_SHEET_ID');
  if(matrixId){try{matrix=readMatrix_(matrixId,now);out.matrix=matrix.publicData;
    out.matrix.url='https://docs.google.com/spreadsheets/d/'+matrixId+'/edit';}
    catch(e){out.matrix=registerError_();}}
  if(trainingId){try{training=readTraining_(trainingId,now);out.training=training.publicData;
    out.training.url='https://docs.google.com/spreadsheets/d/'+trainingId+'/edit';}
    catch(e){out.training=registerError_();}}
  if(clinicalId){try{clinical=readClinical_(clinicalId,now);out.clinical=clinical.publicData;
    out.clinical.url='https://docs.google.com/spreadsheets/d/'+clinicalId+'/edit';}
    catch(e){out.clinical=registerError_();}}
  if(financeId){try{out.finance=readFinance_(financeId,now,props);
    out.finance.url='https://docs.google.com/spreadsheets/d/'+financeId+'/edit';}
    catch(e){out.finance=registerError_();}}
  if(training&&matrix){out.comparisons.training=Object.assign({state:'ok'},reconcileTraining_(training.plans,matrix));}
  if(clinical&&matrix&&clinical.publicData.agendaState==='ok'){
    const weekAvailable=matrix.available.includes(clinical.publicData.week);
    out.comparisons.clinical=weekAvailable?
      Object.assign({state:'ok'},reconcileClinical_(clinical.bookings,matrix)):
      {state:'partial',missing:null,conflicts:null,items:[],collisionItems:[],message:'No existe pestaña correspondiente de Matrix'};
  }
  const todayDrg=out.training.drgToday;
  const missingClinical=out.comparisons.clinical.missing;
  const collisionClinical=out.comparisons.clinical.conflicts;
  const missingTraining=out.comparisons.training.total;
  const differentClinical=out.comparisons.clinical.possibleDifferent;
  if(todayDrg&&(todayDrg.hardStop||/\bABORT\b/i.test(todayDrg.output))){
    out.nextAction={title:'DRG: detener carga',reason:'Hard Stop o ABORT en la evaluación de hoy.',level:'critical'};
  }else if(out.calendar.state==='ok'&&out.calendar.next&&out.calendar.next.minutesUntil<=120&&out.calendar.next.minutesUntil>=0){
    out.nextAction={title:'Preparar próximo compromiso',reason:'Hay un evento de calendario en menos de dos horas.',level:'high'};
  }else if(collisionClinical>0){
    out.nextAction={title:'Resolver conflicto PSICOPRO / Matrix',reason:collisionClinical+' citas coinciden con otra actividad en Matrix.',level:'high'};
  }else if(missingClinical>0){
    out.nextAction={title:'Agendar pacientes en Matrix',reason:missingClinical+' bloques PSICOPRO no aparecen en Matrix.',level:'high'};
  }else if(differentClinical>0){
    out.nextAction={title:'Comprobar identidad en agenda',reason:differentClinical+' citas coinciden en horario, pero podrían tener pacientes distintos en Matrix.',level:'medium'};
  }else if(missingTraining>0){
    out.nextAction={title:'Agendar entrenamientos en Matrix',reason:missingTraining+' sesiones planificadas en MTS faltan en Matrix.',level:'high'};
  }else if(out.finance.state==='ok'&&out.finance.over>0){
    out.nextAction={title:'Revisar exceso de presupuesto',reason:'Gasto mensual sobre presupuesto por '+clp_(out.finance.over)+' CLP.',level:'medium'};
  }else if(out.clinical.state==='ok'&&out.clinical.gap<0){
    out.nextAction={title:'Completar cupos semanales',reason:'Faltan '+Math.abs(out.clinical.gap)+' pacientes para meta de '+RV_TARGET_WEEKLY+'.',level:'medium'};
  }else if(todayDrg&&/\bCUT/i.test(todayDrg.output)){
    out.nextAction={title:'Ajustar entrenamiento según DRG',reason:'La evaluación de hoy indica CUT.',level:'medium'};
  }else if(out.training.state==='ok'&&!todayDrg&&out.matrix.state==='ok'&&
    (out.matrix.today.boxing+out.matrix.today.gym+out.matrix.today.cardio)>0){
    out.nextAction={title:'Registrar DRG de hoy',reason:'Hay entrenamiento en Matrix, pero falta la evaluación diaria.',level:'medium'};
  }else if(out.training.state==='ok'&&!out.training.nextWeekScheduled){
    out.nextAction={title:'Revisar programación MTS próxima semana',reason:'No aparecen sesiones activas planificadas para la próxima semana.',level:'normal'};
  }
  if(collisionClinical>0)out.alerts.push('PSICOPRO: '+collisionClinical+' posibles solapamientos');
  if(missingClinical>0)out.alerts.push('PSICOPRO: '+missingClinical+' citas ausentes en Matrix');
  if(differentClinical>0)out.alerts.push('PSICOPRO: '+differentClinical+' posibles discrepancias de paciente');
  if(missingTraining>0)out.alerts.push('MTS: '+missingTraining+' entrenamientos no agendados');
  if(out.clinical.state==='ok'&&out.clinical.gap<0)out.alerts.push('Cupos: faltan '+Math.abs(out.clinical.gap)+' para '+RV_TARGET_WEEKLY);
  if(out.finance.state==='ok'&&out.finance.over>0)out.alerts.push('Finanzas: exceso '+clp_(out.finance.over)+' CLP');
  if(out.training.state==='ok'&&!todayDrg)out.alerts.push('DRG: sin evaluación válida hoy');
  if(out.training.state==='ok'&&!out.training.nextWeekScheduled)out.alerts.push('MTS: sin programación activa próxima semana');
  return out;
}
