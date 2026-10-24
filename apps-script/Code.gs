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
function sheetMetadata_(id) {
  const data=Sheets.Spreadsheets.get(id,{fields:'sheets.properties(title,sheetId)'});
  return (data.sheets||[]).map(s=>({title:String(s.properties?.title||''),gid:s.properties?.sheetId}));
}
function titles_(id) { return sheetMetadata_(id).map(s=>s.title); }
function tabUrl_(id,tab,metadata) {
  const entry=(metadata||sheetMetadata_(id)).find(s=>s.title===tab);
  return 'https://docs.google.com/spreadsheets/d/'+id+'/edit'+
    (entry&&Number.isSafeInteger(entry.gid)?'#gid='+entry.gid:'');
}
// Whitelisted exercise labels only, never raw Matrix cell contents or names.
function trainingLabels_(cell) {
  const t=String(cell||'').toLowerCase();
  const labels=[];
  if(/boxeo|boxing|sparring|\bppm\b|saco de box/.test(t)){
    if(/\bsparring\b/.test(t))labels.push('Sparring');
    else if(/\bclase\b/.test(t))labels.push('Clase boxeo');
    else if(/\bfree\b|\blibre\b/.test(t))labels.push('Boxeo libre');
    else labels.push('Boxeo');
  }
  if(/deadlift|peso muerto/.test(t))labels.push('Deadlift');
  else if(/squat|sentadilla|\blegs\b|piernas/.test(t))labels.push('Squat / piernas');
  else if(/\bpull\b|espalda|remo/.test(t))labels.push('Pull / espalda');
  else if(/\bpush\b|pecho|tricep/.test(t))labels.push('Push / pecho');
  else if(/\bcore\b/.test(t))labels.push('Core');
  else if(/mobility|movilidad/.test(t))labels.push('Movilidad');
  else if(/\bgym\b|gimnasio|\bpesas\b/.test(t))labels.push('Gimnasio');
  if(/\bz2\b/.test(t))labels.push('Z2');
  else if(/\bz3\b/.test(t))labels.push('Z3');
  else if(/cardio|aer[oó]bic|treadmill|escaladora/.test(t))labels.push('Cardio');
  return labels;
}
function slotDescription_(entry){
  const date=parseIso_(entry.date);
  const weekday=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][date.getDay()];
  const m=entry.date.match(/\d{4}-(\d{2})-(\d{2})/);
  return weekday+' '+m[2]+'/'+m[1]+(entry.hour?' '+entry.hour:'');
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
  const until=new Date(now.getTime()+48*60*60*1000);
  const calendar=CalendarApp.getDefaultCalendar();
  const upcoming=calendar.getEvents(now,until).filter(e=>e.getEndTime()>now)
    .sort((a,b)=>a.getStartTime()-b.getStartTime());
  const first=upcoming[0]||null;
  // Today's remaining items, including events already in progress.
  // Titles are returned ONLY by the owner-restricted Apps Script web app.
  // No descriptions, guest lists or clinical metadata are sent.
  const remainingToday=calendar.getEventsForDay(now)
    .filter(e=>e.getEndTime()>now)
    .sort((a,b)=>a.getStartTime()-b.getStartTime());
  const nextToday=remainingToday.slice(0,8).map(event=>({
    title:String(event.getTitle()||'Sin título').trim().slice(0,120),
    start:event.getStartTime().toISOString(),
    end:event.getEndTime().toISOString(),
    allDay:Boolean(event.isAllDayEvent()),
    ongoing:event.getStartTime().getTime()<now.getTime()
  }));
  return {state:'ok',upcoming48h:upcoming.length,
    next:first?{start:first.getStartTime().toISOString(),minutesUntil:Math.round((first.getStartTime()-now)/60000)}:null,
    todayDate:iso_(now),todayRemaining:remainingToday.length,
    todayEvents:nextToday,
    message:upcoming.length+' eventos próximos 48 h · '+remainingToday.length+' restantes hoy'};
}
/**
 * Read current & next Matrix weekly tabs. Return a public aggregate and
 * ephemeral INTERNAL enum-only slot map: no appointment text leaves server.
 */
function readMatrix_(id,now) {
  const metadata=sheetMetadata_(id),tabs=metadata.map(s=>s.title);
  const start=startMonday_(now);
  const needed=[start,plusDays_(start,7)];
  const slots={},descriptions={};
  const available=[];
  const todayIso=iso_(now);
  let todayCounts={boxing:0,gym:0,cardio:0,clinical:0};
  const weekHours={boxing:0,gym:0,sleep:0,clinicalMatrix:0};
  let observedHourRows=0;
  let currentWeekSeen=false;
  for(const begin of needed){
    const key=weekKey_(begin);
    const tab=matchTab_(tabs,key);
    if(!tab)continue;
    available.push(key);
    const thisWeek=key===weekKey_(start);
    if(thisWeek)currentWeekSeen=true;
    const rows=values_(id,"'"+tab.replace(/'/g,"''")+"'!A3:H26");
    for(const row of rows){
      const time=hour_(row[0]);
      if(time===null)continue;
      if(thisWeek)observedHourRows++;
      for(let weekday=0;weekday<7;weekday++){
        const cell=String(row[weekday+1]||'').trim();
        const iso=iso_(plusDays_(begin,weekday));
        if(!slots[iso])slots[iso]={};
        const t=cell.toLowerCase();
        const sleep=/^(?:zz\s*:|z{2,}\b|dormir\b|dormido\b|sleep\b|sueño\b|siesta\b)/i.test(cell);
        const free=isFree_(cell)||sleep||/^(?:descanso|comida|almuerzo)\s*:?\s*$/i.test(cell);
        const boxing=!free&&/(?:boxeo|boxing|sparring|\bppm\b|saco de box|clase box)/i.test(t);
        const gym=!free&&/(?:\bgym\b|gimnasio|\bsquat\b|\bdeadlift\b|\bbench\b|\bpesas\b|entrenamiento fuerza)/i.test(t);
        const cardio=!free&&/(?:\bz[1-4]\b|cardio|aer[oó]bic|treadmill|cinta|escaladora|stair stepper|bicicleta)/i.test(t);
        const prep=/(?:plan pac|planificar paciente|preparar paciente|notas de pacientes|revisar fichas)/i.test(t);
        const clinical=!free&&!prep&&/(?:\bpaciente\b|psicopro|psic[oó]log|psicoterapia|terapia|sesi[oó]n cl[ií]nica|consulta cl[ií]nica)/i.test(t);
        const busy=!free&&cell.length>0;
        slots[iso][time]={boxing,gym,cardio,clinical,busy,
          // Raw text is kept inside the owner-only server response only for
          // genuinely unmatched Matrix clinical appointments.
          privateClinicalLabel:clinical?cell.slice(0,150):null,
          patientTokens:clinical?patientTokens_(cell):[]};
        if(thisWeek){
          if(boxing)weekHours.boxing++;
          if(gym)weekHours.gym++;
          if(sleep)weekHours.sleep++;
          if(clinical)weekHours.clinicalMatrix++;
        }
        if(iso===todayIso){
          if(boxing)todayCounts.boxing++;
          if(gym)todayCounts.gym++;
          if(cardio)todayCounts.cardio++;
          if(clinical)todayCounts.clinical++;
        }
        if(!free){
          const tags=trainingLabels_(cell);
          if(tags.length){
            if(!descriptions[iso])descriptions[iso]={labels:[],types:[]};
            for(const tag of tags)if(!descriptions[iso].labels.includes(tag))descriptions[iso].labels.push(tag);
            for(const type of ['boxing','gym','cardio'])
              if(({boxing,gym,cardio})[type]&&!descriptions[iso].types.includes(type))
                descriptions[iso].types.push(type);
          }
        }
      }
    }
  }
  const currentWeek=weekKey_(start),nextWeek=weekKey_(plusDays_(start,7));
  const currentTab=matchTab_(tabs,currentWeek);
  const nextTab=matchTab_(tabs,nextWeek);
  const todayActivities=descriptions[todayIso]?.labels||[];
  const futureDays=Object.keys(descriptions).filter(d=>d>todayIso)
    .sort().map(date=>({date,title:descriptions[date].labels.join(' + '),types:descriptions[date].types}));
  const nextWeekTrainingDays=futureDays.filter(item=>item.date>=iso_(plusDays_(start,7))&&
    item.date<=iso_(plusDays_(start,13))&&item.types.length);
  const publicData=currentTab
    ?{state:'ok',week:currentWeek,today:todayCounts,todayDate:todayIso,
      todayTitle:todayActivities.length?todayActivities.join(' + '):'Sin entrenamiento explícito',
      nextTrainingDays:futureDays.slice(0,4),
      nextWeekTrainingDays:nextWeekTrainingDays.slice(0,7),
      nextWeek:nextWeek,nextWeekReady:!!nextTab,
      weeklyHours:{
        boxing:weekHours.boxing,gym:weekHours.gym,sleep:weekHours.sleep,
        clinicalMatrix:weekHours.clinicalMatrix,
        week:currentWeek,hourSlotMinutes:60,
        complete:observedHourRows>=24,
        source:'Bloques de 1 hora planificados en Matrix; no representan ejecución real'
      },
      url:tabUrl_(id,currentTab,metadata),
      nextWeekUrl:nextTab?tabUrl_(id,nextTab,metadata):null,
      message:'Hoy: '+todayCounts.boxing+' bloques boxeo · '+todayCounts.gym+' gimnasio · '+todayCounts.cardio+' cardio · '+todayCounts.clinical+' clínica'}
    :{state:'partial',week:currentWeek,today:null,todayDate:todayIso,
      todayTitle:'Sin pestaña Matrix actual',nextTrainingDays:[],nextWeekTrainingDays:[],
      nextWeek,nextWeekReady:!!nextTab,weeklyHours:null,
      url:nextTab?tabUrl_(id,nextTab,metadata):null,
      nextWeekUrl:nextTab?tabUrl_(id,nextTab,metadata):null,
      message:'Sin pestaña Matrix de la semana '+currentWeek};
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
  const metadata=sheetMetadata_(id);
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
  let lastProgrammedDate=null;
  for(const row of daily){
    const d=parseDmy_(row[1]);
    if(!d)continue;
    const plan=String(row[2]||'');
    if(!isSessionHeader_(plan))continue;
    const sessionDate=iso_(d);
    if(!lastProgrammedDate || sessionDate>lastProgrammedDate)lastProgrammedDate=sessionDate;
    if(d>weekEnd)continue; // scan entire log for recency, compare only next 14 days
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
  const recentHeaders=daily.filter(row=>{
    const d=parseDmy_(row[1]);
    return d&&iso_(d)>=from&&iso_(d)<=todayIso&&isSessionHeader_(row[2]);
  });
  const isComplete=status=>/^(?:done|completed|completad[ao]|realizad[ao]|hecho|✅)(?:\b|\s)/i.test(String(status||'').trim())&&
    !/not done|no realizado/i.test(String(status||''));
  const completedSessions7d=recentHeaders.filter(row=>isComplete(row[3])).length;
  const omittedSessions7d=recentHeaders.filter(row=>
    /not done|cancel|ill\b|enferm|⛔|abort|drop\b/i.test(String(row[3]||''))).length;
  const drgToday=current?{date:current.date,score:current.score,output:current.output,hardStop:current.hardStop}:null;
  const drgLatest=latest?{date:latest.date,score:latest.score,output:latest.output}:null;
  return {publicData:{
      state:'ok',drgToday,drgLatest,
      drgState:drgToday?(drgToday.output==='SIN SALIDA'?'incomplete':'recorded'):'missing',
      completedSessions7d,omittedSessions7d,sessionHeaders7d:recentHeaders.length,
      scheduledKinds:plans.length,
      nextWeekScheduled,lastProgrammedDate,
      drgUrl:tabUrl_(id,'drg',metadata),
      dailyLogUrl:tabUrl_(id,'Daily log',metadata),
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
  const metadata=sheetMetadata_(id),tabs=metadata.map(s=>s.title);
  const goals=values_(id,"'Objetivos/Paciente'!A1:C4");
  const baseline=goals[1]||[];
  const targetRow=goals[2]||[];
  const weekly=/clasificad.*semanal/i.test(String(baseline[1]||''))?money_(baseline[0]):null;
  const sheetTarget=/objetivo habitual/i.test(String(targetRow[1]||''))?money_(targetRow[0]):null;
  const targetMatches=sheetTarget===RV_TARGET_WEEKLY;
  const usable=weekly!==null&&weekly>=0&&targetMatches;
  const delta=usable?weekly-RV_TARGET_WEEKLY:null;
  const monday=startMonday_(now);
  if(day_(now)>=6)monday.setDate(monday.getDate()+7);
  const key=weekKey_(monday);
  const tab=matchTab_(tabs,key);
  const publicData={
    state:usable?'ok':'partial',weekly:usable?weekly:null,target:RV_TARGET_WEEKLY,
    gap:usable?delta:null,week:key,bookedBlocks:null,
    url:null,goalsUrl:tabUrl_(id,'Objetivos/Paciente',metadata),
    message:usable?weekly+' / '+RV_TARGET_WEEKLY+' pacientes semanales · '+(delta<0?'faltan '+Math.abs(delta):delta>0?'sobre objetivo por '+delta:'meta alcanzada'):
      (targetMatches?'No se pudo validar pacientes clasificados':'La meta de la hoja no coincide con 15: revisar antes de comparar')
  };
  if(!tab){publicData.agendaState='missing';publicData.message+=' · Sin agenda de la semana '+key;return {publicData,bookings:[]};}
  publicData.url=tabUrl_(id,tab,metadata);
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
  const metadata=sheetMetadata_(id),tabs=metadata.map(s=>s.title);
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
  // Use the existing category summary only. Exclude income, raw bank movements,
  // and handwritten notes; they do not belong in the dashboard.
  const heading=rows.findIndex(r=>/categor[ií]a/i.test(String(r[0]||''))&&/presupuesto/i.test(String(r[1]||'')));
  const totalIdx=rows.findIndex(r=>/total presupuesto/i.test(String(r[0]||'')));
  const categories=heading>=0&&totalIdx>heading?rows.slice(heading+1,totalIdx):[];
  let sumBudget=0,sumSpent=0;
  const overages=[],unbudgeted=[];
  for(const line of categories){
    const category=String(line[0]||'').trim().slice(0,75);
    if(!category||/^(?:total|ingreso|saldo|ahorro|rescate)/i.test(category))continue;
    const planned=money_(line[1]),actual=money_(line[2]);
    if(planned!==null)sumBudget+=planned;
    if(actual!==null)sumSpent+=actual;
    if(planned!==null&&actual!==null&&actual>planned){
      overages.push({category,over:actual-planned,budget:planned,actual});
    }
    if(planned===null&&actual!==null&&actual>0)unbudgeted.push({category,amount:actual});
  }
  const reconciled=Boolean(categories.length)&&sumBudget===budget&&sumSpent===spent;
  const topOverages=overages.sort((a,b)=>b.over-a.over).slice(0,3);
  const unbudgetedAmount=unbudgeted.reduce((total,item)=>total+item.amount,0);
  const diff=spent-budget;
  const over=Math.max(0,diff);
  const remaining=Math.max(0,-diff);
  const pct=Number((100*diff/budget).toFixed(1));
  const current=sourceMonth===Utilities.formatDate(now,RV_TZ,'yyyy-MM');
  return {state:!reconciled?'partial':current?'ok':'stale',month:sourceMonth,
    url:tabUrl_(id,tab,metadata),
    budget,spent,difference:diff,over,remaining,pct,
    categoryReconciled:reconciled,topOverages,unbudgetedCount:unbudgeted.length,unbudgetedAmount,
    message:!reconciled?'Totales y categorías no concuerdan: verificar fórmula o rango':
      (current?'Mes actual':'Mes sin actualizar')+' · '+(diff>0?'Sobre presupuesto por '+clp_(over):diff<0?'Bajo presupuesto por '+clp_(remaining):'Presupuesto justo')+
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
function upcomingMatrixWithoutPlan_(matrix,training,now) {
  const start=startMonday_(now);
  const nextKey=weekKey_(plusDays_(start,7));
  if(!matrix.available.includes(nextKey))
    return {state:'matrix_missing',total:null,matrixOnlyDays:null,
      matrixOnlyItems:[],message:'No se encontró Matrix para '+nextKey+'.'};
  const matrixDays=matrix.publicData.nextWeekTrainingDays||[];
  const plans=training.plans.filter(p=>p.date>=iso_(plusDays_(start,7))&&
    p.date<=iso_(plusDays_(start,13)));
  const plannedDates=new Set(plans.map(p=>p.date));
  const mismatches=matrixDays.filter(day=>!plannedDates.has(day.date))
    .map(day=>({date:day.date,title:day.title}));
  return {state:plans.length?'ok':'no_plan',
    total:null,matrixOnlyDays:mismatches.length,matrixOnlyItems:mismatches.slice(0,7),
    week:nextKey,lastProgrammedDate:training.publicData.lastProgrammedDate,
    message:plans.length?
      mismatches.length+' jornadas Matrix sin entrada MTS equivalente en semana '+nextKey:
      'MTS no tiene programación activa para '+nextKey+'. Matrix contiene '+matrixDays.length+' jornadas de entrenamiento.'};
}
function slotSummary_(slots,limit) {
  const first=(slots||[]).slice(0,limit||4).map(slotDescription_);
  const extra=(slots||[]).length-first.length;
  return first.join('; ')+(extra>0?' (+'+extra+' más)':'');
}
function reconcileClinical_(bookings,matrix,week){
  const missing=[],conflicts=[],possibleDifferent=[],matrixOnly=[];
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
  // Reverse reconciliation: possible appointment recorded in personal Matrix
  // but not in the shared PSICOPRO schedule for the SAME week.
  const agendaKeys=new Set(bookings.map(x=>x.date+'|'+x.time));
  for(const date of Object.keys(matrix.slots)){
    const d=parseIso_(date);
    if(weekKey_(startMonday_(d))!==week || day_(d)>5)continue;
    for(const key of Object.keys(matrix.slots[date]||{})){
      const slot=matrix.slots[date][key];
      if(!slot?.clinical || agendaKeys.has(date+'|'+key))continue;
      const minutes=Number(key);
      matrixOnly.push({date,hour:String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0'),
        // Private owner view. Never commit or log the clinical label.
        matrixEntry:slot.privateClinicalLabel||'Actividad clínica sin descripción'});
    }
  }
  return {missing:missing.length,conflicts:conflicts.length,possibleDifferent:possibleDifferent.length,
    matrixOnly:matrixOnly.length,items:missing.slice(0,8),collisionItems:conflicts.slice(0,8),
    identityItems:possibleDifferent.slice(0,8),matrixOnlyItems:matrixOnly.slice(0,8)};
}
/**
 * Only RPC endpoint of the owner-restricted Web App (access=MYSELF).
 * Contains selected Calendar titles and Matrix-only clinical entries because the
 * owner explicitly requested them. Never publish this response in GitHub Pages,
 * shared documents, analytics or logs. Keep deployment access set to Only myself.
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
      clinical:{state:'unavailable',missing:null,conflicts:null,possibleDifferent:null,matrixOnly:null,items:[],collisionItems:[],identityItems:[],matrixOnlyItems:[]}},
    nextAction:{title:'Verificar fuentes',reason:'No hay resultados confiables todavía',level:'normal'},
    alerts:[]
  };
  let matrix=null,training=null,clinical=null;
  try{out.calendar=readCalendar_(now);}catch(e){out.calendar={state:'error',message:'No se pudo consultar Calendar'};}
  const idFor=name=>{const value=String(props.getProperty(name)||'').trim();return /^[a-zA-Z0-9_-]{15,}$/.test(value)?value:null;};
  const matrixId=idFor('MATRIX_SHEET_ID'),trainingId=idFor('TRAINING_SHEET_ID'),
    clinicalId=idFor('CLINICAL_SHEET_ID'),financeId=idFor('FINANCE_SHEET_ID');
  if(matrixId){try{matrix=readMatrix_(matrixId,now);out.matrix=matrix.publicData;
    out.matrix.url=out.matrix.url||'https://docs.google.com/spreadsheets/d/'+matrixId+'/edit';}
    catch(e){out.matrix=registerError_();}}
  if(trainingId){try{training=readTraining_(trainingId,now);out.training=training.publicData;
    out.training.url=out.training.dailyLogUrl||'https://docs.google.com/spreadsheets/d/'+trainingId+'/edit';}
    catch(e){out.training=registerError_();}}
  if(clinicalId){try{clinical=readClinical_(clinicalId,now);out.clinical=clinical.publicData;
    out.clinical.url=out.clinical.url||'https://docs.google.com/spreadsheets/d/'+clinicalId+'/edit';}
    catch(e){out.clinical=registerError_();}}
  if(financeId){try{out.finance=readFinance_(financeId,now,props);
    out.finance.url=out.finance.url||'https://docs.google.com/spreadsheets/d/'+financeId+'/edit';}
    catch(e){out.finance=registerError_();}}
  if(training&&matrix){
    const reverse=upcomingMatrixWithoutPlan_(matrix,training,now);
    out.comparisons.training=training.plans.length?
      Object.assign({state:'ok'},reconcileTraining_(training.plans,matrix),{
        matrixOnlyDays:reverse.matrixOnlyDays,matrixOnlyItems:reverse.matrixOnlyItems,
        week:reverse.week,reverseState:reverse.state
      }):
      Object.assign({total:null,items:[]},reverse);
  }
  if(clinical&&matrix&&clinical.publicData.agendaState==='ok'){
    const weekAvailable=matrix.available.includes(clinical.publicData.week);
    out.comparisons.clinical=weekAvailable?
      Object.assign({state:'ok'},reconcileClinical_(clinical.bookings,matrix,clinical.publicData.week)):
      {state:'partial',missing:null,conflicts:null,items:[],collisionItems:[],message:'No existe pestaña correspondiente de Matrix'};
  }
  const todayDrg=out.training.drgToday;
  const missingClinical=out.comparisons.clinical.missing;
  const collisionClinical=out.comparisons.clinical.conflicts;
  const missingTraining=out.comparisons.training.total;
  const differentClinical=out.comparisons.clinical.possibleDifferent;
  const matrixOnlyClinical=out.comparisons.clinical.matrixOnly;
  if(todayDrg&&(todayDrg.hardStop||/\bABORT\b/i.test(todayDrg.output))){
    out.nextAction={title:'DRG '+todayDrg.output+': detener carga',
      reason:'Evaluación de hoy: '+(todayDrg.score===null?'puntuación pendiente':todayDrg.score+'/10')+
        (todayDrg.hardStop?' · Hard Stop.':' · ABORT.')+
        (out.matrix.state==='ok'&&out.matrix.todayTitle!=='Sin entrenamiento explícito'?
          ' Matrix tiene previsto: '+out.matrix.todayTitle+'.':''),
      level:'critical'};
  }else if(out.calendar.state==='ok'&&out.calendar.next&&out.calendar.next.minutesUntil<=120&&out.calendar.next.minutesUntil>=0){
    out.nextAction={title:'Preparar próximo compromiso',reason:'Hay un evento de calendario en menos de dos horas.',level:'high'};
  }else if(collisionClinical>0){
    out.nextAction={title:'Revisar '+collisionClinical+' solapamientos PSICOPRO',reason:collisionClinical+
      ' horarios coinciden: '+slotSummary_(out.comparisons.clinical.collisionItems,4)+
      '. Verificar ambas pestañas antes de corregir.',level:'high'};
  }else if(missingClinical>0){
    out.nextAction={title:'Agendar pacientes en Matrix',reason:missingClinical+' bloques PSICOPRO no aparecen en Matrix.',level:'high'};
  }else if(differentClinical>0){
    out.nextAction={title:'Comprobar identidad en agenda',reason:differentClinical+' citas coinciden en horario, pero podrían tener pacientes distintos en Matrix.',level:'medium'};
  }else if(matrixOnlyClinical>0){
    out.nextAction={title:'Revisar Matrix hacia PSICOPRO',reason:matrixOnlyClinical+' bloques clínicos de Matrix no se detectaron en la agenda compartida.',level:'medium'};
  }else if(missingTraining>0){
    out.nextAction={title:'Agendar entrenamientos en Matrix',reason:missingTraining+' modalidades programadas en MTS faltan en Matrix.',level:'high'};
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
    out.nextAction={title:'Revisar programación MTS próxima semana',reason:
    out.comparisons.training.state==='no_plan'?
      out.comparisons.training.message:'No aparecen sesiones activas planificadas para la próxima semana.',level:'normal'};
  }
  if(collisionClinical>0)out.alerts.push('PSICOPRO: '+collisionClinical+' posibles solapamientos');
  if(missingClinical>0)out.alerts.push('PSICOPRO: '+missingClinical+' citas ausentes en Matrix');
  if(differentClinical>0)out.alerts.push('PSICOPRO: '+differentClinical+' posibles discrepancias de paciente');
  if(matrixOnlyClinical>0)out.alerts.push('Matrix: '+matrixOnlyClinical+' bloques clínicos sin respaldo PSICOPRO');
  if(missingTraining>0)out.alerts.push('MTS: '+missingTraining+' modalidades no agendadas');
  if(out.clinical.state==='ok'&&out.clinical.gap<0)out.alerts.push('Cupos: faltan '+Math.abs(out.clinical.gap)+' para '+RV_TARGET_WEEKLY);
  if(out.finance.state==='ok'&&out.finance.over>0)out.alerts.push('Finanzas: exceso '+clp_(out.finance.over)+' CLP');
  if(out.finance.state==='partial'&&out.finance.categoryReconciled===false)out.alerts.push('Finanzas: suma de categorías no coincide con el total');
  if(out.finance.state==='stale')out.alerts.push('Finanzas: presupuesto corresponde a otro mes');
  if(out.training.state==='ok'&&!todayDrg)out.alerts.push('DRG: sin evaluación válida hoy');
  if(out.training.state==='ok'&&!out.training.nextWeekScheduled)out.alerts.push('MTS: sin programación activa próxima semana');

  // A decision has: evidence, one next action, and the authoritative source.
  // Limit to three different domains; alerts and source cards retain full detail.
  const suggested=[];
  const recommend=(domain,priority,level,title,evidence,action,certainty,source)=>{
    suggested.push({domain,priority,level,title,evidence,action,certainty,source});
  };
  if(todayDrg&&(todayDrg.hardStop||/\\bABORT\\b/i.test(todayDrg.output))){
    recommend('training',100,'critical','Aplicar DRG ABORT / Hard Stop',
      'DRG '+todayDrg.output+' hoy · '+(todayDrg.score===null?'sin puntuación':todayDrg.score+'/10')+
        (todayDrg.hardStop?' · Hard Stop.':' · ABORT.')+
        (out.matrix.state==='ok'&&out.matrix.todayTitle!=='Sin entrenamiento explícito'?
          ' En Matrix aparece: '+out.matrix.todayTitle+'.':''),
      'No ejecutar cargas ni sesiones de contacto hasta reevaluar el estado y decidir con criterios de seguridad.',
      'verificado','drg');
  }else if(out.training.state==='ok'&&!todayDrg&&out.matrix.state==='ok'&&
      (out.matrix.today.boxing+out.matrix.today.gym+out.matrix.today.cardio)>0){
    recommend('training',83,'high','Evaluar DRG antes de entrenar',
      'Matrix incluye actividad física, pero no hay DRG válido de hoy.',
      'Completar evaluación y aplicar PROCEED, CUT o ABORT antes de la sesión.','verificado','drg');
  }else if(missingTraining>0){
    recommend('training',79,'high','Conciliar MTS con Matrix',
      missingTraining+' modalidades programadas sin bloque. Fechas: '+
        (out.comparisons.training.items||[]).slice(0,5).map(x=>
          slotDescription_(x)+' · '+({boxing:'Boxeo',gym:'Gimnasio',cardio:'Cardio'}[x.type]||'Entrenamiento')).join('; ')+'.',
      'Revisar los días indicados y reservar únicamente los bloques confirmados.','revisar','matrixNext');
  }else if(out.training.state==='ok'&&!out.training.nextWeekScheduled){
    const cmp=out.comparisons.training;
    const first=cmp.matrixOnlyItems?.[0];
    recommend('training',72,'medium','Planificar el próximo ciclo MTS',
      (cmp.state==='no_plan'?
        'Matrix '+cmp.week+' tiene '+cmp.matrixOnlyDays+' jornadas con ejercicio y MTS no tiene sesiones futuras.':
        'Sin sesiones activas la semana siguiente.')+
        ' Último día planificado: '+(out.training.lastProgrammedDate||'no disponible')+'.'+
        (first?' Primer bloque Matrix: '+slotDescription_(first)+' · '+first.title+'.':''),
      'Completar las sesiones en Daily log y contrastar después con Matrix.','verificado','training');
  }
  if(collisionClinical>0){
    recommend('clinical',93,'high','Revisar '+collisionClinical+' solapamientos PSICOPRO',
      collisionClinical+' horarios coinciden: '+slotSummary_(out.comparisons.clinical.collisionItems,6)+'.',
      'Comprobar esas fechas y horas en PSICOPRO y Matrix (semana '+out.clinical.week+') antes de modificar una reserva.','revisar','clinical');
  }else if(missingClinical>0){
    recommend('clinical',89,'high','Completar agenda privada en Matrix',
      missingClinical+' posibles citas faltan en Matrix: '+
        slotSummary_(out.comparisons.clinical.items,5)+'.',
      'Revisar esos bloques en PSICOPRO y en Matrix '+out.clinical.week+
        '; reflejar solo ocupación horaria, sin nombres.','revisar','matrixNext');
  }else if(differentClinical>0){
    recommend('clinical',78,'medium','Verificar coincidencia de pacientes',
      differentClinical+' horarios por revisar: '+
        slotSummary_(out.comparisons.clinical.identityItems,5)+'.',
      'Comprobar identidad directamente en PSICOPRO, sin copiarla al Command Center.','revisar','clinical');
  }else if(matrixOnlyClinical>0){
    recommend('clinical',75,'medium','Verificar reservas Matrix sin PSICOPRO',
      matrixOnlyClinical+' bloques clínicos en Matrix sin cita equivalente: '+
        slotSummary_(out.comparisons.clinical.matrixOnlyItems,5)+'.',
      'Revisar si realmente son sesiones confirmadas antes de agregarlas a PSICOPRO.','revisar','clinical');
  }else if(out.clinical.state==='ok'&&out.clinical.gap<0){
    recommend('clinical',65,'medium','Revisar cupos semanales',
      out.clinical.weekly+' pacientes clasificados para objetivo de '+RV_TARGET_WEEKLY+'.',
      'Examinar disponibilidad real y cupos necesarios, sin confundir pacientes con sesiones.','verificado','clinical');
  }
  if(out.finance.state==='partial'&&out.finance.categoryReconciled===false){
    recommend('finance',91,'high','Reconciliar presupuesto',
      'Las categorías no suman el mismo total que la hoja.',
      'Corregir clasificación o fórmulas antes de interpretar la desviación.','verificado','finance');
  }else if(out.finance.state==='stale'){
    recommend('finance',77,'medium','Actualizar período financiero',
      'El mes de la pestaña no coincide con el mes actual.',
      'Seleccionar o preparar el presupuesto vigente, evitando mostrar cifras históricas como actuales.','verificado','finance');
  }else if(out.finance.state==='ok'&&out.finance.over>0){
    const first=out.finance.topOverages?.[0];
    recommend('finance',73,'medium','Examinar el exceso de presupuesto',
      'Desviación total: '+clp_(out.finance.over)+' CLP ('+out.finance.pct+'%).'+
        (first?' Mayor diferencia de categoría: '+first.category+' ('+clp_(first.over)+' CLP).':''),
      'Revisar gastos discrecionales, partidas extraordinarias y clasificación antes de ajustar límites.','verificado','finance');
  }
  if(out.calendar.state==='ok'&&out.calendar.next&&
     out.calendar.next.minutesUntil>=0&&out.calendar.next.minutesUntil<=120){
    recommend('calendar',97,'high','Preparar próximo compromiso',
      'El siguiente evento comienza en menos de dos horas.',
      'Abrir Calendar y preparar la actividad, sin copiar información clínica al panel.','verificado','calendar');
  }
  out.recommendations=suggested.sort((a,b)=>b.priority-a.priority)
    .filter((x,i,all)=>all.findIndex(y=>y.domain===x.domain)===i)
    .slice(0,3).map(({priority,...rest})=>rest);
  out.sourceHealth={
    available:['matrix','training','clinical','finance'].filter(x=>out[x]?.state==='ok').length,
    total:4,
    issues:['matrix','training','clinical','finance'].filter(x=>out[x]?.state!=='ok')
  };
  return out;
}
