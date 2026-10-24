import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const root=new URL('../',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');
const legacy=read('Code.gs'),core=read('V9_Core.gs'),extra=read('V9_Intelligence.gs'),html=read('V9.html');
[legacy,core,extra].forEach(s=>new vm.Script(s));
const client=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(client);new vm.Script(client);
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
for(const m of client.matchAll(/\$\('([a-z0-9-]+)'\)/g))assert.ok(ids.has(m[1]),'Missing '+m[1]);
assert.equal((client.match(/"id":"AR-\d\d"/g)||[]).length,11);
assert.equal((client.match(/"id":"(?:BX|CL|GY|TH|PR|FN|SL|FF|CP)-\d\d"/g)||[]).length,18);
const manifest=JSON.parse(read('appsscript.json'));
assert.equal(manifest.webapp.access,'MYSELF');
assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/script.external_request'));
assert.ok(!manifest.oauthScopes.includes('https://www.googleapis.com/auth/spreadsheets'));
assert.ok(legacy.includes("legacy?'Index':'V9'"));

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
 getProperty:k=>stored[k]||({MATRIX_SHEET_ID:'MATRIX_ID_SYNTHETIC_1234',FINANCE_SHEET_ID:'FINANCE_ID_SYNTHETIC_1234',CLINICAL_SHEET_ID:'CLINIC_ID_SYNTHETIC_1234'}[k]||null),
 setProperty(k,v){stored[k]=String(v)},deleteProperty(k){delete stored[k]}})},
 LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
 CacheService:{getScriptCache:()=>({get(){return null},put(){}})},
 UrlFetchApp:{fetch:url=>({getResponseCode:()=>200,getContentText:()=>{
 if(url.includes('air-quality-api'))return JSON.stringify({current:{pm2_5:9,us_aqi:35,time:'2026-10-24T18:00'}});
 if(url.includes('marine-api'))return JSON.stringify({current:{wave_height:1.2,wave_period:9,time:'2026-10-24T18:00'}});
 return JSON.stringify({current:{temperature_2m:20.5,wind_speed_10m:14,time:'2026-10-24T18:00'}});
 }})},
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
 "'19/10'!A3:F15":[['9:00','Primera sesión 🆕','','','','']]
 })[range]||[],
 money_:value=>value===null||value===undefined?null:Number(String(value).replace(/[^0-9-]/g,'')),
 clp_:v=>String(v),
 getDashboard:()=>({clinical:{state:'ok',weekly:13,target:15,gap:-2},
 finance:{state:'ok',spent:180000,budget:150000,over:30000},
 training:{drgToday:{output:'PROCEED'},adherence:{boxing:{planned:3,done:2,unverified:1}}}})
};
const ctx=vm.createContext(mock);vm.runInContext(core+'\n'+extra,ctx);
const call=(name,...params)=>{ctx.params=params;return vm.runInContext(name+'(...params)',ctx)};
const v=call('getV9Dashboard');
assert.equal(v.version,'2026.10.24.9');
assert.equal(v.extra.business.merch[0].inventoryAtCost,34000);
assert.equal(v.extra.service.gross,35000);
assert.equal(v.arica.weather.temperature,20.5);
assert.equal(v.arica.marine.waveHeight,1.2);
assert.ok(v.availability.windows.length>0);
assert.equal(v.firstAttentions.currentWeek,1);
assert.ok(v.opportunities.items.some(x=>x.id==='capacity'));
const lead=call('recordV9Lead','Google Maps');
assert.equal(lead.stats.week,1);
assert.equal(call('undoV9Lead',lead.token).stats.week,0);
const idea=call('captureV9Idea','Terminar manuscrito de tesis en 45 min');
assert.equal(idea.item.minutes,45);
assert.equal(idea.item.area,'Tesis');
assert.equal(call('captureV9Idea','Terminar manuscrito de tesis en 45 min').state,'duplicate');
assert.equal(call('setV9TaskStatus',idea.item.id,'done').inbox.open,0);
const sim=call('simulateV9Scenario','clinical',2);
assert.equal(sim.applied,false);assert.equal(sim.results.find(x=>/neto potencial/i.test(x.label)).value,168000);
console.log('PASS: V9 private scopes, 29 photo references, model Arica, capture, leads, undo, opportunities and scenarios');
