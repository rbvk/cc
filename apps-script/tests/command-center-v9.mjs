import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const root=new URL('../',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');
const engine=read('Code.gs'),core=read('V9_Core.gs'),extra=read('V9_Intelligence.gs'),local=read('V9_Local.gs'),html=read('Index.html');
[engine,core,extra,local].forEach(s=>new vm.Script(s));
const client=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(client);new vm.Script(client);
for(const name of ['renderRadar','renderMtsProgress','renderClinicTracking']){
 assert.ok(client.includes('function '+name+'('),'Dashboard requires '+name+' to be defined');
}
assert.ok(client.includes('function renderAudits('),'Audit must be visible');
assert.ok(client.includes('function renderLocal('),'Dated regional data must have a renderer');
assert.ok(html.includes('id="boxing-radar"'));
assert.ok(html.includes('id="intel-mts-progress"'));
assert.ok(html.includes('id="clinic-weeks-bars"'));
assert.ok(html.includes('id="audit-detailed"'));

const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
for(const m of client.matchAll(/\$\('([a-z0-9-]+)'\)/g))assert.ok(ids.has(m[1]),'Missing '+m[1]);
assert.equal((client.match(/"id":"AR-\d\d"/g)||[]).length,11);
assert.equal((client.match(/"id":"(?:BX|CL|GY|TH|PR|FN|SL|FF|CP)-\d\d"/g)||[]).length,18);
const manifest=JSON.parse(read('appsscript.json'));
assert.equal(manifest.webapp.access,'MYSELF');
assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/script.external_request'));
assert.ok(![engine,core,extra].some(code=>/UrlFetchApp\.fetchAll|api\.open-meteo\.com/i.test(code)),'Weather API must not execute in bootstrap, sheet analysis or intelligence');
assert.ok(/function getV9LocalData\(/.test(local),'On-demand Arica source must exist');
assert.ok(!/setInterval\([^\n]*getV9LocalData/.test(client),'No repeating weather fetch timer');
assert.ok(client.includes('loadLocalOnDemand()'),'Arica navigation should fetch on demand');
assert.ok(html.includes('id="audit-detailed"')&&html.includes('id="boxing-radar"')&&html.includes('id="clinic-weeks-bars"'),'Cross-system audit, boxing radar and clinic chart should be visible');
assert.ok(!html.includes('id="intel-fotografias"')&&!html.includes('id="arica-photos"'),'No photo-only galleries');
assert.ok((html.match(/data-photo="/g)||[]).length>=20,'At least twenty editorial image placements');
assert.ok(!manifest.oauthScopes.includes('https://www.googleapis.com/auth/spreadsheets'));
assert.equal(manifest.webapp.executeAs,'USER_DEPLOYING');
assert.equal(manifest.webapp.access,'MYSELF');
assert.ok(engine.includes("createHtmlOutputFromFile('Index')"));
assert.ok(!engine.includes('?view=v8'));
assert.ok(!engine.includes('getMatrixOnlyClinicalDetail'));
assert.ok(html.includes('id="setup-banner"'));
assert.ok(html.includes('configureV9Sources'));

const now='2026-10-24T21:00:00Z';let sequence=0;const stored={};
class Clock extends Date{constructor(...a){super(...(a.length?a:[now]))}static now(){return Date.parse(now)}}
const format=(date,tz,fmt)=>{
 const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return {'yyyy-MM':p.year+'-'+p.month,'yyyy-MM-dd':p.year+'-'+p.month+'-'+p.day,'HH':p.hour,'mm':p.minute,'dd/MM':p.day+'/'+p.month}[fmt];
};
const mock={
 Date:Clock,RV_TZ:'America/Santiago',
 Utilities:{formatDate:format,getUuid:()=> '00000000-0000-4000-8000-'+String(++sequence).padStart(12,'0'),
 DigestAlgorithm:{SHA_256:'SHA_256'},computeDigest:(_,s)=>Array.from(crypto.createHash('sha256').update(s).digest()),
 base64EncodeWebSafe:data=>Buffer.from(data).toString('base64url')},
 PropertiesService:{getScriptProperties:()=>({
 getProperty:k=>Object.prototype.hasOwnProperty.call(stored,k)?stored[k]:({MATRIX_SHEET_ID:'MATRIX_ID_SYNTHETIC_1234',FINANCE_SHEET_ID:'FINANCE_ID_SYNTHETIC_1234',CLINICAL_SHEET_ID:'CLINIC_ID_SYNTHETIC_1234',TRAINING_SHEET_ID:'TRAINING_ID_SYNTHETIC_1234'}[k]||null),
 setProperty(k,v){stored[k]=String(v)},deleteProperty(k){delete stored[k]}})},
 LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
 CacheService:{getScriptCache:()=>({get(){return null},put(){}})},
 Sheets:{Spreadsheets:{get:(id)=>({properties:{title:'Synthetic '+id},
  sheets:['Daily log','drg','Objetivos/Paciente','Servicios','19/10','Pre Oct']
   .map(title=>({properties:{title}}))})}},
 CalendarApp:{getDefaultCalendar:()=>({getEvents:()=>[]})},
 startMonday_:()=>new Clock('2026-10-19T15:00:00Z'),weekKey_:()=> '19/10',
 readMatrix_:()=>({available:['19/10'],slots:{'2026-10-24':Object.fromEntries(Array.from({length:24},(_,h)=>[h*60,{busy:false}]))}}),
 plusDays_:(d,n)=>new Clock(d.getTime()+n*86400000),
 hour_:s=>String(s).includes(':')?Number(String(s).split(':')[0])*60+Number(String(s).split(':')[1]):null,
 sheetMetadata_:()=>[{title:'19/10'}],matchTab_:(tabs,week)=>tabs.includes(week)?week:null,
 values_:(_,range)=>({
 "'Boxing roadmap'!A2:D30":[['Jab','Offense',5,7]],
 "'MONTH KPI'!A2:F40":[['Strength','Bench','60 kg','100 kg']],
 "'Bodyfat'!A2:G30":[['2026-09-25',8,8,8,24,1,11]],
 "'📆 Plan 6 meses'!A4:H18":[['Oct-26',12,648000,400000,null,634000,770000]],
 "'🥊 BOXINGCI Merch'!A2:K10":[['Protector bucal',4250,10000,8,0]],
 "'Servicios'!A1:A10":[['Sesión individual — $35.000']],
 "'19/10'!A3:F15":[['9:00','Primera sesión 🆕 ✅','','','','']]
 })[range]||[],
 money_:value=>value===null||value===undefined?null:Number(String(value).replace(/[^0-9-]/g,'')),
 clp_:v=>String(v),
 rv9BaseDashboard_:()=>({clinical:{state:'ok',weekly:13,target:15,gap:-2},
 finance:{state:'ok',spent:180000,budget:150000,over:30000},
 training:{drgToday:{output:'PROCEED'},adherence:{boxing:{planned:3,done:2,unverified:1}}}})
};
const ctx=vm.createContext(mock);vm.runInContext(core+'\n'+extra,ctx);
const call=(name,...params)=>{ctx.params=params;return vm.runInContext(name+'(...params)',ctx)};
const boot=call('getV9Bootstrap');
assert.equal(boot.state,'ok');
assert.equal(boot.configuration.state,'configured');
assert.equal(boot.arica.state,'links_only');
assert.ok(boot.arica.sources.length>=3);
assert.ok(!('weather' in boot.arica));
assert.equal(call('rv9MetricNumber_','7'),7);
assert.equal(call('rv9MetricNumber_','3,5'),3.5);
assert.equal(call('rv9MetricNumber_',''),null);
assert.equal(call('rv9MetricNumber_','7 kg'),null);
const v=call('getV9Dashboard');
const extended=call('getV9Extended');
assert.equal(extended.state,'ok');
assert.equal(v.diagnostics.primary,'ok');
assert.equal(v.extra.state,'pending');
assert.equal(v.availability.state,'pending');
assert.equal(call('getV9Diagnostic').checks.outboundWeatherRequests,false); // boot remains network-free
assert.equal(v.version,'9.3.0');
assert.equal(v.configuration.state,'configured');
assert.ok(!('externalScope' in call('getV9Diagnostic').checks));
stored.MATRIX_SHEET_ID='';
assert.equal(call('getV9Dashboard').configuration.state,'setup_required');
assert.equal(call('configureV9Sources',{MATRIX_SHEET_ID:'invalid id'}).state,'invalid');
assert.equal(call('configureV9Sources',{MATRIX_SHEET_ID:'https://docs.google.com/spreadsheets/d/MATRIX_REPAIRED_SYNTHETIC_1234/edit?gid=1'}).state,'ok');
assert.equal(stored.MATRIX_SHEET_ID,'MATRIX_REPAIRED_SYNTHETIC_1234');
assert.equal(call('getV9Dashboard').configuration.state,'configured');
assert.equal(extended.extra.business.merch[0].inventoryAtCost,34000);
assert.equal(extended.extra.service.gross,35000);
assert.ok(extended.availability.windows.length>0);
assert.equal(extended.firstAttentions.currentWeek,1);
assert.ok(v.arica.cameras.length>0);
// A first appointment without an explicit attendance mark cannot be counted as attended.
const originalValues=ctx.values_;
ctx.values_=(id,range)=>range==="'19/10'!A3:F15"?
 [['9:00','Primera sesión 🆕','','','','']]:originalValues(id,range);
const unverifiedFirst=call('rv9FirstAttentions_',mock.PropertiesService.getScriptProperties(),new Clock(now));
assert.equal(unverifiedFirst.state,'unverified');
assert.equal(unverifiedFirst.currentWeek,null);
assert.equal(unverifiedFirst.candidateFirstAppointments,1);
ctx.values_=originalValues;
// Missing Calendar authorization must never create fictitious free time.
const originalCalendar=ctx.CalendarApp;
ctx.CalendarApp={getDefaultCalendar(){throw new Error('Calendar denied')}};
const unavailableWindows=call('rv9Available_',mock.PropertiesService.getScriptProperties(),new Clock(now));
assert.equal(unavailableWindows.state,'unavailable');
assert.equal(unavailableWindows.windows.length,0);
ctx.CalendarApp=originalCalendar;
// Rest, sleep, and meal blocks are not valid task windows.
const originalMatrix=ctx.readMatrix_;
ctx.readMatrix_=()=>({available:['19/10'],slots:{'2026-10-24':
 Object.fromEntries(Array.from({length:24},(_,h)=>[h*60,{busy:false,protectedTime:true}]))}});
assert.equal(call('rv9Available_',mock.PropertiesService.getScriptProperties(),new Clock(now)).windows.length,0);
ctx.readMatrix_=originalMatrix;
assert.ok(!('weather' in v.arica));
assert.ok(v.opportunities.items.some(x=>x.id==='capacity'));
// Simulate failure in the core Sheets/Calendar source: boot and UI must remain usable.
const originalBase=ctx.rv9BaseDashboard_;
ctx.rv9BaseDashboard_=()=>{throw new Error('Synthetic Sheets outage')};
const degraded=call('getV9Dashboard');
assert.equal(degraded.state,'ok');
assert.equal(degraded.diagnostics.primary,'partial');
assert.equal(degraded.base.clinical.state,'unavailable');
assert.equal(degraded.configuration.state,'configured');
assert.equal(call('getV9Bootstrap').state,'ok');
ctx.rv9BaseDashboard_=originalBase;
const lead=call('recordV9Lead','Google Maps');
assert.equal(lead.stats.week,1);
assert.equal(call('undoV9Lead',lead.token).stats.week,0);
const idea=call('captureV9Idea','Terminar manuscrito de tesis en 45 min');
assert.equal(idea.item.minutes,45);
assert.equal(idea.item.area,'Tesis');
assert.equal(call('captureV9Idea','Terminar manuscrito de tesis en 45 min').state,'duplicate');
assert.equal(call('setV9TaskStatus',idea.item.id,'done').inbox.open,0);
// Reconstruct the two critical calculations from the original Code.gs
// with synthetic, nonpatient fixtures. No live Sheets are written.
const fn = name=>{
 const start=engine.indexOf('function '+name+'(');
 assert.ok(start>=0,'Missing source function '+name);
 const end=engine.indexOf('\nfunction ',start+12);
 return engine.slice(start,end<0?engine.length:end);
};
const dedicated=vm.createContext({
 Date:Clock,RV_TZ:'America/Santiago',
 Utilities:mock.Utilities,
 iso_:d=>new Date(d).toISOString().slice(0,10),
 parseDmy_:v=>{
  const m=String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m?new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),12):null;
 },
 sheetMetadata_:()=>[{title:'Daily log',sheetId:17},{title:'Objetivos/Paciente',sheetId:33}],
 values_:(id,range)=>{
  if(range==="'Daily log'!A2:D1200")return [
   ['M9W6','18/10/2026 — Sunday','🥊 SUN 18/10 · Coached Boxing','Done'],
   ['M9W6','18/10/2026 — Sunday','🥊 Coached Boxing — 105 min','Done'],
   ['M9W6','19/10/2026 — Monday','🥊 MON 19/10 · Coached Boxing + LEGS',''],
   ['M9W6','19/10/2026 — Monday','🥊 Coached Boxing — 105 min','Done'],
   ['M9W6','19/10/2026 — Monday','🥊 TECH primer INSIDE CLASS','Done'],
   ['M9W6','21/10/2026 — Wednesday','🥊 WED 21/10 · Coached Boxing',''],
   ['M9W6','21/10/2026 — Wednesday','🥊 Coached Boxing — 105 min','done'],
   ['M9W6','21/10/2026 — Wednesday','🥊 Warm-up INSIDE CLASS','Done'],
   ['M9W6','23/10/2026 — Friday','🥊 Coached Boxing — 105 min','not done ill']];
  if(range==="'drg'!A2:L800")return [];
  if(range==="'Objetivos/Paciente'!A25:D75")return [
   ['SEGUIMIENTO SEMANAL'],['Semana','Sesiones','Cupos','Ocupación'],
   ['21/09','12','15','80%'],['28/09','10','15','66.7%'],
   ['5/10','9','15','60%'],['12/10','12','15','80%'],
   ['19/10','6','15','40%'],['26/10','18','15','120%']];
  return [];
 },
 money_:v=>Number.isFinite(Number(v))&&String(v).trim()?Number(v):null,
 plusDays_:(d,n)=>new Date(d.getTime()+n*86400000),
 startMonday_:()=>new Date('2026-10-19T12:00:00Z'),
 tabUrl_:()=> 'https://docs.google.com/spreadsheets/d/synthetic/edit#gid=33',
 cellUrl_:(_,tab,address)=>'https://docs.google.com/spreadsheets/d/synthetic/edit#range='+address,
 weekKey_:()=> '19/10',
 isSessionHeader_:v=>/^\s*🥊\s*(?:MON|TUE|WED|THU|FRI|SAT|SUN)\b/i.test(String(v)),
 planTypes_:v=>/coached|box/i.test(String(v).toLowerCase())?['boxing']:[],
 formatDate:format,
 money_:v=>v===null?null:Number(v),
 RV_TARGET_WEEKLY:15
});
vm.runInContext(fn('readTraining_')+'\n'+fn('rv9ClinicalWeekly_'),dedicated);
const training=vm.runInContext("readTraining_('MTS_SYNTHETIC',new Date('2026-10-25T13:00:00Z'))",dedicated);
assert.equal(training.publicData.coachedClasses7d,2,'Unique completed coached days, not inner drills');
assert.equal(training.publicData.adherence.boxing.planned,2,
 'Seven-day inclusive window must exclude the previous Sunday header');
assert.deepEqual(Array.from(training.publicData.coachedClassEntries,x=>x.date),['2026-10-19','2026-10-21']);
const clinics=vm.runInContext("rv9ClinicalWeekly_('PSICO_SYNTHETIC',[],new Date('2026-10-25T13:00:00Z'))",dedicated);
assert.equal(clinics.currentWeek,6);
assert.equal(clinics.monthToDate,27);
assert.equal(clinics.upcoming[0].sessions,18,'Future week must not contaminate month-to-date');
// Source booking hours must not be presented as verified clinical attendance.
Object.assign(dedicated,{
 matchTab_:(tabs,key)=>tabs.includes(key)?key:null,
 hour_:value=>Number(String(value).split(':')[0])*60+Number(String(value).split(':')[1]||0),
 isFree_:text=>!String(text||'').trim(),
 values_:(_,range)=>range==="'19/10'!A3:F15"?
  [['9:00','Reserva agendada'],['10:00','Atendida ✅']]:[]
});
vm.runInContext(fn('readClinicalHours_'),dedicated);
const hours=vm.runInContext("readClinicalHours_('SYNTHETIC',['19/10'],[],new Date('2026-10-25T13:00:00Z'))",dedicated);
assert.equal(hours.elapsedBookingHours,2,'Two past booked hours');
assert.equal(hours.verifiedAttendedHours,1,'Only explicitly marked completed visit');
assert.equal(hours.attendedHours,1,'Do not equate booked hours with attendance');

// Simulate on-demand Arica. Not part of the initial getV9Dashboard RPC.
const newsFixture='<rss><channel><item><title>Alerta temprana preventiva en Parinacota - SENAPRED</title>'+
 '<link>https://news.google.com/rss/articles/abc</link>'+
 '<pubDate>Thu, 22 Oct 2026 19:21:00 GMT</pubDate></item></channel></rss>';
const quakeFixture='<table><tbody><tr><td>2026-10-24 20:05:00<br>12 km al E de Putre</td><td>105 km</td><td>3.4</td></tr></tbody></table>';
const marineNewsFixture='<rss><item><title>Aviso de marejadas desde Golfo de Penas hasta Arica - Armada de Chile</title>'+
 '<link>https://news.google.com/rss/articles/armada</link>'+
 '<pubDate>Wed, 30 Sep 2026 10:00:00 GMT</pubDate></item></rss>';
const responses=[
 {current:{temperature_2m:21,wind_speed_10m:14,uv_index:8,time:'2026-10-24T18:00',relative_humidity_2m:72,apparent_temperature:22}},
 {current:{pm2_5:6,us_aqi:25,time:'2026-10-24T18:00'}},
 {current:{wave_height:1.4,wave_period:8,time:'2026-10-24T18:00'}},
 quakeFixture,newsFixture,marineNewsFixture
];
let fetchCalls=0;
Object.assign(ctx,{
 UrlFetchApp:{fetchAll:requests=>{fetchCalls++;assert.equal(requests.length,6);return responses.map(x=>({
  getResponseCode:()=>200,getContentText:()=>typeof x==='string'?x:JSON.stringify(x)
 }))}},
 CacheService:{getScriptCache:()=>({get(){return null},put(){}})}
});
vm.runInContext(local,ctx);
const region=call('getV9LocalData');
assert.equal(region.weather.temperature,21);
assert.equal(region.air.pm25,6);
assert.equal(region.marine.waveHeight,1.4);
assert.equal(region.seismic.events.length,1);
assert.equal(region.seismic.events[0].location,'12 km al E de Putre');
assert.equal(region.senapred.items.length,1);
assert.equal(region.senapred.state,'indexed');
assert.equal(region.maritimeBulletins.state,'indexed');
assert.equal(region.maritimeBulletins.items.length,1);
assert.match(region.maritimeBulletins.items[0].title,/marejadas/i);
assert.equal(fetchCalls,1,'Only one bounded on-demand request batch');
const sim=call('simulateV9Scenario','clinical',2);
assert.equal(sim.applied,false);assert.equal(sim.results.find(x=>/neto potencial/i.test(x.label)).value,168000);
const recorded=call('recordV9Decision','clinical',2,70);
assert.equal(recorded.state,'ok');
assert.equal(recorded.decisions.open,1);
assert.equal(recorded.item.confidence,70);
const verified=call('resolveV9Decision',recorded.item.id,'success');
assert.equal(verified.state,'ok');
assert.equal(verified.decisions.open,0);
assert.equal(verified.decisions.completed,1);
assert.equal(call('resolveV9Decision',recorded.item.id,'success').state,'already_resolved');
assert.equal(call('recordV9Decision','clinical',2,101).state,'invalid');

console.log('PASS V9: coached Mon+Wed classes, October PSICOPRO 27 excluding future, radar/audit UI, indexed SENAPRED, dated CSN, cached on-demand Arica, privacy and decisions');
