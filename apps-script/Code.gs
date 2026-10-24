/**
 * RV Command Center — Apps Script (server-side)
 *
 * SECURITY: Deploy as Web app, Execute as: Me, Who has access: Only myself.
 * Never deploy as "Anyone" or "Anyone with Google account".
 *
 * In Apps Script > Project Settings > Script Properties, configure:
 * MATRIX_SHEET_ID, TRAINING_SHEET_ID, CLINICAL_SHEET_ID, FINANCE_SHEET_ID.
 *
 * Advanced Google Service: Google Sheets API (identifier: Sheets) must be enabled.
 * No private spreadsheet IDs or patient information are committed to GitHub.
 */
const RV_TZ = 'America/Santiago';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('RV Command Center — Privado')
    .addMetaTag('viewport', 'width=device-width,initial-scale=1');
}

/**
 * Publicly callable ONLY by the deploying Google account when
 * deployment access=MYSELF. Returns strictly aggregated information.
 * No patient names, diagnoses, notes, full spreadsheet rows, or event titles.
 */
function getDashboard() {
  const props = PropertiesService.getScriptProperties();
  const now = new Date();
  const out = {
    generatedAt: now.toISOString(),
    source: 'Google Apps Script — lectura privada',
    calendar: { state: 'unavailable', message: 'Sin lectura' },
    matrix: { state: 'unconfigured', message: 'No configurada' },
    training: { state: 'unconfigured', message: 'No configurada' },
    clinical: { state: 'unconfigured', message: 'No configurada' },
    finance: { state: 'unconfigured', message: 'No configurada' },
    nextAction: { title: 'Revisar el estado', reason: 'Sin prioridades verificadas', level: 'normal' },
    alerts: []
  };

  try { out.calendar = readCalendar_(now); }
  catch (e) { out.calendar = { state: 'error', message: 'Calendar no disponible' }; }

  const sources = [
    ['matrix', 'MATRIX_SHEET_ID', readMatrix_],
    ['training', 'TRAINING_SHEET_ID', readTraining_],
    ['clinical', 'CLINICAL_SHEET_ID', readClinical_],
    ['finance', 'FINANCE_SHEET_ID', readFinance_]
  ];
  for (const [name, key, reader] of sources) {
    const id = props.getProperty(key);
    if (!id || !/^[A-Za-z0-9_-]{15,}$/.test(id)) continue;
    try {
      out[name] = reader(id, now);
      out[name].url = 'https://docs.google.com/spreadsheets/d/' + id + '/edit';
    } catch (e) {
      // Do not return error messages; they might contain file IDs or private data.
      out[name] = { state: 'error', message: 'Error de lectura o permisos' };
    }
  }

  // Explicit priority precedence. Never treat unknown as a clean state.
  if (out.training.state === 'ok' && out.training.latestDrg &&
      out.training.drgIsToday && (out.training.latestDrg.hardStop || /ABORT/i.test(out.training.latestDrg.output))) {
    out.nextAction = { title: 'Priorizar recuperación', reason: 'Último DRG: ABORT o Hard Stop. No ejecutar cargas hasta reevaluar.', level: 'critical' };
    out.alerts.push('DRG: bloqueo de entrenamiento detectado');
  } else if (out.calendar.state === 'ok' && out.calendar.next &&
      out.calendar.next.minutesUntil <= 120 && out.calendar.next.minutesUntil >= 0) {
    out.nextAction = { title: 'Preparar próximo compromiso', reason: 'Hay un evento en Calendar en las próximas 2 horas.', level: 'high' };
  } else if (out.training.state === 'ok' && out.training.latestDrg && out.training.drgIsToday &&
      /CUT/i.test(out.training.latestDrg.output)) {
    out.nextAction = { title: 'Aplicar reducción de carga', reason: 'Último DRG con salida CUT; revisar el plan antes de entrenar.', level: 'medium' };
  } else if (out.matrix.state === 'ok' && out.matrix.boxingBlocks > 0 &&
      (!out.training.latestDrg || !out.training.drgIsToday)) {
    out.nextAction = { title: 'Verificar DRG antes de boxeo', reason: 'MTS muestra boxeo, pero no hay DRG verificado de hoy.', level: 'medium' };
  } else if (out.calendar.state === 'ok' && out.calendar.next) {
    out.nextAction = { title: 'Revisar siguiente compromiso', reason: 'Consulta el horario de tu próximo evento.', level: 'normal' };
  } else if (sources.some(([name]) => out[name].state !== 'ok')) {
    out.nextAction = { title: 'Completar fuentes de datos', reason: 'Una o más hojas aún no permiten un análisis verificable.', level: 'medium' };
  } else {
    out.nextAction = { title: 'Revisar planificación', reason: 'Fuentes accesibles; no se detectó una alerta prioritaria.', level: 'normal' };
  }
  return out;
}

function readCalendar_(now) {
  const until = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const cal = CalendarApp.getDefaultCalendar();
  const events = cal.getEvents(now, until)
    .filter(ev => ev.getEndTime() > now)
    .sort((a,b) => a.getStartTime() - b.getStartTime());
  const first = events.length ? events[0] : null;
  return {
    state: 'ok',
    upcoming48h: events.length,
    next: first ? {
      start: first.getStartTime().toISOString(),
      minutesUntil: Math.max(0, Math.round((first.getStartTime().getTime()-now.getTime())/60000))
    } : null,
    message: events.length + ' eventos en próximas 48 h (sin mostrar títulos)'
  };
}

function values_(id, a1) {
  const response = Sheets.Spreadsheets.Values.get(id, a1, {
    valueRenderOption: 'FORMATTED_VALUE',
    majorDimension: 'ROWS'
  });
  return response.values || [];
}

function readMatrix_(id, now) {
  const r = Sheets.Spreadsheets.get(id, { fields: 'sheets.properties(title),properties.title' });
  const names = (r.sheets || []).map(s => s.properties.title);
  const day = Number(Utilities.formatDate(now,RV_TZ,'u')); // Monday=1...Sunday=7
  const weekTab = Utilities.formatDate(monday_(now),RV_TZ,'dd/MM');
  if (!names.includes(weekTab)) {
    return {state:'partial',sheetsCount:names.length,message:'MTS accesible; no se encontró semana '+weekTab};
  }
  const rows = values_(id,"'"+weekTab+"'!A3:H28");
  let boxing=0, gym=0, clinical=0, academic=0, firefighter=0;
  for(const row of rows){
    const hour=String(row[0]||'').trim();
    if(!/^\\d{1,2}(?::\\d{1,2})?$/.test(hour))continue;
    const text=String(row[day]||'').toLowerCase();
    if(!text || /^(libre|free|descanso|sleep|sueño|—|-)$/.test(text.trim()))continue;
    if(/boxeo|boxing|sparring|saco|ppm/.test(text))boxing++;
    if(/gym|pierna|squat|deadlift|push|pull|cardio|z2/.test(text))gym++;
    if(/paciente|psicop|terapia|sesio|cl[ií]nica/.test(text))clinical++;
    if(/tesis|paper|doctorado|investigaci[oó]n|p3/.test(text))academic++;
    if(/bombero|guardia|emergencia/.test(text))firefighter++;
  }
  return {
    state:'ok',week:weekTab,boxingBlocks:boxing,gymBlocks:gym,clinicalBlocks:clinical,
    academicBlocks:academic,firefighterBlocks:firefighter,
    message:'Hoy · MTS '+weekTab+': '+boxing+' bloques boxeo · '+gym+' gym · '+clinical+' clínica · '+academic+' academia · '+firefighter+' bomberos (bloques horarios, no sesiones)'
  };
}

function readTraining_(id, now) {
  const drg = values_(id, "'drg'!A1:L800");
  const daily = values_(id, "'Daily log'!A1:F800");
  const drgRecords = [];
  for (const row of drg.slice(1)) {
    const date = parseDmy_(row[2]);
    if (!date || date > now) continue;
    const output = String(row[11] || '').trim().toUpperCase();
    if (!output) continue;
    drgRecords.push({
      date,
      label: String(row[2]),
      output: output.replace(/[^A-Z0-9 -]/g,'').slice(0,25),
      hardStop: /^(YES|SI|SÍ|TRUE|1)$/i.test(String(row[10]||'').trim())
    });
  }
  drgRecords.sort((a,b) => b.date-a.date);
  const latest = drgRecords[0];
  const cutoff = new Date(now.getTime()-7*24*60*60*1000);
  let completed7d = 0;
  for (const row of daily.slice(1)) {
    const match = String(row[1]||'').match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
    const date = match ? parseDmy_(match[1]) : null;
    if (date && date>=cutoff && date<=now && /\bdone\b|completad|realizad/i.test(String(row[3]||''))) completed7d++;
  }
  return {
    state: 'ok',
    latestDrg: latest ? {
      date: latest.label,
      output: latest.output,
      hardStop: latest.hardStop
    } : null,
    completed7d: completed7d,
    message: 'Registros completados 7 días: ' + completed7d +
      (latest ? ' · Último DRG: ' + latest.output : ' · DRG sin registro reciente'),
    // Critical: an old DRG is not proof of today's readiness.
    drgIsToday: Boolean(latest && Utilities.formatDate(latest.date,RV_TZ,'yyyy-MM-dd')===Utilities.formatDate(now,RV_TZ,'yyyy-MM-dd'))
  };
}

function readClinical_(id, now) {
  const info = Sheets.Spreadsheets.get(id, { fields:'sheets.properties(title)' });
  const names = new Set((info.sheets || []).map(s=>s.properties.title));
  const monday = monday_(now);
  // On Saturday/Sunday, show the next operational week rather than the week ending.
  const day=Number(Utilities.formatDate(now,RV_TZ,'u'));
  if (day >= 6) monday.setDate(monday.getDate()+7);
  const tab = Utilities.formatDate(monday,RV_TZ,'dd/MM');
  if (!names.has(tab)) return {state:'partial',message:'Agenda futura no detectada: '+tab};
  const rows = values_(id, "'" + tab + "'!B3:F15");
  const nonempty = rows.reduce((n,row)=>n+row.filter(x=>{
    const value=String(x||'').trim();
    return value.length>0 && !/^(libre|disponible|vac[ií]o|--|0)$/i.test(value);
  }).length,0);
  return {
    state:'ok', week:tab, // Never export raw cells from this sheet.
    annotatedBlocks:nonempty,
    message: nonempty+' bloques anotados en agenda '+tab+' (validar como sesiones; no identifica pacientes)'
  };
}

function readFinance_(id) {
  const info = Sheets.Spreadsheets.get(id, { fields:'sheets.properties(title)' });
  const count = (info.sheets||[]).length;
  return {
    state:'partial', sheetsCount:count,
    message:'Hoja accesible ('+count+' pestañas). Sin mapa de ingresos/gastos: no calcular balances ficticios.'
  };
}

function parseDmy_(input) {
  const m=String(input||'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(!m)return null;
  const d=Number(m[1]),mo=Number(m[2]),y=Number(m[3]);
  const date=new Date(y,mo-1,d,12);
  return date.getFullYear()===y && date.getMonth()===mo-1 && date.getDate()===d ? date : null;
}

function monday_(now) {
  const d=new Date(now.getTime());
  const day=Number(Utilities.formatDate(d,RV_TZ,'u')); // Apps Script SimpleDateFormat "u": 1=Mon..7=Sun
  d.setDate(d.getDate()-(day-1));
  return d;
}
