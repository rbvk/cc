/**
 * RV CC V9 external intelligence: read-only sources, deterministic opportunities,
 * local public links, forecasts labelled as MODELLED, not observations.
 */
const RV9_CAMERAS=[
 {id:'ubiavis',name:'Humedal Río Lluta',source:'Ubiavis',url:'https://www.ubiavis.cl/',state:'not_verified',
  kind:'Transmisión anunciada',note:'Solo enlace al proveedor; streaming en vivo no comprobado'},
 {id:'dgac',name:'Chacalluta Norte y Suroeste',source:'DGAC',url:'https://aipchile.dgac.gob.cl/camara_ubicacion/show/designador/SCAR',
  state:'dated_photos',kind:'Fotografías periódicas',note:'Revisar hora de la última captura; no es video continuo'},
 {id:'skyline',name:'Costa rocosa de Arica',source:'SkylineWebcams',
  url:'https://www.skylinewebcams.com/es/webcam/chile/arica-and-parinacota-region/arica/arica.html',
  state:'offline',kind:'Webcam',note:'Fuera de línea en la última revisión'}
];
const RV9_LOCAL_SOURCES=[
 {name:'Alertas SENAPRED',url:'https://senapred.cl/alertas/',kind:'Oficial · consultar'},
 {name:'Sismos CSN',url:'https://www.csn.uchile.cl/',kind:'Oficial · consultar'},
 {name:'DMC · Chacalluta',url:'https://climatologia.meteochile.gob.cl/application/diariob/visorDeDatosEma/180005',kind:'Estación oficial'},
 {name:'Calidad del aire SINCA',url:'https://sinca.mma.gob.cl/index.php/estacion/index/key/F01',kind:'Estación oficial'},
 {name:'Meteo Armada',url:'https://meteoarmada.directemar.cl/',kind:'Avisos marítimos'},
 {name:'Municipalidad Arica',url:'https://muniarica.cl/',kind:'Información local'}
];

// No automatic meteorological, air-quality or marine network requests in V9.
// Arica keeps curated public links; the user decides whether to open them.

function rv9Number_(v){
 const text=String(v===null||v===undefined?'':v).trim().replace(',','.');
 if(!/^\d+(?:\.\d+)?$/.test(text))return null;
 const n=Number(text);return Number.isFinite(n)?n:null;
}
function rv9Extra_(p,now){
 const output={performance:{state:'unavailable',skills:[],kpis:[],bodyfat:[]},
  business:{state:'unavailable',sixMonths:[],merch:[]},
  service:{state:'unavailable',gross:null,commission:null}};
 const mid=String(p.getProperty('MATRIX_SHEET_ID')||'');
 if(/^[A-Za-z0-9_-]{15,}$/.test(mid)){
  try{
   const metadata=sheetMetadata_(mid);
   const roadTab='Boxing roadmap',road=values_(mid,"'Boxing roadmap'!A2:D30");
   output.performance.skills=road.map((r,i)=>({
    skill:rv9Short_(r[0],40),domain:rv9Short_(r[1],40),
    baseline:rv9Number_(r[2]),goal:rv9Number_(r[3]),
    sourceUrl:cellUrl_(mid,roadTab,'C'+(i+2),metadata)
   })).filter(r=>r.skill&&r.skill.toLowerCase()!=='skill'&&r.baseline!==null&&r.goal!==null)
    .slice(0,20);
   output.performance.roadmapUrl=tabUrl_(mid,roadTab,metadata);
   output.performance.roadmapReference='Nivel registrado en Septiembre · meta Octubre. La fecha de medición real no aparece en este resumen.';
   const raw=values_(mid,"'MONTH KPI'!A2:F40");
   output.performance.kpis=raw.map((r,i)=>{
    const area=rv9Short_(r[0],45),name=rv9Short_(r[1],70);
    const current=rv9Short_(r[2],80),goal=rv9Short_(r[3],80);
    const rawCur=current.match(/(?:^|\s)(\d+(?:[.,]\d+)?)(?:\s*kg\b)/i);
    const rawGoal=goal.match(/^(\d+(?:[.,]\d+)?)\s*(?:kg\b|[-–]|\s*milestone\b|$)/i);
    const value=rawCur?Number(rawCur[1].replace(',','.')):null;
    const target=rawGoal?Number(rawGoal[1].replace(',','.')):null;
    // Progress bars only for numeric strength goals where higher is better.
    const comparable=/^Strength$/i.test(area)&&Number.isFinite(value)&&Number.isFinite(target)&&target>0;
    return {area,name,current,goal,status:rv9Short_(r[5],45),
      currentNumber:comparable?value:null,targetNumber:comparable?target:null,
      progressPct:comparable?Math.min(100,Math.round(value/target*100)):null,
      sourceUrl:cellUrl_(mid,'MONTH KPI','C'+(i+2),metadata)};
   }).filter(r=>r.name&&r.name.toLowerCase()!=='kpi'&&r.area).slice(0,30);
   output.performance.kpiUrl=tabUrl_(mid,'MONTH KPI',metadata);
   const bf=values_(mid,"'Bodyfat'!A2:G30");
   output.performance.bodyfat=bf.map(r=>({date:rv9Short_(r[0],25),
    percent:Number(String(r[6]||'').replace(',','.'))}))
    .filter(x=>x.date&&x.percent>=4&&x.percent<=40).slice(-12);
   output.performance.state='ok';
   output.performance.note='Objetivos declarados de Matrix; contrastar con fecha de medición, dolor y fase de entrenamiento antes de realizar progresiones.';
  }catch(e){output.performance.state='partial';}
 }
 const fid=String(p.getProperty('FINANCE_SHEET_ID')||'');
 if(/^[A-Za-z0-9_-]{15,}$/.test(fid)){
  try{
   const plan=values_(fid,"'📆 Plan 6 meses'!A4:H18");
   output.business.sixMonths=plan.filter(r=>/^[A-Za-z]{3}-\d{2}$/.test(String(r[0]||'')))
    .map(r=>({month:String(r[0]),patientsGoal:money_(r[1]),
      clinicGoal:money_(r[2]),clinicActual:money_(r[3]),
      expenseGoal:money_(r[5]),expenseActual:money_(r[6])})).slice(0,8);
   const rows=values_(fid,"'🥊 BOXINGCI Merch'!A2:K10");
   output.business.merch=rows.filter(r=>r[0]&&!/^TOTAL/i.test(String(r[0]))&&money_(r[2])!==null)
    .map(r=>{
     const cost=money_(r[1])||0,price=money_(r[2])||0,bought=money_(r[3])||0,sold=money_(r[4])||0;
     return {name:rv9Short_(r[0],65),cost,price,bought,sold,
      inStock:Math.max(0,bought-sold),marginUnit:price-cost,
      marginPct:price?Math.round((price-cost)*100/price):null,
      inventoryAtCost:Math.max(0,bought-sold)*cost};
    }).slice(0,9);
   output.business.state='ok';
  }catch(e){output.business.state='partial';}
 }
 const cid=String(p.getProperty('CLINICAL_SHEET_ID')||'');
 if(/^[A-Za-z0-9_-]{15,}$/.test(cid)){
  try{
   const rows=values_(cid,"'Servicios'!A1:A10");
   const str=rows.map(r=>String(r[0]||'')).find(s=>/sesi[oó]n individual/i.test(s))||'';
   const match=str.match(/\$\s*(\d{1,3}(?:[.,]\d{3})*)/);
   const gross=match?money_(match[1]):null;
   const pct=Number(p.getProperty('CLINIC_COMMISSION_PCT')||40);
   output.service={state:gross!==null?'ok':'partial',gross,
    commission:Number.isFinite(pct)&&pct>=0&&pct<=100?pct:null,
    note:'Tarifa de Servicios y comisión asumida de 40% salvo configuración explícita'};
  }catch(e){output.service.state='partial';}
 }
 return output;
}
function rv9Projects_(p){
 const raw=String(p.getProperty('RV9_GITHUB_REPOS')||'rbvk/cc,rbvk/boxingCI');
 const repos=raw.split(',').map(x=>x.trim()).filter(s=>/^rbvk\/[\w.-]+$/i.test(s)).slice(0,6);
 return {state:'links',repos:repos.map(name=>({name,url:'https://github.com/'+name})),
  note:'Repositorios enlazados; no afirmar que un commit equivale a una tarea terminada'};
}
function rv9FirstAttentions_(p,now){
 const id=String(p.getProperty('CLINICAL_SHEET_ID')||'');
 if(!/^[A-Za-z0-9_-]{15,}$/.test(id))
  return {state:'unavailable',currentWeek:null};
 try{
  const week=startMonday_(now),metadata=sheetMetadata_(id),tab=matchTab_(metadata.map(x=>x.title),weekKey_(week));
  if(!tab)return {state:'unavailable',currentWeek:null,message:'Sin pestaña semanal'};
  const rows=values_(id,"'"+tab.replace(/'/g,"''")+"'!A3:F15");
  let total=0;
  for(const row of rows){
   const time=hour_(row[0]);if(time===null)continue;
   for(let weekday=0;weekday<5;weekday++){
    const text=String(row[weekday+1]||'');
    if(!/(?:🆕|primera\s+(?:sesi[oó]n|atenci[oó]n))/i.test(text))continue;
    const at=plusDays_(week,weekday);at.setHours(Math.floor(time/60),time%60,0,0);
    if(at.getTime()+3600000<=now.getTime())total++;
   }
  }
  if(total===0)return {state:'unverified',currentWeek:null,
   message:'No hay marca validada de primeras atenciones. No interpretar cero marcas como cero pacientes nuevos.'};
  return {state:'partial',currentWeek:total,method:'Marcador explícito 🆕/primera sesión en PSICOPRO',
   note:'Requiere uso consistente para comparar períodos'};
 }catch(e){return {state:'unavailable',currentWeek:null};}
}
function rv9Opportunities_(base,extra,inbox,availability){
 const array=[],add=(id,area,priority,title,evidence,action,impact,risk,scenario)=>
  array.push({id,area,priority,title,evidence,action,impact,risk,scenario,requiresApproval:true});
 const drg=base.training?.drgToday;
 if(drg&&(drg.hardStop||/\bABORT\b/i.test(String(drg.output||''))))
  add('recover','Recuperación',100,'Proteger recuperación y seguridad',
   'DRG actual '+drg.output+' · hard stop o ABORT',
   'Aplicar el protocolo de recuperación, sin sesión de contacto','Evitar carga incompatible','No sustituye evaluación de salud','recovery');
 if(base.clinical?.state==='ok'&&Number.isFinite(base.clinical.gap)&&base.clinical.gap<0)
  add('capacity','Clínica',75,'Evaluar '+Math.abs(base.clinical.gap)+' cupos recurrentes',
   base.clinical.weekly+' pacientes frente a meta '+base.clinical.target,
   'Verificar demanda y espacios recurrentes antes de ofrecer horarios','Capacidad e ingreso potencial',
   'No todos los huecos son cupos regulares','clinical');
 if(base.finance?.state==='ok'&&base.finance.over>0)
  add('finance','Finanzas',79,'Examinar desviación financiera',
   'Exceso '+clp_(base.finance.over)+' CLP respecto del presupuesto',
   'Revisar las partidas que excedieron objetivos','Oportunidad de ahorro',
   'Gastos ya pagados no pueden revertirse','budget');
 const w=availability.windows?.[0];
 if(w&&inbox.open)
  add('finish','Proyectos',70,'Terminar un pendiente hoy',
   inbox.open+' pendientes abiertos y una ventana potencial de '+w.minutes+' minutos',
   'Revisar una tarea que encaje y confirmar disponibilidad','Entregable terminado',
   'La estimación de tiempo podría fallar','focus');
 const merch=extra.business?.merch||[],stock=merch.reduce((a,x)=>a+x.inventoryAtCost,0);
 if(stock>0)
  add('stock','BOXINGCI',54,'Evaluar capital inmovilizado en productos',
   clp_(stock)+' CLP de inventario estimado al costo',
   'Verificar stock real y demanda antes de reponer','Mejorar rotación',
   'El inventario depende del registro manual','stock');
 const skills=extra.performance?.skills||[];
 const gap=skills.find(x=>x.goal!==null&&x.baseline!==null&&x.goal>x.baseline);
 if(gap)
  add('boxing','Boxeo',45,'Verificar progreso técnico: '+gap.skill,
   'Objetivo '+gap.goal+' frente a nivel registrado '+gap.baseline,
   'Contrastar el nivel con feedback del entrenador','Desarrollo técnico',
   'La información podría estar desactualizada','boxing');
 if(base.training?.adherence?.boxing?.unverified>0)
  add('mts','Entrenamiento',47,'Validar sesiones MTS sin estado',
   base.training.adherence.boxing.unverified+' exposiciones de boxeo sin estado confirmado',
   'Revisar Daily log antes de atribuir incumplimientos','Datos fiables',
   'Sin estado no equivale a sesión omitida','training');
 if(!array.length)
  add('review','Sistema',15,'Sin oportunidad suficientemente comprobada',
   'Los datos no sustentan una decisión prioritaria adicional',
   'Revisar fuentes o capturar una tarea real','Claridad',
   'No generar oportunidades ficticias','review');
 return {state:'ok',items:array.sort((a,b)=>b.priority-a.priority),
  note:'Oportunidades heurísticas y revisables; no predicciones de éxito'};
}
function simulateV9Scenario(type,amount){
 const n=Math.max(1,Math.min(5,Math.floor(Number(amount)||1)));
 if(!['clinical','focus','budget','stock','recovery','boxing','training','review'].includes(type))
  return {state:'invalid'};
 const now=new Date(),base=rv9BaseDashboard_(),p=rv9Props_(),x=rv9Extra_(p,now);
 const result={state:'ok',type,quantity:n,requiresApproval:true,
  results:[],assumptions:[],warnings:[],applied:false};
 if(type==='clinical'){
  const people=base.clinical?.weekly;
  if(!Number.isFinite(people))return {state:'unavailable',message:'Meta clínica no verificada'};
  result.results.push({label:'Pacientes actuales',value:people},
   {label:'Escenario con nuevos cupos',value:people+n});
  const gross=x.service.gross,commission=x.service.commission;
  if(gross!==null&&commission!==null)
   result.results.push({label:'Ingreso neto potencial 4 semanas (CLP)',
    value:Math.round(gross*(1-commission/100)*n*4)});
  else result.warnings.push('Tarifa y comisión insuficientes para calcular ingreso');
  result.assumptions.push('Los nuevos cupos son recurrentes, demandados y las sesiones se realizan');
  result.warnings.push('No se crearon reservas ni se verificó demanda');
 }else if(type==='focus'){
  const avail=rv9Available_(p,now),win=avail.windows?.[0];
  if(!win)return {state:'unavailable',message:'No hay ventana verificable'};
  result.results.push({label:'Ventana potencial (minutos)',value:win.minutes},
   {label:'Trabajo profundo simulado (minutos)',value:Math.min(win.minutes,n*45)});
  result.warnings.push('Confirmar otros compromisos antes de comenzar');
 }else if(type==='budget'){
  if(base.finance?.state!=='ok')return {state:'unavailable',message:'Presupuesto no conciliado'};
  const spent=base.finance.spent,saved=Math.round(spent*n*.025);
  result.results.push({label:'Gasto registrado (CLP)',value:spent},
   {label:'Reducción hipotética (CLP)',value:saved},
   {label:'Gasto simulado (CLP)',value:spent-saved});
  result.assumptions.push('Reducción hipotética del '+(n*2.5)+'% del gasto acumulado');
  result.warnings.push('No implica que sea posible recuperar gastos ya efectuados');
 }else{
  result.results.push({label:'Tipo de decisión',value:type});
  result.warnings.push('Faltan datos para proyección cuantitativa; comparación cualitativa');
 }
 return result;
}
