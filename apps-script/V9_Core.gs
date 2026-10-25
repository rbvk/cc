/**
 * RV Command Center V9 — owner-only data operations.
 * Data sources remain read-only. No patient labels, passwords or messages
 * may be stored in aggregated counters or the operational ideas inbox.
 */
const RV9_VERSION='2026.10.24.9';
const RV9_ORIGINS=['Google Maps','Google Search','Sitio web','Instagram','Recomendación','Otro','Sin identificar'];
const RV9_AREAS=['Clínica','Boxeo','Gimnasio','Tesis','Proyectos','Finanzas','Bomberos','Personal'];

function rv9Props_(){return PropertiesService.getScriptProperties();}
function rv9Date_(date,pattern){return Utilities.formatDate(date,RV_TZ,pattern);}
function rv9Month_(date){return rv9Date_(date,'yyyy-MM');}
function rv9Months_(now,n){const out=[];for(let i=0;i<n;i++)out.push(rv9Month_(new Date(now.getFullYear(),now.getMonth()-i,15,12)));return out;}
function rv9Json_(raw,other){try{return JSON.parse(raw)||other;}catch(e){return other;}}
function rv9Short_(input,max){return String(input||'').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function rv9Locked_(fn){const lock=LockService.getScriptLock();lock.waitLock(10000);try{return fn();}finally{lock.releaseLock();}}

function rv9LeadMonth_(p,key){
 const x=rv9Json_(p.getProperty('RV9_LEADS_'+key),{});
 return x&&typeof x==='object'&&!Array.isArray(x)?x:{};
}
function rv9LeadStats_(p,now){
 const today=rv9Date_(now,'yyyy-MM-dd'),start=rv9Date_(startMonday_(now),'yyyy-MM-dd');
 const periods=rv9Months_(now,3).map(key=>{
  const source=rv9LeadMonth_(p,key),byDay=[],byOrigin={};let total=0;
  for(const [date,origins] of Object.entries(source)){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!origins||typeof origins!=='object')continue;
   let dayTotal=0;
   for(const [origin,n] of Object.entries(origins)){
    if(!RV9_ORIGINS.includes(origin)||!Number.isSafeInteger(n)||n<0)continue;
    byOrigin[origin]=(byOrigin[origin]||0)+n;dayTotal+=n;
   }
   total+=dayTotal;byDay.push({date,count:dayTotal});
  }
  return {month:key,total,byDay:byDay.sort((a,b)=>a.date.localeCompare(b.date)),
   byOrigin:Object.entries(byOrigin).map(([origin,count])=>({origin,count})).sort((a,b)=>b.count-a.count)};
 });
 let week=0,todayCount=0;
 for(const month of periods)for(const day of month.byDay){
  if(day.date>=start&&day.date<=today)week+=day.count;
  if(day.date===today)todayCount+=day.count;
 }
 const current=periods[0],last=periods[1];
 return {state:'ok',today:todayCount,week,month:current.total,
  byOrigin:current.byOrigin,byDay:current.byDay,history:periods.map(x=>({month:x.month,total:x.total})),
  changeVsPrevMonth:last.total?Math.round(100*(current.total-last.total)/last.total):null,
  lastUpdated:p.getProperty('RV9_LEAD_UPDATED')||null,
  limitation:'Conteos agregados, no reservas ni conversiones individualizadas'};
}
function recordV9Lead(origin){
 const source=RV9_ORIGINS.includes(origin)?origin:'Sin identificar';
 return rv9Locked_(()=>{
  const p=rv9Props_(),now=new Date(),month=rv9Month_(now),day=rv9Date_(now,'yyyy-MM-dd');
  const items=rv9LeadMonth_(p,month);if(!items[day])items[day]={};
  items[day][source]=(items[day][source]||0)+1;
  p.setProperty('RV9_LEADS_'+month,JSON.stringify(items));
  const token=Utilities.getUuid();
  p.setProperty('RV9_LAST_LEAD',JSON.stringify({month,day,source,token,at:now.getTime()}));
  p.setProperty('RV9_LEAD_UPDATED',now.toISOString());
  return {state:'ok',token,stats:rv9LeadStats_(p,now)};
 });
}
function undoV9Lead(token){
 return rv9Locked_(()=>{
  const p=rv9Props_(),now=new Date(),last=rv9Json_(p.getProperty('RV9_LAST_LEAD'),null);
  if(!last||last.token!==token||now.getTime()-last.at>300000)return {state:'expired'};
  const data=rv9LeadMonth_(p,last.month),n=data[last.day]?.[last.source];
  if(!Number.isSafeInteger(n)||n<1)return {state:'invalid'};
  if(n===1)delete data[last.day][last.source];else data[last.day][last.source]--;
  if(!Object.keys(data[last.day]).length)delete data[last.day];
  p.setProperty('RV9_LEADS_'+last.month,JSON.stringify(data));
  p.deleteProperty('RV9_LAST_LEAD');
  p.setProperty('RV9_LEAD_UPDATED',now.toISOString());
  return {state:'ok',stats:rv9LeadStats_(p,now)};
 });
}

function rv9GuessArea_(text){
 const s=String(text).toLowerCase();
 if(/tesis|doctoral|art[ií]culo|zotero|bibliograf|cap[ií]tulo|entrevista/.test(s))return 'Tesis';
 if(/boxeo|boxing|sparring|ppm|jab|combate/.test(s))return 'Boxeo';
 if(/gimnas|pesas|deadlift|sentadilla|cardio|bench/.test(s))return 'Gimnasio';
 if(/psicopro|pacientes|consultorio|psic[oó]logo|consultas/.test(s))return 'Clínica';
 if(/presupuest|pagar|finanz|ahorro|deuda|ingreso/.test(s))return 'Finanzas';
 if(/bombero|cuartel|guardia|emergencia/.test(s))return 'Bomberos';
 if(/github|script|desarroll|c[oó]digo|web|boxingci|command center/.test(s))return 'Proyectos';
 return 'Personal';
}
function rv9GuessMinutes_(title){
 const s=String(title).toLowerCase(),min=s.match(/(\d{1,3})\s*(?:minutos|min)\b/);
 if(min)return Math.max(5,Math.min(180,Number(min[1])));
 const h=s.match(/(\d)\s*(?:horas|hora|h)\b/);
 if(h)return Math.max(15,Math.min(180,Number(h[1])*60));
 return /revisar|verificar|comprobar|consultar/.test(s)?25:/terminar|redactar|investigar|implementar|desarrollar/.test(s)?60:45;
}
function rv9AllIdeas_(p,now){
 const result=[];
 for(const month of rv9Months_(now,6)){
  const arr=rv9Json_(p.getProperty('RV9_IDEAS_'+month),[]);
  if(Array.isArray(arr))for(const item of arr)
   if(item&&typeof item.id==='string'&&typeof item.title==='string')result.push(item);
 }
 return result.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,140);
}
function rv9Inbox_(ideas){
 return {state:'ok',open:ideas.filter(x=>x.status==='open').length,
  done:ideas.filter(x=>x.status==='done').length,
  items:ideas.slice(0,70).map(x=>({id:x.id,title:x.title,area:x.area,
   minutes:x.minutes,status:x.status,createdAt:x.createdAt,completedAt:x.completedAt||null}))};
}
function captureV9Idea(raw){
 const title=rv9Short_(raw,220);
 if(title.length<4)return {state:'invalid',message:'Escribe al menos cuatro caracteres'};
 if(/(?:contrase[nñ]a|password|historia cl[ií]nica|diagn[oó]stico)\s*:/i.test(title))
  return {state:'rejected',message:'No incluyas credenciales ni datos clínicos'};
 return rv9Locked_(()=>{
  const p=rv9Props_(),now=new Date(),month=rv9Month_(now);
  const arr=rv9Json_(p.getProperty('RV9_IDEAS_'+month),[]);
  const list=Array.isArray(arr)?arr:[];
  const clean=s=>String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
  if(list.some(x=>x.status==='open'&&clean(x.title)===clean(title)))
   return {state:'duplicate',message:'Esta captura ya está registrada'};
  const item={id:Utilities.getUuid(),title,area:rv9GuessArea_(title),
   minutes:rv9GuessMinutes_(title),status:'open',createdAt:now.toISOString()};
  list.unshift(item);
  if(list.length>28||JSON.stringify(list).length>8000)
   return {state:'full',message:'Capacidad mensual alcanzada; revisa pendientes'};
  p.setProperty('RV9_IDEAS_'+month,JSON.stringify(list));
  return {state:'ok',item,inbox:rv9Inbox_(rv9AllIdeas_(p,now))};
 });
}
function setV9TaskStatus(id,status){
 if(!/^[0-9a-f-]{20,50}$/i.test(String(id||''))||!['open','done','drop'].includes(status))
  return {state:'invalid'};
 return rv9Locked_(()=>{
  const p=rv9Props_(),now=new Date();
  for(const month of rv9Months_(now,6)){
   const arr=rv9Json_(p.getProperty('RV9_IDEAS_'+month),[]);
   if(!Array.isArray(arr))continue;
   const item=arr.find(x=>x?.id===id);if(!item)continue;
   item.status=status;item.completedAt=status==='done'?now.toISOString():null;
   p.setProperty('RV9_IDEAS_'+month,JSON.stringify(arr));
   return {state:'ok',inbox:rv9Inbox_(rv9AllIdeas_(p,now))};
  }
  return {state:'not_found'};
 });
}
function rv9Available_(p,now){
 const id=String(p.getProperty('MATRIX_SHEET_ID')||'');
 if(!/^[A-Za-z0-9_-]{15,}$/.test(id))return {state:'unavailable',windows:[]};
 let matrix;try{matrix=readMatrix_(id,now);}catch(e){return {state:'unavailable',windows:[]};}
 const iso=rv9Date_(now,'yyyy-MM-dd'),slots=matrix.slots[iso];
 if(!slots||!matrix.available.includes(weekKey_(startMonday_(now))))
  return {state:'unavailable',windows:[]};
 const events=[];
 try{
  const day=new Date(now.getTime());day.setHours(0,0,0,0);
  for(const e of CalendarApp.getDefaultCalendar().getEvents(day,plusDays_(day,1)))
   events.push({start:e.getStartTime().getTime(),end:e.getEndTime().getTime()});
 }catch(e){}
 const minuteNow=Number(rv9Date_(now,'HH'))*60+Number(rv9Date_(now,'mm'));
 const first=Math.max(8,Math.ceil((minuteNow+15)/60)),windows=[];let began=null;
 for(let hour=first;hour<=22;hour++){
  let free=false;
  if(hour<22){
   const block=slots[hour*60];
   const d=new Date(now.getTime());d.setHours(hour,0,0,0);
   const begin=d.getTime(),end=begin+3600000;
   free=!!block&&!block.busy&&!events.some(e=>begin<e.end+900000&&end>e.start-900000);
  }
  if(free&&began===null)began=hour;
  else if(!free&&began!==null){
   const length=(hour-began)*60;
   if(length>=60)windows.push({date:iso,start:String(began).padStart(2,'0')+':00',
    end:String(hour).padStart(2,'0')+':00',minutes:length,certainty:'potential'});
   began=null;
  }
 }
 return {state:'ok',windows:windows.sort((a,b)=>b.minutes-a.minutes).slice(0,5),
  message:'Huecos potenciales de Matrix y Calendar. Confirmar antes de usarlos'};
}
function rv9Finish_(inbox,availability){
 const max=availability.windows?.[0]?.minutes||0;
 const open=inbox.items.filter(x=>x.status==='open');
 return {state:max?'ok':'no_window',items:open.filter(x=>x.minutes<=max).slice(0,4)
  .map(x=>({id:x.id,title:x.title,area:x.area,minutes:x.minutes,
   start:availability.windows.find(w=>w.minutes>=x.minutes)?.start||null})),
  note:'Tiempos estimados. No desplazar compromisos ni descanso'};
}
/** Decision Calibration Log: explicit predictions and observed outcomes. */
function rv9AllDecisions_(p,now){
 const items=[];
 for(const month of rv9Months_(now,6)){
  const list=rv9Json_(p.getProperty('RV9_DECISIONS_'+month),[]);
  if(Array.isArray(list))for(const d of list)
   if(d&&typeof d.id==='string'&&typeof d.type==='string')items.push(d);
 }
 return items.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,120);
}
function rv9DecisionSummary_(records){
 const resolved=records.filter(x=>x.status==='success'||x.status==='failure');
 const outcomes=resolved.filter(x=>x.status==='success').length;
 const meanConfidence=resolved.length?Math.round(resolved.reduce((a,x)=>a+x.confidence,0)/resolved.length):null;
 return {state:'ok',open:records.filter(x=>x.status==='open').length,
  completed:resolved.length,successRate:resolved.length>=5?Math.round(outcomes/resolved.length*100):null,
  averagePredictedConfidence:resolved.length>=5?meanConfidence:null,
  calibrationAvailable:resolved.length>=10,
  note:resolved.length>=10?'Comparación descriptiva entre confianza media y resultados; revisar sesgo de selección':
   'Muestra insuficiente para calibración confiable: se requieren al menos diez decisiones cerradas',
  items:records.slice(0,24).map(x=>({
   id:x.id,type:x.type,quantity:x.quantity,confidence:x.confidence,
   prediction:x.prediction,criterion:x.criterion,
   createdAt:x.createdAt,status:x.status,resolvedAt:x.resolvedAt||null
  }))};
}
function recordV9Decision(type,quantity,confidence){
 const pct=Math.round(Number(confidence));
 if(!Number.isFinite(pct)||pct<5||pct>95)return {state:'invalid',message:'Confianza debe ser de 5% a 95%'};
 const sim=simulateV9Scenario(type,quantity);
 if(sim.state!=='ok')return {state:'unavailable',message:'El escenario todavía no se puede evaluar'};
 return rv9Locked_(()=>{
  const p=rv9Props_(),now=new Date(),month=rv9Month_(now);
  const old=rv9Json_(p.getProperty('RV9_DECISIONS_'+month),[]);
  const list=Array.isArray(old)?old:[];
  const outcomes=(sim.results||[]).map(x=>x.label+': '+x.value).join(' · ');
  const prediction=rv9Short_(outcomes,180)||'Cambio operacional a comprobar';
  const criterion=type==='clinical'?'Revisar pacientes semanales e ingreso neto observado tras cuatro semanas':
   type==='budget'?'Revisar gasto real al cierre del mes':
   type==='focus'?'Comprobar entregable realmente finalizado':
   'Comparar resultado observado con la oportunidad evaluada';
  const item={id:Utilities.getUuid(),type,quantity:Math.max(1,Math.min(5,Number(quantity)||1)),
   confidence:pct,createdAt:now.toISOString(),prediction,criterion,status:'open'};
  list.unshift(item);
  if(list.length>22||JSON.stringify(list).length>8000)
   return {state:'full',message:'El registro mensual de decisiones está lleno'};
  p.setProperty('RV9_DECISIONS_'+month,JSON.stringify(list));
  return {state:'ok',item,decisions:rv9DecisionSummary_(rv9AllDecisions_(p,now))};
 });
}
function resolveV9Decision(id,outcome){
 if(!/^[0-9a-f-]{20,50}$/i.test(String(id||''))||!['success','failure','inconclusive'].includes(outcome))
  return {state:'invalid'};
 return rv9Locked_(()=>{
  const p=rv9Props_(),now=new Date();
  for(const month of rv9Months_(now,6)){
   const list=rv9Json_(p.getProperty('RV9_DECISIONS_'+month),[]);
   if(!Array.isArray(list))continue;
   const item=list.find(x=>x.id===id);
   if(!item)continue;
   if(item.status!=='open')return {state:'already_resolved'};
   item.status=outcome;item.resolvedAt=now.toISOString();
   p.setProperty('RV9_DECISIONS_'+month,JSON.stringify(list));
   return {state:'ok',decisions:rv9DecisionSummary_(rv9AllDecisions_(p,now))};
  }
  return {state:'not_found'};
 });
}


/**
 * SOURCE SETUP FOR NEW SCRIPT PROJECTS
 *
 * Script Properties are project-specific: creating RV-CCv9 as a new Apps Script
 * project does not import data source IDs from the prior project. This module
 * exposes only booleans and source labels, never private IDs or patient details.
 * Save operation writes ONLY Script Properties after read-only verification.
 */
const RV9_SOURCE_DEFINITIONS=[
 {key:'MATRIX_SHEET_ID',name:'MTS · System Matrix',expected:'weekly'},
 {key:'TRAINING_SHEET_ID',name:'MTS · Execution Log',expected:'training'},
 {key:'CLINICAL_SHEET_ID',name:'RODOLFO.PSICOPRO',expected:'clinic'},
 {key:'FINANCE_SHEET_ID',name:'Finanzas',expected:'finance'}
];
function rv9Configuration_(p,base){
 const sources=RV9_SOURCE_DEFINITIONS.map(s=>{
  const present=/^[A-Za-z0-9_-]{15,}$/.test(String(p.getProperty(s.key)||''));
  let readState=base&&base[({MATRIX_SHEET_ID:'matrix',TRAINING_SHEET_ID:'training',
   CLINICAL_SHEET_ID:'clinical',FINANCE_SHEET_ID:'finance'})[s.key]]?.state||null;
  return {key:s.key,name:s.name,configured:present,
   state:!present?'missing':readState==='error'?'error':readState||'configured',
   needsAction:!present||readState==='error'};
 });
 const missing=sources.filter(x=>!x.configured);
 const inaccessible=sources.filter(x=>x.state==='error');
 return {state:missing.length?'setup_required':inaccessible.length?'access_error':'configured',
  configuredCount:4-missing.length,total:4,
  sources,missing:missing.map(x=>x.name),
  message:missing.length?'Este proyecto de Apps Script todavía no tiene configuradas todas las fuentes. Las propiedades no se copian entre proyectos.':
   inaccessible.length?'Algunas hojas no se pudieron leer: comprueba acceso de la cuenta, IDs y servicio avanzado Sheets.':
   'Las cuatro fuentes están configuradas (esto no garantiza que todos los rangos y métricas sean actuales).'};
}
function rv9SpreadsheetId_(input){
 const str=String(input||'').trim(),link=str.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{15,})(?:\/|$|\?)/);
 if(link)return link[1];
 return /^[A-Za-z0-9_-]{15,}$/.test(str)?str:null;
}
function rv9ValidateSheet_(id,type){
 const response=Sheets.Spreadsheets.get(id,{fields:'properties.title,sheets.properties.title'});
 const tabs=(response.sheets||[]).map(x=>String(x.properties?.title||''));
 const ok=type==='weekly'?tabs.some(x=>/^\d{1,2}\/\d{1,2}$/.test(x)):
  type==='training'?tabs.includes('Daily log')&&tabs.includes('drg'):
  type==='clinic'?tabs.includes('Objetivos/Paciente')&&tabs.includes('Servicios'):
  type==='finance'?tabs.some(x=>/^(?:Pre Oct|Presupuesto|Pre \w+|Presupuesto \w+|MOV OCT|Mov Sep)$/i.test(x)):false;
 if(!ok)throw new Error('La hoja no tiene la estructura esperada para la categoría seleccionada.');
 return String(response.properties?.title||'Hoja comprobada').slice(0,100);
}
function configureV9Sources(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))
  return {state:'invalid',message:'Formulario de fuentes no válido'};
 const entries=[],errors=[];
 for(const definition of RV9_SOURCE_DEFINITIONS){
  const value=String(raw[definition.key]||'').trim();
  if(!value)continue; // partial completion is allowed
  const id=rv9SpreadsheetId_(value);
  if(!id){errors.push(definition.name+': pega un enlace de Google Sheets o ID válido');continue;}
  try{
   const title=rv9ValidateSheet_(id,definition.expected);
   entries.push({key:definition.key,id,title,name:definition.name});
  }catch(e){
   errors.push(definition.name+': no se pudo verificar acceso o estructura. '+String(e.message||'').slice(0,100));
  }
 }
 if(errors.length)return {state:'invalid',errors,message:'No se han guardado cambios; revisa los enlaces'};
 if(!entries.length)return {state:'invalid',message:'Introduce al menos una hoja'};
 return rv9Locked_(()=>{
  const p=rv9Props_();
  for(const row of entries)p.setProperty(row.key,row.id);
  const configuration=rv9Configuration_(p);
  return {state:'ok',saved:entries.map(x=>({name:x.name,title:x.title})),configuration,
   message:'Fuentes guardadas en Script Properties privadas. No se copiaron datos clínicos.'};
 });
}


/**
 * V9 boot is deliberately independent of all Sheets, Calendar and UrlFetch calls.
 * The private app must be able to render its shell even when Google denies
 * a specific spreadsheet or the weather provider is unavailable.
 */
function rv9NullBase_(problem){
 return {
  state:'partial',calendar:{state:'unavailable',todayEvents:[]},
  matrix:{state:'unavailable'},training:{state:'unavailable'},
  clinical:{state:'unavailable'},finance:{state:'unavailable'},
  sleepTrend:{state:'unavailable'},nextAction:{
   title:'Verificar conexiones privadas',
   reason:'El resumen está temporalmente indisponible. '+(problem||''),
   level:'high'
  },sourceHealth:{details:[],available:0,total:5}
 };
}
function rv9StaticArica_(now){
 return {state:'links_only',timezone:RV_TZ,place:'Arica · Chinchorro',
  consultedAt:now.toISOString(),weather:{state:'unavailable'},
  air:{state:'unavailable'},marine:{state:'unavailable'},
  cameras:RV9_CAMERAS,sources:RV9_LOCAL_SOURCES,
  alerts:{state:'links_only',message:'Consultar avisos oficiales directamente en SENAPRED y Armada'}};
}
function rv9SafeInternals_(p,now){
 const inbox=rv9Inbox_(rv9AllIdeas_(p,now));
 return {
  inbox,leads:rv9LeadStats_(p,now),
  decisions:rv9DecisionSummary_(rv9AllDecisions_(p,now))
 };
}
function getV9Bootstrap(){
 const now=new Date(),p=rv9Props_();
 const essentials=rv9SafeInternals_(p,now);
 return {state:'ok',version:RV9_VERSION,generatedAt:now.toISOString(),
  timezone:RV_TZ,configuration:rv9Configuration_(p,null),
  ...essentials,
  arica:rv9StaticArica_(now),
  diagnostics:{
   boot:'ok',version:RV9_VERSION,projectPropertiesReady:true,
   note:'Bootstrap no lee archivos clínicos ni llama a servicios externos'}
 };
}
/** Primary: existing operational V9 data from only the original source engine. */
function getV9Dashboard(){
 const now=new Date(),p=rv9Props_(),essentials=rv9SafeInternals_(p,now);
 let base,error=null;
 try{base=rv9BaseDashboard_();}
 catch(e){
  error='La lectura principal no se completó. Comprueba permisos y ejecuciones de Google Apps Script.';
  base=rv9NullBase_(error);
 }
 const configuration=rv9Configuration_(p,base);
 const empty={business:{merch:[]},performance:{skills:[]}};
 const noWindow={state:'pending',windows:[],message:'Análisis de disponibilidad en curso'};
 return {state:'ok',version:RV9_VERSION,generatedAt:now.toISOString(),timezone:RV_TZ,
  base,configuration,...essentials,
  availability:noWindow,finishes:rv9Finish_(essentials.inbox,noWindow),
  opportunities:rv9Opportunities_(base,empty,essentials.inbox,noWindow),
  extra:{state:'pending',performance:{skills:[],kpis:[]},
   business:{sixMonths:[],merch:[]},service:{state:'pending'}},
  arica:rv9StaticArica_(now),projects:rv9Projects_(p),
  firstAttentions:{state:'pending',currentWeek:null,
   message:'Aún no se ha comprobado el marcador de primeras atenciones'},
  diagnostics:{primary:error?'partial':'ok',
   configuration:configuration.state,
   message:error||'Análisis principal completo; fuentes secundarias se consultan en paralelo'},
  modules:{capture:true,memory:true,scenario:true,arica:true,opportunity:true,
   sourceReadOnly:true,clinicalWrite:false}};
}
/** Secondary datasets: independent of the primary response and weather. */
function getV9Extended(){
 const now=new Date(),p=rv9Props_(),errors=[];
 let extra,availability,firstAttentions;
 try{extra=rv9Extra_(p,now);}
 catch(e){errors.push('intelligence');extra={performance:{state:'error',skills:[],kpis:[]},
  business:{state:'error',sixMonths:[],merch:[]},service:{state:'error'}};}
 try{availability=rv9Available_(p,now);}
 catch(e){errors.push('availability');availability={state:'unavailable',windows:[]};}
 try{firstAttentions=rv9FirstAttentions_(p,now);}
 catch(e){errors.push('first_attentions');firstAttentions={state:'unavailable',currentWeek:null};}
 return {state:errors.length?'partial':'ok',generatedAt:now.toISOString(),
  extra,availability,firstAttentions,errors};
}
/** Arica remote models: isolated so remote latency never blocks clinical data. */
function getV9Arica(){
 const now=new Date();
 try{return rv9Arica_(now);}
 catch(e){return Object.assign(rv9StaticArica_(now),
  {state:'unavailable',message:'Proveedor meteorológico no disponible; enlaces oficiales operativos'});}
}
/** Sanitized status payload; source IDs, events and patient information omitted. */
function getV9Diagnostic(){
 const p=rv9Props_(),now=new Date(),configuration=rv9Configuration_(p,null);
 return {state:'ok',version:RV9_VERSION,
  checkedAt:now.toISOString(),configuration,
  checks:{boot:true,runContext:'Apps Script V9',
   calendarScope:'https://www.googleapis.com/auth/calendar.readonly',
   spreadsheetScope:'https://www.googleapis.com/auth/spreadsheets.readonly',
   externalScope:'https://www.googleapis.com/auth/script.external_request'},
  help:'No contiene IDs, credenciales, nombres, citas ni información clínica.'};
}
