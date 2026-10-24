import React from 'react';
import {DataComponent, EvidenceChart, Filters, MetricCard, Section, SortableItem, SortableRegion, useDataApp, useSectionFilters, useDashboardTabs} from '../../data-app-public.jsx';
import './rv-command.css';
const money=n=>n==null?'Sin dato':new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
const date=d=>new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Santiago'}).format(new Date(d+'T12:00:00Z'));
const rules=[['Disponibilidad incompatible','Una casilla Libre de PSICOPRO coincide con una actividad registrada en MTS.','Revisar el cupo antes de reservar.'],['Reservas sin reflejo en agenda','PSICOPRO tiene reservas para la semana siguiente y Calendar devuelve cero eventos en ese período.','Revisar la sincronización; no demuestra una cancelación.'],['Conteo de cupos','El número de casillas Libre difiere del contador de la misma semana.','Corregir o explicar la diferencia.'],['Presupuesto excedido','El gasto registrado supera el presupuesto del mismo mes.','Revisar categorías y actualizar movimientos.'],['Movimientos con desfase','El último movimiento registrado tiene más de siete días.','Actualizar cartola; el saldo no se considera actual.'],['DRG pendiente','Falta una evaluación de hoy con fecha y cinco componentes completos.','Completar el registro. Las celdas vacías no equivalen a cero.']];
export function DashboardContent(){
 const {snapshot,reviewedRows,visible}=useDataApp();
 const {activeTabId:active}=useDashboardTabs([{id:'attention',label:'Atención',filterIds:[]},{id:'systems',label:'Sistemas',filterIds:[]},{id:'rules',label:'Reglas',filterIds:[]}]);
 const scoped=useSectionFilters([{id:'domain',label:'Sistema',field:'domain',defaultValue:'all',queryIds:['attention']},{id:'priority',label:'Prioridad',field:'priority',defaultValue:'all',queryIds:['attention']}],{},{id:'rv-attention'});
 const scope=scoped.componentProps('attention',['id','domain','priority']);
 const alerts=scope.displayRows;
 const finance=reviewedRows('finance')[0]||{};
 const clinical=reviewedRows('clinical')[0]||{};
 const sources=reviewedRows('sources',['domain']);
 const budget=reviewedRows('budget',['category']);
 const rv=snapshot.rv||{},files=rv.files||{},asOf=rv.asOf||String(snapshot.generatedAt).slice(0,10);
 return <article className="rv-command">
  <div className="rv-review-line"><span className="rv-pulse" aria-hidden="true"/><span>Revisión del {date(asOf)}</span><span className="rv-review-mode">Instantánea de fuentes conectadas</span></div>
  {(!active||active==='attention')&&<>
   <Section id="rv-attention-heading" title="Qué requiere tu atención" spacing="none" filters={<Filters {...scoped.filterProps}/>}>
    <DataComponent id="rv-attention-queue" queryId="attention" title="Pendientes por revisar" kind="table" variant="plain" {...scope}>
     <div className="rv-queue" data-reviewed-rows>
      {!alerts.length&&<p className="rv-empty">No hay alertas con estos filtros.</p>}
      {alerts.map((a,i)=><section className="rv-alert" key={a.id}>
       <div className="rv-alert-index" aria-hidden="true">{String(i+1).padStart(2,'0')}</div>
       <div className="rv-alert-body"><div className="rv-alert-tags"><span className={'rv-priority '+(a.priority==='Alta'?'rv-high':'rv-medium')}>{a.priority}</span><span>{a.domain}</span></div><h3>{a.title}</h3><p>{a.evidence}</p>
        <details><summary>Ver acción y evidencia</summary><p className="rv-action-label">{a.action}</p><p className="rv-cell">Ubicación: {a.anchor||'ver fuente'}</p>{files[a.sourceId]&&<a className="rv-source-link" href={files[a.sourceId].url} target="_blank" rel="noreferrer">Abrir fuente ↗</a>}</details>
       </div>
      </section>)}
     </div>
    </DataComponent>
   </Section>
   <Section id="rv-context-heading" title="Contexto para decidir" spacing="section">
    <SortableRegion id="rv-context-canvas" variant="canvas" columns={12} spacing="standard" rows={[{id:'rv-context-metrics',kind:'metrics',items:['rv-recorded-income','rv-recorded-expenses','rv-next-bookings']},{id:'rv-budget-row',items:['rv-budget-comparison']}]} label="Contexto operativo">
     <SortableItem id="rv-recorded-income" label="Ingreso neto registrado" kind="metric" span={4}><MetricCard id="rv-recorded-income" queryId="finance" title="Ingreso neto registrado" value={money(finance.income)} displayRows={[finance]} sourceRows={[finance]} description={`CLP. Corte del registro: ${finance.lastMovement||"sin dato"}. Excluye rescates y descuenta devoluciones.`}/></SortableItem>
     <SortableItem id="rv-recorded-expenses" label="Gasto registrado" kind="metric" span={4}><MetricCard id="rv-recorded-expenses" queryId="finance" title="Gasto registrado" value={money(finance.expense)} displayRows={[finance]} sourceRows={[finance]} description={`CLP. Corte: ${finance.lastMovement||"sin dato"}. Presupuesto mensual: ${money(finance.budget)}.`}/></SortableItem>
     <SortableItem id="rv-next-bookings" label="Reservas próximas" kind="metric" span={4}><MetricCard id="rv-next-bookings" queryId="clinical" title={`Reservas · ${clinical.week||"próxima semana"}`} value={String(clinical.reserved??'—')} displayRows={[clinical]} sourceRows={[clinical]} description="Reservas registradas; no demuestra asistencia, facturación ni pago."/></SortableItem>
     <SortableItem id="rv-budget-comparison" label="Presupuesto por categoría" kind="chart" span={12}><EvidenceChart id="rv-budget-comparison" queryId="budget" title="Presupuesto y gasto registrado por categoría" variant="card" spec={{type:'horizontalBar',x:'category',y:'actual',fields:['budget','actual'],currency:'CLP',valueDecimals:0,stackable:false,legend:{labels:{budget:'Presupuesto',actual:'Gasto registrado'}},colors:{budget:'var(--chart-8)',actual:'var(--chart-1)'}}} rows={budget} sourceRows={budget} height={430} description={`CLP. Movimientos hasta ${finance.lastMovement||"fecha no disponible"}. Una categoría sin presupuesto definido conserva null.`}/></SortableItem>
    </SortableRegion>
   </Section>
  </>}
  {active==='systems'&&<>
   <Section id="rv-sources-heading" title="Fuentes y cobertura" spacing="none"><div className="rv-source-grid" data-reviewed-rows>{sources.map(s=>visible('rv-source-'+s.domain)&&<DataComponent key={s.domain} id={'rv-source-'+s.domain} queryId="sources" title={s.domain} kind="table" variant="card" displayRows={[s]} sourceRows={[s]}><div className="rv-system"><p className="rv-system-name">{s.source}</p><span className="rv-state">{s.state}</span><p>{s.coverage}</p>{files[s.sourceId]&&<a className="rv-source-link" href={files[s.sourceId].url} target="_blank" rel="noreferrer">Abrir planilla ↗</a>}</div></DataComponent>)}</div></Section>
   <Section id="rv-refresh-heading" title="Actualización" spacing="section"><div className="rv-refresh-note"><p>El panel muestra la última revisión guardada. Las alertas se recalculan al actualizar los datos mediante ChatGPT; no se consultan Google Drive ni Calendar desde tu navegador.</p><p>La revisión automática comprueba las fuentes originales y solo debe avisarte cuando un pendiente nuevo o un cambio relevante requiera tu atención. Un fallo de lectura se informa como cobertura incompleta.</p><p>La revisión no modifica reservas, entrenamiento ni movimientos.</p></div></Section>
  </>}
  {active==='rules'&&<Section id="rv-rules-heading" title="Cuándo aparece una alerta" spacing="none"><div className="rv-rules">{rules.map(([title,condition,action],i)=><section key={title}><span className="rv-rule-number">{String(i+1).padStart(2,'0')}</span><div><h3>{title}</h3><p>{condition}</p><p className="rv-rule-action">{action}</p></div></section>)}</div><p className="rv-method-note">Alta y Media son prioridades operativas de esta versión. Una alerta desaparece cuando una nueva lectura confirma que se resolvió.</p></Section>}
 </article>;
}
