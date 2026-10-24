/**
 * RV Command Center V9 — owner-only data operations.
 * V8 Code.gs remains intact as rollback. No sensitive clinical information
 * may be stored in these aggregated counters or the ideas inbox.
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
function getV9Dashboard(){
 const now=new Date(),p=rv9Props_(),base=getDashboard();
 const ideas=rv9AllIdeas_(p,now),inbox=rv9Inbox_(ideas),leads=rv9LeadStats_(p,now);
 const availability=rv9Available_(p,now),extra=rv9Extra_(p,now);
 const opportunities=rv9Opportunities_(base,extra,inbox,availability);
 return {state:'ok',version:RV9_VERSION,generatedAt:now.toISOString(),timezone:RV_TZ,
  base,inbox,leads,availability,finishes:rv9Finish_(inbox,availability),
  opportunities,extra,arica:rv9Arica_(now),projects:rv9Projects_(p),
  firstAttentions:rv9FirstAttentions_(p,now),
  modules:{capture:true,memory:true,scenario:true,arica:true,opportunity:true,
   sourceReadOnly:true,clinicalWrite:false}};
}
