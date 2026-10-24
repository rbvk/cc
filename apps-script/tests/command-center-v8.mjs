import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const base=new URL('../',import.meta.url);
const server=fs.readFileSync(new URL('Code.gs',base),'utf8');
const html=fs.readFileSync(new URL('Index.html',base),'utf8');
new vm.Script(server);
const client=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(client,'Client script is present');
new vm.Script(client);
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
for(const m of client.matchAll(/\$\('([a-z0-9-]+)'\)/g))
  assert.ok(ids.has(m[1]),'Missing DOM ID: '+m[1]);

const now='2026-10-24T21:00:00.000Z';
class Clock extends Date {
  constructor(...args){super(...(args.length?args:[now]));}
  static now(){return Date.parse(now);}
}
const TZ='America/Santiago';
const formatDate=(date,zone,format)=>{
  const d=new Date(date);
  if(format==='u'){
    const weekday=new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short'}).format(d);
    return String(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(weekday)+1);
  }
  if(format==='dd/MM')return new Intl.DateTimeFormat('en-GB',{timeZone:zone,day:'2-digit',month:'2-digit'}).format(d);
  if(format==='HH:mm')return new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);
  return new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',
    ...(format==='yyyy-MM-dd'?{day:'2-digit'}:{})}).format(d);
};
const SID={MATRIX:'MATRIX_TEST_0123456789',TRAINING:'TRAINING_TEST_0123456789',
  CLINICAL:'CLINICAL_TEST_0123456789',FINANCE:'FINANCE_TEST_0123456789'};
const metadata={
  MATRIX:['12/10','19/10','26/10'],
  TRAINING:['Daily log','drg'],
  CLINICAL:['Objetivos/Paciente','19/10','26/10'],
  FINANCE:['Pre Oct']
};
function weekRows(){
  return Array.from({length:24},(_,i)=>[i+':00','','','','','','','']);
}
const prev=weekRows(),current=weekRows(),future=weekRows();
for(let hour=0;hour<8;hour++){
  for(let wd=1;wd<=7;wd++){
    prev[hour][wd]='Zz:';
    current[hour][wd]='Zz:';
  }
}
current[9][1]='Boxeo clase';
current[10][1]='Gym Pull';
future[9][1]='Clase boxeo + Push';
future[10][1]='Reunión externa';
future[11][1]='Atención clínica · RECORD_ALPHA';
const clinicalPast=Array.from({length:13},(_,i)=>[(i+9)+':00','','','','','']);
clinicalPast[0][1]='RECORD_PAST';
const clinicalNext=Array.from({length:13},(_,i)=>[(i+9)+':00','','','','','']);
clinicalNext[0][1]='RECORD_NEXT';
clinicalNext[1][1]='Libre';
const values={
  'MATRIX|12/10':prev,'MATRIX|19/10':current,'MATRIX|26/10':future,
  'TRAINING|Daily log':[
    ['M9','19/10/2026 — Monday','🥊 MON 19/10 · BOXING + PULL','Done'],
    ['M9','22/10/2026 — Thursday','🏋️ THU 22/10 · GYM PUSH + Z2','not done ill'],
    ['M9','24/10/2026 — Saturday','🥊 SAT 24/10 · SPARRING',''],
  ],
  'TRAINING|drg':[['M9','Sat','24/10/2026',1,1,1,1,1,'',1,'Yes','ABORT']],
  'CLINICAL|Objetivos/Paciente':[
    ['Clasificación','Nivel','Faltan'],
    ['13','🔵 Clasificados semanales','—'],
    ['15','🟠 Objetivo habitual','2'],
  ],
  'CLINICAL|19/10':clinicalPast,
  'CLINICAL|26/10':clinicalNext,
  'FINANCE|Pre Oct':[
    ['Presupuesto mensual'],
    ['Mes activo','October 2026',''],
    ['Categoría','Presupuesto','Gasto real'],
    ['Comida','$100,000','$145,000'],
    ['Transporte','$50,000','$45,000'],
    ['TOTAL presupuesto','$150,000','$190,000'],
  ],
};
const stored={};
const getProps=()=>({
  getProperty(key){return key==='FINANCE_BUDGET_TAB'?'Pre Oct':stored[key]??SID[key.replace('_SHEET_ID','')]??null;},
  setProperty(key,val){stored[key]=String(val);return this;}
});
const Sheets={Spreadsheets:{
  get(id){
    const name=Object.keys(SID).find(key=>SID[key]===id);
    return {sheets:(metadata[name]||[]).map((title,i)=>({properties:{title,sheetId:100+i}}))};
  },
  Values:{get(id,range){
    const name=Object.keys(SID).find(key=>SID[key]===id);
    const tab=range.match(/^'([^']+)'!/)?.[1];
    return {values:values[name+'|'+tab]||[]};
  }}
}};
function event(title,start,end){
  return {getTitle:()=>title,getStartTime:()=>new Clock(start),
    getEndTime:()=>new Clock(end),isAllDayEvent:()=>false};
}
const meetings=[
  event('CALENDAR_MEETING','2026-10-26T13:00:00Z','2026-10-26T14:00:00Z'),
  event('CALENDAR_UNMATCHED','2026-10-26T16:00:00Z','2026-10-26T17:00:00Z'),
  event('CALENDAR_TODAY','2026-10-24T22:00:00Z','2026-10-24T23:00:00Z')
];
const CalendarApp={getDefaultCalendar:()=>({
 getEvents:(from,to)=>meetings.filter(e=>e.getEndTime()>from&&e.getStartTime()<to),
 getEventsForDay:()=>meetings.filter(e=>e.getTitle()==='CALENDAR_TODAY')
})};
const sandbox={Date:Clock,Utilities:{formatDate},Sheets,CalendarApp,
  PropertiesService:{getScriptProperties:getProps},
  HtmlService:{createHtmlOutputFromFile:()=>({setTitle(){return this;},addMetaTag(){return this;}})}
};
const ctx=vm.createContext(sandbox);
vm.runInContext(server,ctx);
const one=vm.runInContext('getDashboard()',ctx);
assert.equal(one.release.version,'2026.10.24.8');
assert.equal(one.training.drgToday.output,'ABORT');
assert.ok(one.training.adherence.boxing.planned>=1);
assert.ok(one.training.adherence.gym.planned>=1);
assert.ok(one.sleepTrend.observedNights>=5);
assert.ok(one.sleepTrend.averageHours!==null);
assert.equal(one.finance.projection.state,'ok');
assert.ok(one.finance.projection.projectedSpent>one.finance.spent);
assert.equal(one.clinical.weekly,13);
assert.equal(one.clinical.capacity.patientsToTarget,2);
assert.ok(one.clinical.capacity.attendedSessionsThisWeek>=1);
assert.equal(one.comparisons.clinical.state,'ok');
assert.ok(one.comparisons.clinical.matrixOnlyItems[0].matrixUrl.includes('&range='));
assert.ok(one.comparisons.calendar.calendarMissingMatrix>=1);
assert.ok(one.comparisons.calendar.items.some(x=>x.matrixUrl.includes('&range=')));
assert.equal(one.calendar.todayEvents[0].title,'CALENDAR_TODAY');
assert.equal(one.history.state,'baseline');
assert.equal(one.sourceHealth.total,5);
const two=vm.runInContext('getDashboard()',ctx);
assert.equal(two.history.state,'ok');
assert.equal(two.history.open,one.history.open);
// Only hashed operational identities, no source text in persistent history.
assert.ok(!JSON.stringify(stored).includes('RECORD_ALPHA'));
assert.ok(!JSON.stringify(stored).includes('CALENDAR_MEETING'));
console.log('PASS — eight operational features, owner-only source links, version, KPI logic and history.');
