/**
 * RV Command Center V9 · Arica data accessed ON DEMAND only.
 * Called once when user opens Arica. One 15-minute server cache for all
 * sources and no timers, triggers or periodic HTTP requests.
 *
 * DATA CONVENTION
 * - model: weather, air and waves are estimates, not official station readings.
 * - official: event publication/earthquake requires original record timestamp.
 * - indexed: SENAPRED search index isn't an active-alert certification.
 * - unavailable: no evidence is shown; never imply "no alerts".
 */
const RV9_LOCAL_CACHE_KEY='RV9_ARICA_OPTIONAL_20261025';
function rv9LocalSanitize_(html){
 return String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))
  .replace(/&nbsp;|&amp;|&quot;|&apos;|&lt;|&gt;/g,x=>
   ({'&nbsp;':' ','&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'})[x]||' ')
  .replace(/\s+/g,' ').trim();
}
function rv9LocalFreshness_(time,now){
 if(!time||!/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(time))return {fresh:false,minutes:null};
 const local=Utilities.formatDate(now,RV_TZ,"yyyy-MM-dd'T'HH:mm");
 const a=Date.parse(time.slice(0,16)+':00Z'),b=Date.parse(local+':00Z');
 const minutes=Math.round((b-a)/60000);
 return {fresh:Number.isFinite(minutes)&&minutes>=-10&&minutes<=120,
  minutes:Number.isFinite(minutes)?minutes:null};
}
function rv9LocalNumber_(x){
 return typeof x==='number'&&Number.isFinite(x)?x:null;
}
function rv9LocalSismos_(html,now){
 const hits=[],rows=String(html||'').match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[];
 for(const tr of rows){
  const cells=[...tr.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>rv9LocalSanitize_(m[1]));
  if(cells.length<3)continue;
  const line=cells[0],date=line.match(/\b(20\d\d-\d\d-\d\d)\s+(\d\d:\d\d:\d\d)\b/);
  if(!date)continue;
  const location=line.replace(date[0],'').trim().slice(0,110),
   depth=Number((cells[1]||'').match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.')),
   magnitude=Number((cells[2]||'').match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.'));
  if(!location||!Number.isFinite(magnitude)||magnitude<0||magnitude>10)continue;
  const localDate=Utilities.formatDate(now,RV_TZ,'yyyy-MM-dd');
  const recent=(Date.parse(localDate+'T00:00:00Z')-Date.parse(date[1]+'T00:00:00Z'))/86400000<=3;
  if(!recent||date[1]>localDate)continue;
  const regional=/\b(?:arica|putre|parinacota|camarones|codpa|lluta|visviri|socoroma|chacalluta|cuya|belen|bel[eé]n)\b/i.test(location);
  const nearNorth=/\b(?:iquique|pisagua|camina|camiña|colchane)\b/i.test(location);
  hits.push({dateLocal:date[1]+' '+date[2],location,
   depthKm:Number.isFinite(depth)?depth:null,magnitude,
   regional,nearNorth,sourceUrl:'https://www.sismologia.cl/'});
 }
 hits.sort((a,b)=>b.dateLocal.localeCompare(a.dateLocal));
 return {state:hits.length?'ok':'unavailable',provider:'Centro Sismológico Nacional (CSN)',
  events:hits.filter(x=>x.regional).slice(0,8),
  nearby:hits.filter(x=>!x.regional&&x.nearNorth).slice(0,5),
  latestChile:hits.slice(0,3),
  sourceUrl:'https://www.sismologia.cl/',
  eventDate:hits[0]?.dateLocal||null,
  note:hits.length?'Listado público del CSN: últimos eventos procesados, no alerta temprana de sismos.':
   'No se pudo extraer el listado oficial de manera fiable; no inferir ausencia de sismos.'};
}
function rv9LocalSenapred_(xml,now){
 const items=String(xml||'').match(/<item\b[^>]*>[\s\S]*?<\/item>/gi)||[];
 const news=[];
 for(const item of items){
  const get=tag=>{
   const m=item.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i'));
   return m?rv9LocalSanitize_(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')):'';
  };
  const title=get('title').replace(/\s+-\s+SENAPRED.*$/i,'').slice(0,200);
  const rawLink=get('link'),pubDate=get('pubDate');
  const date=new Date(pubDate);
  if(!title||!/(?:Arica|Parinacota|Camarones|Putre|Lluta|Codpa)/i.test(title)||
      !Number.isFinite(date.getTime()))continue;
  const days=(now.getTime()-date.getTime())/86400000;
  if(days<-.1||days>20)continue;
  const link=/^https:\/\/news\.google\.com\//.test(rawLink)?rawLink:null;
  if(!link)continue;
  news.push({title,publishedAt:date.toISOString(),sourceUrl:link,
   source:'Índice Google News, artículos SENAPRED',verification:'publicación indexada, vigencia NO verificada'});
 }
 news.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
 return {state:news.length?'indexed':'unverified',items:news.slice(0,6),
  officialUrl:'https://www.senapred.cl/alertas/',
  checkedAt:now.toISOString(),
  note:news.length?'Comunicados indexados de SENAPRED con fecha. No equivalen a alertas vigentes; comprobar actualizaciones y cancelaciones.':
    'Sin publicaciones regionales verificables en el índice. NO implica ausencia de alertas.'};
}
/** Dated maritime bulletins, not a statement of present operational validity. */
function rv9LocalArmada_(rss,now){
 const items=String(rss||'').match(/<item\b[^>]*>[\s\S]*?<\/item>/gi)||[];
 const news=[];
 for(const item of items){
  const title=rv9LocalSanitize_((item.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'')
   .replace(/\s+-\s+Armada de Chile.*$/i,'').slice(0,190);
  const raw=(item.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)||[])[1]||'';
  const published=(item.match(/<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i)||[])[1]||'';
  const when=new Date(rv9LocalSanitize_(published)),age=(now.getTime()-when.getTime())/86400000;
  if(!title||!/(?:marejadas|temporal|avisos? meteorol[oó]gic)/i.test(title)||
     !/(?:Arica|norte|Golfo de Penas|Coquimbo)/i.test(title)||
     !/^https:\/\/news\.google\.com\//.test(raw.trim())||
     !Number.isFinite(when.getTime())||age<-.1||age>60)continue;
  news.push({title,publishedAt:when.toISOString(),sourceUrl:raw.trim(),
   verification:'Noticia indexada, vigencia no confirmada'});
 }
 news.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
 return {state:news.length?'indexed':'unverified',items:news.slice(0,5),
  sourceUrl:'https://www.armada.cl/avisosmeteorologicos',
  checkedAt:now.toISOString(),note:news.length?
    'Últimos avisos marítimos indexados publicados. Verificar su fecha de término en la comunicación oficial; no representan alertas necesariamente vigentes.':
    'No se encontraron avisos marítimos fechados y verificables en este índice; no equivale a ausencia de marejadas.'};
}

function getV9LocalData(){
 const now=new Date(),cache=CacheService.getScriptCache();
 const cached=cache.get(RV9_LOCAL_CACHE_KEY);
 if(cached){
  try{const result=JSON.parse(cached);return Object.assign({},result,{cache:'server-15-min',servedAt:now.toISOString()});}
  catch(e){}
 }
 const urls=[
  'https://api.open-meteo.com/v1/forecast?latitude=-18.49&longitude=-70.30&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,uv_index&timezone=America%2FSantiago',
  'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=-18.49&longitude=-70.30&current=pm2_5,us_aqi&timezone=America%2FSantiago',
  'https://marine-api.open-meteo.com/v1/marine?latitude=-18.47&longitude=-70.33&current=wave_height,wave_period,sea_surface_temperature&cell_selection=sea&timezone=America%2FSantiago',
  'https://www.sismologia.cl/',
  'https://news.google.com/rss/search?q=site%3Asenapred.cl%2Falerta%2F+%28Arica+OR+Parinacota+OR+Camarones+OR+Putre%29+when%3A14d&hl=es-419&gl=CL&ceid=CL%3Aes-419',
  'https://news.google.com/rss/search?q=site%3Aarmada.cl+%28Arica+OR+marejadas%29+when%3A60d&hl=es-419&gl=CL&ceid=CL%3Aes-419'
 ];
 const fetched=urls.map(()=>null);
 try{
  // UrlFetchApp.fetchAll can fetch a fixed, bounded set in parallel, only
  // after intentional navigation to Arica (never from getV9Dashboard).
  const responses=UrlFetchApp.fetchAll(urls.map(url=>({url,
   muteHttpExceptions:true,followRedirects:true,headers:{'User-Agent':'RVCC-v9 personal dashboard'}})));
  responses.forEach((res,i)=>{
   if(res.getResponseCode()===200){
    const raw=res.getContentText();
    if(raw.length<350000)fetched[i]=raw;
   }
  });
 }catch(e){}
 const parse=i=>{try{return JSON.parse(fetched[i]||'null');}catch(e){return null}};
 const w=parse(0),air=parse(1),marine=parse(2);
 const wx=w?.current||{},aq=air?.current||{},sea=marine?.current||{};
 const result={state:'partial',queriedAt:now.toISOString(),servedAt:now.toISOString(),
  region:'Arica y Parinacota',location:'Arica · Chinchorro',
  weather:{state:'unavailable'},air:{state:'unavailable'},marine:{state:'unavailable'},
  senapred:rv9LocalSenapred_(fetched[4],now),
  seismic:rv9LocalSismos_(fetched[3],now),
  maritimeBulletins:rv9LocalArmada_(fetched[5],now),
  marineNotice:{state:'unverified',officialUrl:'https://meteoarmada.directemar.cl/',
   note:'No existe un feed de avisos marítimos oficiales validado para lectura automática. El modelo de olas NO equivale a una alerta de marejadas.'},
  providerNotice:'Open-Meteo: modelos de pronóstico, no mediciones de estación. Uso sujeto a licencia y atribución. Se consulta solo al entrar a Arica; cache 15 min.'};
 if(w?.current){
  const age=rv9LocalFreshness_(wx.time,now);
  result.weather={state:age.fresh?'model':'stale',source:'Open-Meteo',
   measuredAt:wx.time,ageMinutes:age.minutes,
   temperature:rv9LocalNumber_(wx.temperature_2m),
   feelsLike:rv9LocalNumber_(wx.apparent_temperature),
   wind:rv9LocalNumber_(wx.wind_speed_10m),
   gusts:rv9LocalNumber_(wx.wind_gusts_10m),
   humidity:rv9LocalNumber_(wx.relative_humidity_2m),
   uv:rv9LocalNumber_(wx.uv_index),url:'https://open-meteo.com/en/docs'};
 }
 if(air?.current){
  const age=rv9LocalFreshness_(aq.time,now);
  result.air={state:age.fresh?'model':'stale',source:'Open-Meteo Air Quality',
   measuredAt:aq.time,ageMinutes:age.minutes,pm25:rv9LocalNumber_(aq.pm2_5),
   usAqi:rv9LocalNumber_(aq.us_aqi),url:'https://open-meteo.com/en/docs/air-quality-api'};
 }
 if(marine?.current){
  const age=rv9LocalFreshness_(sea.time,now);
  result.marine={state:age.fresh?'model':'stale',source:'Open-Meteo Marine',
   measuredAt:sea.time,ageMinutes:age.minutes,
   waveHeight:rv9LocalNumber_(sea.wave_height),
   wavePeriod:rv9LocalNumber_(sea.wave_period),
   seaTemperature:rv9LocalNumber_(sea.sea_surface_temperature),
   url:'https://open-meteo.com/en/docs/marine-weather-api'};
 }
 if([result.weather,result.air,result.marine].some(x=>x.state==='model')||
     result.seismic.state==='ok'||result.senapred.state==='indexed')result.state='ok';
 try{cache.put(RV9_LOCAL_CACHE_KEY,JSON.stringify(result),900);}catch(e){}
 return result;
}
