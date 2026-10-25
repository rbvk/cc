/**
 * RV Command Center V9 — owner-only data engine.
 * All current analytics reuse the original read-only Google Sheets readers.
 * SECURITY: Deploy as Me / Only myself. Never Anyone.
 * Private IDs belong only in per-project Script Properties, never GitHub.
 * Authorized scopes: spreadsheets.readonly and calendar.readonly. No automatic weather HTTP calls.
 */
const RV_TZ = 'America/Santiago';
const RV_RELEASE = '2026.10.24.9';
const RV_TARGET_WEEKLY = 15;
const RV_MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const RV_EN_MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

function doGet() {
  // V9 is the only current interface. Recover earlier versions via Git history.
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('RV Command Center — V9 privado')
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
function cellUrl_(id,tab,a1,metadata) {
  const base=tabUrl_(id,tab,metadata);
  return base+(base.includes('#')?'&':'#')+'range='+encodeURIComponent(a1);
}
function dayColumn_(weekday){ return String.fromCharCode(66+weekday); }
function weekDay_(iso){ return day_(parseIso_(iso))-1; }

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
  const auditEvents=calendar.getEvents(now,plusDays_(now,8))
    .filter(event=>!event.isAllDayEvent()&&event.getEndTime()>now)
    .sort((a,b)=>a.getStartTime()-b.getStartTime()).slice(0,100)
    .map(event=>({
      title:String(event.getTitle()||'Evento sin título').trim().slice(0,110),
      date:iso_(event.getStartTime()),
      time:hour_(Utilities.formatDate(event.getStartTime(),RV_TZ,'HH:mm')),
      start:event.getStartTime().toISOString()
    })).filter(event=>event.time!==null);
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
    todayEvents:nextToday,auditEvents,
    message:upcoming.length+' eventos próximos 48 h · '+remainingToday.length+' restantes hoy'};
}
/**
 * Read current & next Matrix weekly tabs. Return a public aggregate and
 * ephemeral INTERNAL enum-only slot map: no appointment text leaves server.
 */
function readMatrix_(id,now) {
  const metadata=sheetMetadata_(id),tabs=metadata.map(s=>s.title);
  const start=startMonday_(now);
  const needed=[plusDays_(start,-7),start,plusDays_(start,7)];
  const slots={},descriptions={};
  const matrixTabInfo={},hourRowsByWeek={};
  const sleepHoursByNight={};
  const available=[];
  const todayIso=iso_(now);
  let todayCounts={boxing:0,gym:0,cardio:0,clinical:0};
  const weekHours={boxing:0,gym:0,sleep:0,clinicalMatrix:0};
  let observedHourRows=0;
  let currentWeekSeen=false;
  const elapsedHours={sleep:0};
  for(const begin of needed){
    const key=weekKey_(begin);
    const tab=matchTab_(tabs,key);
    if(!tab)continue;
    available.push(key);
    matrixTabInfo[key]=tabUrl_(id,tab,metadata);
    hourRowsByWeek[key]={};
    const thisWeek=key===weekKey_(start);
    if(thisWeek)currentWeekSeen=true;
    const rows=values_(id,"'"+tab.replace(/'/g,"''")+"'!A3:H26");
    for(let rowIndex=0;rowIndex<rows.length;rowIndex++){
      const row=rows[rowIndex];
      const time=hour_(row[0]);
      if(time===null)continue;
      hourRowsByWeek[key][time]=rowIndex+3;
      if(thisWeek)observedHourRows++;
      for(let weekday=0;weekday<7;weekday++){
        const cell=String(row[weekday+1]||'').trim();
        const iso=iso_(plusDays_(begin,weekday));
        if(!slots[iso])slots[iso]={};
        const t=cell.toLowerCase();
        const sleep=/^(?:zz\s*:|z{2,}\b|dormir\b|dormido\b|sleep\b|sueño\b|siesta\b)/i.test(cell);
        const protectedTime=sleep||/^(?:descanso|comida|almuerzo|siesta)\b/i.test(cell);
        const free=isFree_(cell)||protectedTime;
        const boxing=!free&&/(?:boxeo|boxing|sparring|\bppm\b|saco de box|clase box)/i.test(t);
        const gym=!free&&/(?:\bgym\b|gimnasio|\bsquat\b|\bdeadlift\b|\bbench\b|\bpesas\b|entrenamiento fuerza)/i.test(t);
        const cardio=!free&&/(?:\bz[1-4]\b|cardio|aer[oó]bic|treadmill|cinta|escaladora|stair stepper|bicicleta)/i.test(t);
        const prep=/(?:plan pac|planificar paciente|preparar paciente|notas de pacientes|revisar fichas)/i.test(t);
        const clinical=!free&&!prep&&/(?:\bpaciente\b|psicopro|psic[oó]log|psicoterapia|terapia|sesi[oó]n cl[ií]nica|consulta cl[ií]nica|atenci[oó]n cl[ií]nica)/i.test(t);
        const busy=!free&&cell.length>0;
        slots[iso][time]={boxing,gym,cardio,clinical,busy,protectedTime,
          cellUrl:cellUrl_(id,tab,dayColumn_(weekday)+(rowIndex+3),metadata),
          // Raw text is kept inside the owner-only server response only for
          // genuinely unmatched Matrix clinical appointments.
          privateClinicalLabel:clinical?cell.slice(0,150):null,
          patientTokens:clinical?patientTokens_(cell):[],
          calendarCandidate:!free&&/(?:reuni[oó]n|compromiso|cita m[eé]dica|consulta m[eé]dica|agenda calendar|evento calendar|presentaci[oó]n|viaje reservado|evento externo)/i.test(cell)};
        if(thisWeek){
          if(boxing)weekHours.boxing++;
          if(gym)weekHours.gym++;
          if(sleep)weekHours.sleep++;
          if(clinical)weekHours.clinicalMatrix++;
          // Zz: is an actual sleep record, according to the owner.
          // A future/ongoing hourly block is not yet a completed hour of sleep.
          if(sleep){
            const blockEnd=plusDays_(begin,weekday);
            blockEnd.setHours(Math.floor(time/60)+1,time%60,0,0);
            if(blockEnd.getTime()<=now.getTime())elapsedHours.sleep++;
          }
        }
        // For a completed night, hours before 12:00 belong to the
        // previous night's sleep; after 12:00 belong to this night's sleep.
        if(sleep) {
          const blockEnd=plusDays_(begin,weekday);
          blockEnd.setHours(Math.floor(time/60)+1,time%60,0,0);
          if(blockEnd.getTime()<=now.getTime()){
            const night=iso_(time<720?plusDays_(begin,weekday-1):plusDays_(begin,weekday));
            sleepHoursByNight[night]=(sleepHoursByNight[night]||0)+1;
          }
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
        boxing:weekHours.boxing,gym:weekHours.gym,sleep:elapsedHours.sleep,
        sleepTotalMarked:weekHours.sleep,clinicalMatrix:weekHours.clinicalMatrix,
        week:currentWeek,hourSlotMinutes:60,
        complete:observedHourRows>=24,
        boxingGymSource:'Horas agendadas en Matrix, no asistencia verificada',
        sleepSource:'Horas Zz: transcurridas y registradas como sueño real'
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
  return {publicData,slots,available,matrixTabInfo,hourRowsByWeek,sleepHoursByNight,
    fileId:id,metadata};
}

function planTypes_(text) {
  const t=String(text||'').toLowerCase();
  const found=[];
  if(/🥊|\bboxeo\b|\bboxing\b|\bsparring\b|\bkpi\b|\bppm\b|\bdensity\b|\bspeed\b/.test(t))found.push('boxing');
  if(/🏋|\bgym\b|\blegs\b|\bpull\b|\bpush\b|\bsquat\b|\bdeadlift\b|\bbench\b|\bstrength\b|\bfuerza\b|\bposterior\b|\banterior\b|\bpress\b/.test(t))found.push('gym');
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
  // Seven calendar days inclusive: today plus six preceding days.
  // Must agree with adherence.from and the coached-classes counter.
  const from=iso_(plusDays_(now,-6));
  const recentHeaders=daily.filter(row=>{
    const d=parseDmy_(row[1]);
    return d&&iso_(d)>=from&&iso_(d)<=todayIso&&isSessionHeader_(row[2]);
  });
  const statusType=raw=>{
    const state=String(raw||'').trim();
    if(/not done|no realizado|cancel|\bill\b|enferm|⛔|abort|\bdrop\b|omiti|❌/i.test(state))return 'omitted';
    if(/(?:^|\s)(?:done|completed|completad[ao]|realizad[ao]|hecho)(?:$|\s)|✅/i.test(state))return 'done';
    return 'unknown';
  };
  const adherence={windowDays:7,from:iso_(plusDays_(now,-6)),to:todayIso,
    boxing:{planned:0,done:0,omitted:0,unverified:0},
    gym:{planned:0,done:0,omitted:0,unverified:0},
    cardio:{planned:0,done:0,omitted:0,unverified:0}};
  let completedSessions7d=0,omittedSessions7d=0;
  for(const row of recentHeaders){
    const state=statusType(row[3]);
    if(state==='done')completedSessions7d++;
    else if(state==='omitted')omittedSessions7d++;
    const firstLine=String(row[2]||'').split('\n')[0];
    for(const domain of planTypes_(firstLine)){
      adherence[domain].planned++;
      if(state==='done')adherence[domain].done++;
      else if(state==='omitted')adherence[domain].omitted++;
      else adherence[domain].unverified++;
    }
  }
  for(const domain of ['boxing','gym','cardio']){
    const item=adherence[domain];
    item.completionPct=item.planned?Math.round(item.done*100/item.planned):null;
  }
  // A coached class is the SINGLE top-level "Coached Boxing" row marked done.
  // Count unique DAYS, not the day headers (which often have no status),
  // the warm-up, the technical drills embedded inside class, or hourly Matrix blocks.
  const coachedByDay=new Map();
  for(let idx=0;idx<daily.length;idx++){
    const row=daily[idx],d=parseDmy_(row[1]);
    if(!d)continue;
    const day=iso_(d);
    if(day<adherence.from||day>todayIso)continue;
    const title=String(row[2]||'').split('\n')[0].trim();
    if(!/(?:^|\s)(?:Coached Boxing|Coached boxing|clase de boxeo|clase boxeo)\s*(?:—|[-–]|$)/i.test(title))continue;
    if(statusType(row[3])!=='done')continue;
    const link=cellUrl_(id,'Daily log','D'+(idx+2),metadata);
    if(!coachedByDay.has(day))coachedByDay.set(day,{date:day,sourceUrl:link});
  }
  const coachedClasses7d=[...coachedByDay.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const drgToday=current?{date:current.date,score:current.score,output:current.output,hardStop:current.hardStop}:null;
  const drgLatest=latest?{date:latest.date,score:latest.score,output:latest.output}:null;
  const recentDrg=drgs.filter(x=>x.iso>=iso_(plusDays_(now,-6))).map(x=>
    ({date:x.iso,score:x.score,output:x.output,hardStop:x.hardStop}));
  return {publicData:{
      state:'ok',drgToday,drgLatest,
      drgState:drgToday?(drgToday.output==='SIN SALIDA'?'incomplete':'recorded'):'missing',
      completedSessions7d,omittedSessions7d,sessionHeaders7d:recentHeaders.length,
      coachedClasses7d:coachedClasses7d.length,coachedClassEntries:coachedClasses7d,
      coachedClassDefinition:'Días distintos con fila Coached Boxing marcada Done; excluye drills dentro de clase',
      adherence,recentDrg,
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
/**
 * Past clinical booking blocks from the CURRENT calendar week.
 * A filled PSICOPRO cell means the hour was booked; it does NOT prove that
 * clinical attention actually took place. No verified-attendance field was
 * identified in the source weekly grid, so never label these confirmed hours.
 */
function readClinicalHours_(id,tabs,metadata,now) {
  const week=startMonday_(now),key=weekKey_(week);
  const tab=matchTab_(tabs,key);
  if(!tab)return {state:'missing',week:key,elapsedBookingHours:null,
    bookedWeekHours:null,attendedHours:null,verifiedAttendedHours:null,
    note:'Sin agenda PSICOPRO de la semana actual'};
  const rows=values_(id,"'"+tab.replace(/'/g,"''")+"'!A3:F15");
  const freq={};
  for(const row of rows)for(let day=1;day<=5;day++){
    const cell=String(row[day]||'').trim();
    if(cell)freq[cell]=(freq[cell]||0)+1;
  }
  let booked=0,elapsed=0,markedAttended=0,explicitlyFree=0;
  for(const row of rows) {
    const time=hour_(row[0]);if(time===null)continue;
    for(let weekday=0;weekday<5;weekday++) {
      const cell=String(row[weekday+1]||'').trim();
      if(/^(?:libre|disponible|vacante)$/i.test(cell))explicitlyFree++;
      if(isFree_(cell)||/^(?:bloquead[oa]|reservado|nuevo paciente|no disponible|por confirmar|sin confirmar|sin agenda|sin asignar)$/i.test(cell))continue;
      if(freq[cell]>=6&&!/(?:\bpaciente\b|psicop|confirmad)/i.test(cell))continue;
      booked++;
      const begin=plusDays_(week,weekday);
      begin.setHours(Math.floor(time/60),time%60,0,0);
      // Only a completed, past one-hour slot is an attended hour.
      // PSICOPRO is curated to retain only actually attended patients.
      if(begin.getTime()+60*60*1000>now.getTime())continue;
      elapsed++;
      if(/\b(?:atendid[oa]|realizad[oa]|asisti[oó]|completad[oa])\b|✅/i.test(cell))markedAttended++;
    }
  }
  return {state:'ok',week:key,elapsedBookingHours:elapsed,bookedWeekHours:booked,
    // A past appointment is NOT evidence of attendance. Only explicit
    // attended/realizada/✅ markers can support an attended-hours figure.
    attendedHours:markedAttended>0?markedAttended:null,
    verifiedAttendedHours:markedAttended>0?markedAttended:null,
    explicitFreeHours:explicitlyFree,
    note:'Horas agendadas que ya transcurrieron: no prueban asistencia. Horas atendidas solamente si la celda contiene un marcador explícito.',
    url:tabUrl_(id,tab,metadata)};
}
/**
 * Read PSICOPRO's authoritatively maintained 'SEGUIMIENTO SEMANAL'.
 * This table reports "Sesiones"; it does not independently verify attendance.
 * Skip future weeks in the month-to-date historical subtotal; surface separately.
 * Do not expose names, clinical notes or patient-level records.
 */
function rv9ClinicalWeekly_(id,metadata,now){
  const tab='Objetivos/Paciente';
  const rows=values_(id,"'Objetivos/Paciente'!A25:D75");
  if(!rows.length||!/seguimiento semanal/i.test(String(rows[0]?.[0]||'')))
    return {state:'unavailable',weekly:[],monthToDate:null};
  const nowIso=iso_(now),month=nowIso.slice(0,7),thisMonday=iso_(startMonday_(now));
  const history=[],upcoming=[];
  let currentWeek=null,monthly=0,monthWeeks=0;
  for(let i=2;i<rows.length;i++){
    const row=rows[i],label=String(row[0]||'').trim();
    const m=label.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if(!m)continue;
    const year=m[3]?Number(m[3].length===2?'20'+m[3]:m[3]):Number(month.slice(0,4));
    const d=new Date(year,Number(m[2])-1,Number(m[1]),12);
    if(d.getFullYear()!==year||d.getMonth()!==Number(m[2])-1||d.getDate()!==Number(m[1]))continue;
    const date=iso_(d),value=money_(row[1]),capacity=money_(row[2]);
    const valid=Number.isSafeInteger(value)&&value>=0&&value<=100;
    const url=cellUrl_(id,tab,'B'+(i+25),metadata);
    const item={week:label,startDate:date,sessions:valid?value:null,
      capacity:Number.isFinite(capacity)?capacity:null,
      sourceUrl:url,status:date>thisMonday?'future':date===thisMonday?'current':'historical'};
    if(item.status==='future'){upcoming.push(item);continue;}
    history.push(item);
    if(item.status==='current')currentWeek=item;
    if(date.slice(0,7)===month&&valid){monthly+=value;monthWeeks++;}
  }
  history.sort((a,b)=>a.startDate.localeCompare(b.startDate));
  const last=history.slice(-10);
  return {state:'ok',week:thisMonday,currentWeek:currentWeek?.sessions??null,
    currentWeekUrl:currentWeek?.sourceUrl||null,
    month,monthToDate:monthWeeks?monthly:null,
    monthWeeksCount:monthWeeks,
    recentWeeks:last,upcoming:upcoming.slice(0,8),
    goalsUrl:tabUrl_(id,tab,metadata),
    definition:'Sesiones anotadas en Seguimiento semanal PSICOPRO; no prueba independiente de asistencia',
    monthNote:'Subtotal por fecha de inicio de semana, excluidas semanas futuras'};
}

function readClinical_(id,now) {
  const metadata=sheetMetadata_(id),tabs=metadata.map(s=>s.title);
  const goals=values_(id,"'Objetivos/Paciente'!A1:C4");
  const sessions=rv9ClinicalWeekly_(id,metadata,now);
  const baseline=goals[1]||[];
  const targetRow=goals[2]||[];
  const weekly=/clasificad.*semanal/i.test(String(baseline[1]||''))?money_(baseline[0]):null;
  const sheetTarget=/objetivo habitual/i.test(String(targetRow[1]||''))?money_(targetRow[0]):null;
  const targetMatches=sheetTarget===RV_TARGET_WEEKLY;
  const usable=weekly!==null&&weekly>=0&&targetMatches;
  const delta=usable?weekly-RV_TARGET_WEEKLY:null;
  const currentWeekHours=readClinicalHours_(id,tabs,metadata,now);
  const monday=startMonday_(now);
  if(day_(now)>=6)monday.setDate(monday.getDate()+7);
  const key=weekKey_(monday);
  const tab=matchTab_(tabs,key);
  const publicData={
    state:usable?'ok':'partial',weekly:usable?weekly:null,target:RV_TARGET_WEEKLY,
    gap:usable?delta:null,week:key,bookedBlocks:null,
    tracking:sessions,
    currentWeekHours,
    url:null,goalsUrl:tabUrl_(id,'Objetivos/Paciente',metadata),
    message:usable?weekly+' / '+RV_TARGET_WEEKLY+' pacientes semanales · '+(delta<0?'faltan '+Math.abs(delta):delta>0?'sobre objetivo por '+delta:'meta alcanzada'):
      (targetMatches?'No se pudo validar pacientes clasificados':'La meta de la hoja no coincide con 15: revisar antes de comparar')
  };
  if(!tab){publicData.agendaState='missing';publicData.capacity={
    classifiedWeeklyPatients:usable?weekly:null,target:RV_TARGET_WEEKLY,
    patientsToTarget:usable?Math.max(0,RV_TARGET_WEEKLY-weekly):null,
    patientsAboveTarget:usable?Math.max(0,weekly-RV_TARGET_WEEKLY):null,
    attendedSessionsThisWeek:currentWeekHours.state==='ok'?currentWeekHours.verifiedAttendedHours:null,
    operatingWeek:key,bookedBlocks:null,explicitlyFreeSlots:null,
    warning:'No existe pestaña de agenda para la semana operativa'
  };publicData.message+=' · Sin agenda de la semana '+key;return {publicData,bookings:[]};}
  publicData.url=tabUrl_(id,tab,metadata);
  // Only time rows A3:F15, not side notes nor patient-objective cells.
  const rows=values_(id,"'"+tab.replace(/'/g,"''")+"'!A3:F15");
  const freq={};
  for(const row of rows)for(let day=1;day<=5;day++){
    const s=String(row[day]||'').trim();
    if(s)freq[s]=(freq[s]||0)+1;
  }
  const bookings=[],clinicRowByTime={};
  let explicitFreeSlots=0;
  for(let rowIndex=0;rowIndex<rows.length;rowIndex++){
    const row=rows[rowIndex];
    const time=hour_(row[0]);
    if(time===null)continue;
    clinicRowByTime[time]=rowIndex+3;
    for(let weekday=0;weekday<5;weekday++){
      const content=String(row[weekday+1]||'').trim();
      if(/^(?:libre|disponible|vacante)$/i.test(content))explicitFreeSlots++;
      if(isFree_(content))continue;
      // Heuristic for recurring placeholder, not 42 patient appointments.
      if(freq[content]>=6&&!/(?:\bpaciente\b|psicop|confirmad)/i.test(content))continue;
      if(/^(?:nuevo paciente|por confirmar|sin confirmar|bloqueado|no disponible)$/i.test(content))continue;
      bookings.push({date:iso_(plusDays_(monday,weekday)),time,
        patientTokens:patientTokens_(content),
        clinicalCellUrl:cellUrl_(id,tab,dayColumn_(weekday)+(rowIndex+3),metadata)});
    }
  }
  publicData.agendaState='ok';
  publicData.bookedBlocks=bookings.length;
  publicData.capacity={
    classifiedWeeklyPatients:usable?weekly:null,
    target:RV_TARGET_WEEKLY,patientsToTarget:usable?Math.max(0,RV_TARGET_WEEKLY-weekly):null,
    patientsAboveTarget:usable?Math.max(0,weekly-RV_TARGET_WEEKLY):null,
    attendedSessionsThisWeek:currentWeekHours.state==='ok'?currentWeekHours.verifiedAttendedHours:null,
    actualAttendedHoursThisWeek:currentWeekHours.state==='ok'?currentWeekHours.attendedHours:null,
    operatingWeek:key,bookedBlocks:bookings.length,
    explicitlyFreeSlots:explicitFreeSlots,
    warning:'Los bloques marcados Libre no equivalen necesariamente a cupos sostenibles para pacientes semanales'
  };
  publicData.message+=' · '+bookings.length+' bloques de agenda detectados en semana '+key;
  return {publicData,bookings,clinicRowByTime,fileId:id,metadata,tab};
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
  // Transparent linear pace projection; no invented future transactions.
  const dayOfMonth=Number(iso_(now).slice(8,10));
  const parts=String(sourceMonth||'').split('-').map(Number);
  const daysInMonth=parts.length===2&&parts[0]>2000&&parts[1]>=1&&parts[1]<=12?
    new Date(parts[0],parts[1],0).getDate():null;
  const projection=current&&reconciled&&dayOfMonth>=5&&daysInMonth?
    {state:'ok',daysElapsed:dayOfMonth,daysInMonth,
      dailyPace:Math.round(spent/dayOfMonth),
      projectedSpent:Math.round(spent/dayOfMonth*daysInMonth),
      projectedOver:Math.max(0,Math.round(spent/dayOfMonth*daysInMonth)-budget),
      projectedRemaining:Math.max(0,budget-Math.round(spent/dayOfMonth*daysInMonth)),
      method:'Extrapolación lineal del gasto acumulado; no incorpora cargos o ingresos futuros'}:
    {state:'unavailable',message:!current?'La fuente no corresponde al mes actual':
      !reconciled?'Primero corregir el presupuesto':'Historial mensual aún insuficiente'};
  return {state:!reconciled?'partial':current?'ok':'stale',month:sourceMonth,
    url:tabUrl_(id,tab,metadata),
    budget,spent,difference:diff,over,remaining,pct,
    categoryReconciled:reconciled,topOverages,unbudgetedCount:unbudgeted.length,unbudgetedAmount,
    projection,
    message:!reconciled?'Totales y categorías no concuerdan: verificar fórmula o rango':
      (current?'Mes actual':'Mes sin actualizar')+' · '+(diff>0?'Sobre presupuesto por '+clp_(over):diff<0?'Bajo presupuesto por '+clp_(remaining):'Presupuesto justo')+
      ' CLP ('+pct+'%)'};
}
function clp_(n){return Math.round(n).toLocaleString('es-CL');}
function matrixLinkForSlot_(matrix,date,time){
  const week=weekKey_(startMonday_(parseIso_(date)));
  const weekday=weekDay_(date);
  const row=matrix.hourRowsByWeek?.[week]?.[time];
  const base=matrix.matrixTabInfo?.[week]||null;
  if(!base||weekday<0||weekday>6)return null;
  const cell=dayColumn_(weekday)+(row||3);
  return base+'&range='+encodeURIComponent(row?cell:dayColumn_(weekday)+'3:'+dayColumn_(weekday)+'26');
}
function reconcileTraining_(plans,matrix){
  const missing=[];
  const available=new Set(matrix.available);
  for(const plan of plans){
    const d=parseIso_(plan.date);
    const monday=weekKey_(startMonday_(d));
    if(!available.has(monday))continue;
    const daySlots=matrix.slots[plan.date]||{};
    const covered=Object.keys(daySlots).some(key=>Boolean(daySlots[key][plan.kind]));
    if(!covered)missing.push({date:plan.date,type:plan.kind,
      matrixUrl:matrixLinkForSlot_(matrix,plan.date,540)});
  }
  return {total:missing.length,items:missing.slice(0,8)};
}
/**
 * Seven completed local nights, from Matrix Zz: recordings. Midnight hours
 * are attributed to the PREVIOUS night's date. Missing logs are not 0 hours.
 * Training readiness comparison is descriptive only (no causal inference).
 */
function analyzeSleep_(matrix,training,now){
  const nights=[],unknown=[];
  const existing=new Set(matrix.available);
  for(let offset=7;offset>=1;offset--){
    const nightDate=plusDays_(now,-offset);
    const night=iso_(nightDate);
    const nextDay=plusDays_(nightDate,1);
    const ready=existing.has(weekKey_(startMonday_(nightDate))) &&
      existing.has(weekKey_(startMonday_(nextDay)));
    const hours=matrix.sleepHoursByNight?.[night];
    if(!ready || !Number.isFinite(hours) || hours<=0){
      unknown.push(night);
      continue;
    }
    nights.push({date:night,hours,belowTarget:hours<7.5});
  }
  const sum=nights.reduce((total,x)=>total+x.hours,0);
  const avg=nights.length?Math.round(sum/nights.length*10)/10:null;
  const low=nights.filter(x=>x.belowTarget).length;
  const drgs=Array.isArray(training?.recentDrg)?training.recentDrg:[];
  let paired=0,coincidences=0;
  for(const item of drgs){
    const priorNight=iso_(plusDays_(parseIso_(item.date),-1));
    const sleep=nights.find(x=>x.date===priorNight);
    if(!sleep||item.score===null||item.score===undefined)continue;
    paired++;
    if(sleep.belowTarget&&item.score<=6)coincidences++;
  }
  return {state:nights.length?'ok':'missing',periodDays:7,
    targetHours:7.5,observedNights:nights.length,unrecordedNights:unknown.length,
    averageHours:avg,nightsBelowTarget:low,byNight:nights,
    pairedDrgDays:paired,lowSleepAndLowDrg:coincidences,
    interpretation:paired>=3?'Coincidencias descriptivas entre sueño bajo 7,5 h y DRG <=6, sin atribuir causalidad.':
      'No hay suficientes pares noche/DRG para interpretar una relación.',
    source:'Sueño real Zz: de Matrix (se excluyen noches sin registro)'
  };
}

/**
 * Calendar versus Matrix, scoped to timed upcoming events and explicit
 * external-commitment entries in Matrix. No automatic changes to either source.
 * Calendar titles are owner-only data; they are not written to logs.
 */
function calendarDayLink_(date) {
  const [year,month,day]=String(date).split('-').map(Number);
  return 'https://calendar.google.com/calendar/u/0/r/day/'+year+'/'+month+'/'+day;
}
function reconcileCalendar_(events,matrix,now) {
  if(!matrix)return {state:'unavailable',calendarMissingMatrix:null,
    matrixMissingCalendar:null,potentialConflicts:null,items:[],reverseItems:[],conflictItems:[]};
  const available=new Set(matrix.available);
  const missing=[],reverse=[],conflicts=[];
  const seenCalendars=new Set();
  for(const event of events||[]) {
    const week=weekKey_(startMonday_(parseIso_(event.date)));
    if(!available.has(week))continue; // A missing Matrix tab is a source issue.
    const slot=(matrix.slots[event.date]||{})[Math.floor(event.time/60)*60];
    const item={date:event.date,hour:String(Math.floor(event.time/60)).padStart(2,'0')+':'+
      String(event.time%60).padStart(2,'0'),
      title:event.title,calendarUrl:calendarDayLink_(event.date),
      matrixUrl:matrixLinkForSlot_(matrix,event.date,Math.floor(event.time/60)*60)};
    if(!slot?.busy)missing.push(item);
    else {
      // Only contradict the slot when both sources explicitly identify
      // incompatible activity domains. Otherwise it is provisionally covered.
      const t=event.title.toLowerCase();
      const kind=/boxeo|boxing|sparring/i.test(t)?'boxing':
        /gym|gimnasio|pesas/i.test(t)?'gym':
        /paciente|consulta psic|psicoterapia|sesion psic/i.test(t)?'clinical':null;
      if(kind&&!slot[kind])conflicts.push(item);
    }
    seenCalendars.add(event.date+'|'+Math.floor(event.time/60)*60);
  }
  const end=iso_(plusDays_(now,7)),today=iso_(now);
  for(const date of Object.keys(matrix.slots)) {
    if(date<today||date>end)continue;
    if(!available.has(weekKey_(startMonday_(parseIso_(date)))))continue;
    for(const [minute,slot] of Object.entries(matrix.slots[date])){
      if(!slot.calendarCandidate)continue;
      const actual=Number(minute),key=date+'|'+actual;
      if(seenCalendars.has(key))continue;
      const hasTimedCalendar=(events||[]).some(event=>event.date===date&&
        Math.floor(event.time/60)*60===actual);
      if(hasTimedCalendar)continue;
      reverse.push({date,hour:String(Math.floor(actual/60)).padStart(2,'0')+':'+
        String(actual%60).padStart(2,'0'),
        activity:slot.clinical?'Atención clínica':'Compromiso en Matrix',
        matrixUrl:slot.cellUrl||null,calendarUrl:calendarDayLink_(date)});
    }
  }
  return {state:'ok',calendarMissingMatrix:missing.length,
    matrixMissingCalendar:reverse.length,potentialConflicts:conflicts.length,
    items:missing.slice(0,8),reverseItems:reverse.slice(0,8),
    conflictItems:conflicts.slice(0,8),
    caveat:'Comparación heurística por día, hora y tipo; revisar antes de editar'};
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
function reconcileClinical_(bookings,matrix,week,clinical){
  const missing=[],conflicts=[],possibleDifferent=[],matrixOnly=[];
  const available=new Set(matrix.available);
  for(const booked of bookings){
    const week=weekKey_(startMonday_(parseIso_(booked.date)));
    if(!available.has(week))continue;
    const slot=(matrix.slots[booked.date]||{})[booked.time];
    const issue={date:booked.date,hour:String(Math.floor(booked.time/60)).padStart(2,'0')+':'+String(booked.time%60).padStart(2,'0'),
      clinicalUrl:booked.clinicalCellUrl||null,
      matrixUrl:slot?.cellUrl||matrixLinkForSlot_(matrix,booked.date,booked.time)};
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
      const weekday=weekDay_(date);
      const clinicRow=clinical?.clinicRowByTime?.[minutes];
      const clinicUrl=clinical?.fileId&&clinicRow&&weekday>=0&&weekday<5&&clinical.tab?
        cellUrl_(clinical.fileId,clinical.tab,dayColumn_(weekday)+clinicRow,clinical.metadata):null;
      matrixOnly.push({date,hour:String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0'),
        hasPrivateDetail:true,
        matrixUrl:slot.cellUrl||null,clinicalUrl:clinicUrl});
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
/**
 * Source health measures operational coverage, NOT the underlying Drive file
 * modified timestamp. No additional Drive scope or API is required.
 */
function sourceHealth_(out,now) {
  const today=iso_(now);
  const summaries=[
    {key:'matrix',label:'MTS System Matrix',
      state:out.matrix.state==='ok'?'ok':'error',
      detail:out.matrix.state==='ok'?'Pestaña de semana '+out.matrix.week+' disponible':
        String(out.matrix.message||'No se pudo leer Matrix')},
    {key:'training',label:'MTS Execution Log',
      state:out.training.state!=='ok'?'error':
        !out.training.nextWeekScheduled?'warning':'ok',
      detail:out.training.state==='ok'?
        ('Última sesión planificada: '+(out.training.lastProgrammedDate||'sin fecha')+
          ' · próxima semana '+(out.training.nextWeekScheduled?'con plan':'sin plan')):
        'No se pudo verificar el registro MTS'},
    {key:'clinical',label:'RODOLFO.PSICOPRO',
      state:out.clinical.state!=='ok'?'error':
        out.clinical.agendaState==='ok'?'ok':'warning',
      detail:out.clinical.state==='ok'?
        ('Meta '+out.clinical.weekly+'/15 · agenda '+(out.clinical.agendaState==='ok'?'disponible':'no disponible')):
        String(out.clinical.message||'Sin validación de agenda')},
    {key:'finance',label:'Finanzas',
      state:out.finance.state==='ok'?'ok':
        out.finance.state==='stale'?'warning':'error',
      detail:out.finance.state==='ok'?'Período '+out.finance.month+' con totales conciliados':
        String(out.finance.message||'No se pudo verificar presupuesto')},
    {key:'calendar',label:'Google Calendar',
      state:out.calendar.state==='ok'?'ok':'error',
      detail:out.calendar.state==='ok'?'Agenda consultada '+today:
        'Sin acceso a calendario'}
  ];
  return {available:summaries.filter(x=>x.state==='ok').length,total:summaries.length,
    issues:summaries.filter(x=>x.state!=='ok').map(x=>x.key),
    details:summaries,checkedAt:now.toISOString(),
    note:'Valida cobertura de semana/mes y lectura; no comprueba la última modificación del archivo en Drive'};
}
function auditHash_(input){
  let hash=2166136261;
  const value=String(input||'');
  for(let i=0;i<value.length;i++){
    hash^=value.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return (hash>>>0).toString(36);
}
function auditKeys_(out) {
  const keys=[];
  const push=(kind,records)=>{for(const r of records||[])
    keys.push(auditHash_(kind+'|'+(r.date||'')+'|'+(r.hour||'')+'|'+(r.type||'')))};
  const c=out.comparisons?.clinical;
  const t=out.comparisons?.training;
  const cal=out.comparisons?.calendar;
  if(c?.state==='ok'){
    push('clinic_missing',c.items);
    push('clinic_conflict',c.collisionItems);
    push('clinic_identity',c.identityItems);
    push('matrix_only',c.matrixOnlyItems);
  }
  if(t?.state==='ok')push('training_missing',t.items);
  if(t?.state==='no_plan')keys.push(auditHash_('mts_no_plan|'+(t.week||'')));
  if(cal?.state==='ok'){
    push('cal_without_matrix',cal.items);
    push('matrix_without_cal',cal.reverseItems);
    push('calendar_conflict',cal.conflictItems);
  }
  if(out.training?.drgToday &&
    (out.training.drgToday.hardStop||/ABORT/i.test(out.training.drgToday.output)))
    keys.push(auditHash_('drg_abort|'+iso_(new Date(out.generatedAt))));
  if(out.clinical?.state==='ok'&&out.clinical.gap<0)
    keys.push(auditHash_('clinic_capacity|'+out.clinical.week));
  if(out.finance?.state==='ok'&&out.finance.over>0)
    keys.push(auditHash_('finance_over|'+out.finance.month));
  if(out.finance?.state==='stale')
    keys.push(auditHash_('finance_stale|'+out.finance.month));
  return [...new Set(keys)].sort().slice(0,200);
}
function history_(out,props,now) {
  const key='RVCC_ALERT_HISTORY_V2';
  if(!props||typeof props.getProperty!=='function'||typeof props.setProperty!=='function')
    return {state:'unavailable',message:'El historial necesita Script Properties'};
  // An incomplete source must never produce fabricated "resolved" alerts.
  const blocked=['matrix','training','clinical','finance','calendar']
    .some(name=>!out[name]||['error','unconfigured','unavailable','partial'].includes(out[name].state));
  if(blocked)return {state:'incomplete',message:'Historial suspendido porque falta verificar alguna fuente'};
  const nowMs=now.getTime(),windowMs=24*60*60*1000;
  const current=auditKeys_(out),keys=new Set(current);
  let old=null;
  try{old=JSON.parse(props.getProperty(key)||'null')}catch(e){}
  if(!old||!Array.isArray(old.items)){
    const baseline={version:2,at:now.toISOString(),
      items:current.map(id=>({id,firstSeen:nowMs-windowMs-1})),resolved:[]};
    try{props.setProperty(key,JSON.stringify(baseline))}catch(e){return {state:'error',message:'No se pudo guardar línea base'};}
    return {state:'baseline',open:current.length,new24h:0,
      resolved24h:0,persistent:current.length,checkedAt:now.toISOString(),
      message:'Línea base inicial registrada. La próxima actualización detectará cambios.'};
  }
  const former=new Map(old.items.filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x]));
  const items=current.map(id=>({id,firstSeen:former.has(id)?Number(former.get(id).firstSeen)||nowMs:nowMs}));
  const removed=(old.items||[]).filter(x=>!keys.has(x.id)).map(x=>({id:x.id,at:nowMs}));
  const resolved=[...(Array.isArray(old.resolved)?old.resolved:[]),...removed]
    .filter(x=>x&&nowMs-Number(x.at)<windowMs&&keys.has(x.id)===false).slice(-150);
  const state={version:2,at:now.toISOString(),items,resolved};
  const changed=JSON.stringify(old.items)!==JSON.stringify(items)||
    removed.length>0||!Array.isArray(old.resolved);
  if(changed)try{props.setProperty(key,JSON.stringify(state))}catch(e){
    return {state:'error',message:'No se pudieron persistir cambios del historial'};
  }
  const new24h=items.filter(x=>x.firstSeen>=nowMs-windowMs).length;
  return {state:'ok',open:items.length,new24h,
    resolved24h:resolved.length,persistent:items.length-new24h,
    checkedAt:now.toISOString(),
    message:'Se guardan únicamente identificadores anónimos, no nombres ni contenidos de hojas'};
}

/**
 * Owner-only, on-demand clinical detail. Sensitive free text is not included in
 * the dashboard payload or alert history. The Web App MUST be "Only myself".
 */
function rv9BaseDashboard_(){
  const now=new Date();
  const props=PropertiesService.getScriptProperties();
  const out={
    generatedAt:now.toISOString(),release:{version:RV_RELEASE,checkedAt:now.toISOString()},
    calendar:{state:'unavailable',message:'No disponible'},
    matrix:{state:'unconfigured',message:'No configurada'},
    training:{state:'unconfigured',message:'No configurada'},
    clinical:{state:'unconfigured',message:'No configurada'},
    finance:{state:'unconfigured',message:'No configurada'},
    sleepTrend:{state:'unavailable',averageHours:null,nightsBelowTarget:null},
    comparisons:{calendar:{state:'unavailable',calendarMissingMatrix:null,matrixMissingCalendar:null,potentialConflicts:null,items:[],reverseItems:[],conflictItems:[]},
      training:{state:'unavailable',total:null,items:[]},
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
  if(matrix)out.sleepTrend=analyzeSleep_(matrix,out.training,now);
  if(out.calendar.state==='ok'&&matrix){
    out.comparisons.calendar=reconcileCalendar_(out.calendar.auditEvents,matrix,now);
  }
  if(out.calendar.auditEvents)delete out.calendar.auditEvents;
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
      Object.assign({state:'ok'},reconcileClinical_(clinical.bookings,matrix,clinical.publicData.week,clinical)):
      {state:'partial',missing:null,conflicts:null,items:[],collisionItems:[],message:'No existe pestaña correspondiente de Matrix'};
  }
  const todayDrg=out.training.drgToday;
  const missingClinical=out.comparisons.clinical.missing;
  const collisionClinical=out.comparisons.clinical.conflicts;
  const missingTraining=out.comparisons.training.total;
  const differentClinical=out.comparisons.clinical.possibleDifferent;
  const matrixOnlyClinical=out.comparisons.clinical.matrixOnly;
  const calendarGaps=out.comparisons.calendar?.calendarMissingMatrix;
  const matrixCalendarGaps=out.comparisons.calendar?.matrixMissingCalendar;
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
  }else if(calendarGaps>0){
    out.nextAction={title:'Registrar compromisos Calendar en Matrix',
      reason:calendarGaps+' eventos no tienen bloque correspondiente. Revisar las fechas señaladas.',level:'high'};
  }else if(matrixCalendarGaps>0){
    out.nextAction={title:'Revisar bloques Matrix sin evento Calendar',
      reason:matrixCalendarGaps+' compromisos posiblemente carecen de evento Calendar.',level:'medium'};
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
  if(calendarGaps>0)out.alerts.push('Calendar: '+calendarGaps+' eventos no registrados en Matrix');
  if(matrixCalendarGaps>0)out.alerts.push('Matrix: '+matrixCalendarGaps+' compromisos sin Calendar');
  if(out.sleepTrend.state==='ok'&&out.sleepTrend.observedNights>=4&&
    out.sleepTrend.nightsBelowTarget>=3)out.alerts.push(
      'Sueño: '+out.sleepTrend.nightsBelowTarget+' noches bajo 7 h 30');
  if(out.training.adherence?.boxing?.planned>=3&&
    out.training.adherence.boxing.completionPct<70)
    out.alerts.push('Boxeo: adherencia confirmada <70% últimos 7 días');

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
  if(out.comparisons.calendar?.state==='ok'&&
    (calendarGaps>0||matrixCalendarGaps>0)){
    const first=calendarGaps>0?out.comparisons.calendar.items[0]:
      out.comparisons.calendar.reverseItems[0];
    recommend('calendar',86,'high','Conciliar Google Calendar y Matrix',
      calendarGaps+' eventos solo en Calendar · '+matrixCalendarGaps+
        ' compromisos solo en Matrix.'+
        (first?' Primer caso: '+slotDescription_(first)+'.':''),
      'Abrir el evento y la celda correspondiente; confirmar antes de modificar cualquiera de las dos agendas.',
      'revisar','calendar');
  }else if(out.calendar.state==='ok'&&out.calendar.next&&
     out.calendar.next.minutesUntil>=0&&out.calendar.next.minutesUntil<=120){
    recommend('calendar',97,'high','Preparar próximo compromiso',
      'El siguiente evento comienza en menos de dos horas.',
      'Abrir Calendar y preparar la actividad, sin copiar información clínica al panel.','verificado','calendar');
  }
  if(out.sleepTrend.state==='ok'&&out.sleepTrend.observedNights>=4&&
    out.sleepTrend.nightsBelowTarget>=3){
    recommend('sleep',61,'medium','Revisar patrón de sueño',
      out.sleepTrend.nightsBelowTarget+' de '+out.sleepTrend.observedNights+
        ' noches registradas por debajo de 7 h 30; promedio '+out.sleepTrend.averageHours+' h.',
      'Revisar sueño real y DRG antes de añadir cargas de entrenamiento; no inferir causalidad.',
      'verificado','matrix');
  }
  if(out.finance.state==='ok'&&out.finance.over===0&&
    out.finance.projection?.state==='ok'&&out.finance.projection.projectedOver>0){
    recommend('finance',69,'medium','Prevenir exceso de gasto proyectado',
      'Proyección lineal '+clp_(out.finance.projection.projectedSpent)+
        ' CLP: '+clp_(out.finance.projection.projectedOver)+' CLP sobre presupuesto.',
      'Revisar categorías discrecionales; la proyección no incluye cargos extraordinarios.',
      'estimación','finance');
  }
  out.recommendations=suggested.sort((a,b)=>b.priority-a.priority)
    .filter((x,i,all)=>all.findIndex(y=>y.domain===x.domain)===i)
    .slice(0,3).map(({priority,...rest})=>rest);
  out.sourceHealth=sourceHealth_(out,now);
  try{out.history=history_(out,props,now);}catch(e){
    out.history={state:'error',message:'No se pudo actualizar historial'};
  }
  return out;
}
