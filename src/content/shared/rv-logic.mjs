export const num = value => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = String(value ?? '').trim();
  if (!s || s === '-' || s === '—') return null;
  const digits=s.replace(/[^0-9-]/g, '');
  if(!/\d/.test(digits)) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
};
export function dateISO(value) {
  const s = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  if (/^\d{5}$/.test(s)) return new Date(Date.UTC(1899,11,30)+Number(s)*86400000).toISOString().slice(0,10);
  return null;
}
export function slots(values, week, columns = 5) {
  const first = new Date(`${week}T12:00:00Z`);
  return values.slice(2).flatMap((r,i) => {
    const h=String(r[0]??'').trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (!h || Number(h[1])>23) return [];
    return Array.from({length:columns},(_,j)=>{
      const date = new Date(first.valueOf()+j*86400000).toISOString().slice(0,10);
      const value = String(r[j+1]??'').trim();
      return {date,hour:Number(h[1]),minute:Number(h[2]||0),status:/^libre$/i.test(value)?'Libre':/^bloqueado$/i.test(value)?'Bloqueado':value?'Reservado':'Sin dato',row:i+3,column:j+2};
    });
  });
}
export function drgAssessment(values, today) {
  const rows=values.slice(1).filter(r=>dateISO(r[2]) && r.slice(3,8).every(x=>String(x??'').trim()!==''));
  const current=rows.filter(r=>dateISO(r[2])===today).at(-1);
  const last=rows.filter(r=>dateISO(r[2])<=today).sort((a,b)=>dateISO(a[2]).localeCompare(dateISO(b[2]))).at(-1);
  return {current:current?{date:today,score:num(current[9]),output:String(current[11]??''),hardStop:/^(yes|si|sí|true)$/i.test(String(current[10]))}:null,last:last?{date:dateISO(last[2]),score:num(last[9]),output:String(last[11]??'')}:null};
}
export function overlapping(a,b) {return Date.parse(a.start)<Date.parse(b.end)&&Date.parse(b.start)<Date.parse(a.end);}
export function weekStart(today,offset=0) {
 const d=new Date(`${today}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7)+offset*7);return d.toISOString().slice(0,10);
}
export function reportedFreeCount(values) {
  const legacy=values.find(r=>String(r[1]??'').toLowerCase().includes('horas libre'));
  const count=num(legacy?.[2]);
  if(count!==null)return count;
  const summaries=values.flatMap(r=>r.filter(v=>typeof v==='string')).map(v=>v.match(/horas disponibles esta semana\s*:\s*\*?\s*(\d+)/i)).filter(Boolean).map(m=>Number(m[1]));
  if(new Set(summaries).size>1)throw new Error('PSICOPRO: conflicting availability summaries');
  return summaries[0]??null;
}
export function budgetAssessment(values) {
  const header=values.findIndex(r=>String(r[0]??'').trim()==='Categoría'&&/presupuesto/i.test(String(r[1]??''))&&/gasto real/i.test(String(r[2]??'')));
  const totalIndex=values.findIndex((r,i)=>i>header&&/Total presupuesto/i.test(String(r[0]??'')));
  if(header<0||totalIndex<=header+1)throw new Error('Finance: budget schema is not recognized');
  const rows=values.slice(header+1,totalIndex).filter(r=>String(r[0]??'').trim()).map(r=>({category:String(r[0]),budget:num(r[1]),actual:num(r[2])}));
  if(new Set(rows.map(r=>r.category.trim())).size!==rows.length)throw new Error('Finance: duplicate budget categories');
  const budget=num(values[totalIndex][1]),expense=num(values[totalIndex][2]);
  if(budget===null||expense===null)throw new Error('Finance: missing budget totals');
  const sum=field=>rows.reduce((a,r)=>a+(r[field]??0),0);
  if(sum('budget')!==budget||sum('actual')!==expense)throw new Error('Finance: categories do not reconcile to totals');
  const incomeRows=values.filter((r,i)=>i>totalIndex&&/Ingresos netos/i.test(String(r[0]??'')));
  const incomes=incomeRows.map(r=>num(r[2])).filter(x=>x!==null);
  if(!incomes.length||new Set(incomes).size!==1)throw new Error('Finance: missing or conflicting net income');
  return {rows,budget,expense,income:incomes[0]};
}
export function evaluate(input,today) {
  const alerts=[];
  const add=(id,domain,priority,title,evidence,action,sourceId,anchor='')=>alerts.push({id,domain,priority,title,evidence,action,sourceId,anchor});
  const currentWeek=weekStart(today),nextWeek=weekStart(today,1);
  const current=slots(input.psicoCurrent.values,currentWeek);
  const next=slots(input.psicoNext.values,nextWeek);
  const nextFree=next.filter(s=>s.status==='Libre').length;
  const nextBooked=next.filter(s=>s.status==='Reservado').length;
  const reported=reportedFreeCount(input.psicoNext.values);
  if(reported!==null&&reported!==nextFree) add('psico-free-count','PSICOPRO','Media','El contador de cupos no coincide',`${nextFree} casillas Libre y ${reported} en el contador de la semana de ${nextWeek}.`,'Revisar el contador de horas libres','psico','Contador de la próxima semana');
  const mtsValues=[...input.mts.values.slice(2),...input.mtsLate.values];
  const matches=[];
  const reference=input.referenceNow?new Date(input.referenceNow):null;
  const currentHour=reference?new Intl.DateTimeFormat('en-GB',{timeZone:'America/Santiago',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(reference).split(':').reduce((a,v,i)=>a+Number(v)/(i?60:1),0):0;
  for(const s of current.filter(s=>s.status==='Libre'&&s.date>=today)) {
    if(s.date===today&&s.hour+1<=currentHour)continue;
    const row=mtsValues.find(r=>Number(String(r[0]).split(':')[0])===s.hour);
    const text=String(row?.[s.column-1]??'').trim();
    if(/boxeo|gym|bomberos|paciente|reuni|cita:/i.test(text)) matches.push({...s,activity:/boxeo/i.test(text)?'Boxeo':/gym/i.test(text)?'Gimnasio':/bomberos/i.test(text)?'Bomberos':'Compromiso MTS'});
  }
  if(matches.length) add('clinical-training-conflict','Agenda','Alta','Un cupo clínico coincide con MTS',matches.map(x=>`${x.date} ${String(x.hour).padStart(2,'0')}:00: Libre en PSICOPRO y ${x.activity} en MTS.`).join(' '),'Revisar disponibilidad antes de reservar','psico','19/10');
  if(nextBooked&&input.calendarNext.events.length===0&&!input.calendarNext.next_page_token) add('calendar-nextweek-empty','Agenda','Alta','Las reservas próximas no aparecen en Calendar',`${nextBooked} reservas en PSICOPRO para la semana de ${nextWeek}; la consulta del calendario principal para los cinco días laborables devuelve 0 eventos.`,'Revisar la sincronización de la próxima semana','psico','Próxima semana');
  const assessedBudget=budgetAssessment(input.budget.values);
  const budgetRows=assessedBudget.rows;
  const {budget:b,expense,income:net}=assessedBudget;
  if(b!==null&&expense!==null&&expense>b) add('finance-over-budget','Finanzas','Alta','El gasto registrado supera el presupuesto',`Gasto $${expense.toLocaleString('es-CL')} frente a $${b.toLocaleString('es-CL')}: exceso de $${(expense-b).toLocaleString('es-CL')}. El corte del registro financiero se detalla en Sistemas.`,'Revisar categorías sobre presupuesto','finance','Presupuesto del mes');
  const ledger=[...input.ledgerHead.values.slice(1),...input.ledgerTail.values.slice(1)].filter(r=>dateISO(r[0]));
  const latest=ledger.map(r=>dateISO(r[0])).sort().at(-1);
  const age=latest?Math.round((Date.parse(today)-Date.parse(latest))/86400000):null;
  if(age!==null&&age>7) add('finance-stale','Finanzas','Media','Faltan movimientos recientes',`El último movimiento registrado es del ${latest}; ${age} días de desfase respecto a la revisión.`,'Actualizar la cartola antes de decidir gastos','finance','MOV OCT');
  const drg=drgAssessment(input.drg.values,today);
  if(!drg.current) add('mts-drg-missing','MTS','Media','Falta completar el DRG de hoy',`No hay una evaluación completa fechada ${today}. Último registro completo: ${drg.last?.date??'no disponible'}.`,'Completar los cinco componentes del DRG','mtsLog','drg');
  else if(drg.current.hardStop||/abort/i.test(drg.current.output)) add('mts-drg-recorded-stop','MTS','Alta','El DRG registra ABORT',`La evaluación completa de hoy registra ${drg.current.output||'Hard Stop'}.`,'Revisar la decisión ya registrada en MTS','mtsLog','drg');
  return {alerts:alerts.sort((a,b)=>(a.priority==='Alta'?0:1)-(b.priority==='Alta'?0:1)),budgetRows,finance:{budget:b,expense,income:net,gap:net!==null&&expense!==null?net-expense:null,lastMovement:latest,lagDays:age},clinical:{nextFree,nextBooked,reported,weekStart:nextWeek},drg,matches};
}
