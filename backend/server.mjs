import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';
import { Issuer, generators } from 'openid-client';
import { google } from 'googleapis';

const required=['PUBLIC_ORIGIN','BACKEND_ORIGIN','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','AUTHORIZED_GOOGLE_SUB','SESSION_SECRET','REDIS_URL'];
for(const k of required)if(!process.env[k])throw Error('Missing required configuration: '+k);
const env=process.env;
const origin=new URL(env.PUBLIC_ORIGIN).origin;
const backendOrigin=new URL(env.BACKEND_ORIGIN).origin;
if(!origin.startsWith('https://')||!backendOrigin.startsWith('https://'))throw Error('HTTPS origins required');
const redis=createClient({url:env.REDIS_URL});redis.on('error',e=>console.error('Redis connection error',e.message));await redis.connect();
const issuer=await Issuer.discover('https://accounts.google.com');
const oauth=new issuer.Client({client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uris:[backendOrigin+'/auth/google/callback'],response_types:['code']});
const app=express();app.set('trust proxy',1);app.disable('x-powered-by');app.use(helmet());app.use(cors({origin,credentials:true}));app.use(express.json({limit:'8kb'}));
app.use(session({name:'rvcc.sid',secret:env.SESSION_SECRET,resave:false,saveUninitialized:false,store:new RedisStore({client:redis,prefix:'rvcc:'}),cookie:{httpOnly:true,secure:true,sameSite:'none',maxAge:60*60*1000}}));
app.use((req,res,next)=>{res.set('Cache-Control','no-store');next()});
function auth(req,res,next){if(req.session?.subject!==env.AUTHORIZED_GOOGLE_SUB)return res.status(401).json({error:'unauthorized'});next()}
app.get('/health',(_,res)=>res.json({status:'ok'}));
app.get('/auth/google/start',(req,res,next)=>{try{const state=generators.state(),nonce=generators.nonce();req.session.oauth={state,nonce};req.session.save(e=>e?next(e):res.redirect(oauth.authorizationUrl({scope:'openid email profile',state,nonce,response_type:'code'})))}catch(e){next(e)}});
app.get('/auth/google/callback',async(req,res,next)=>{try{const expected=req.session.oauth;if(!expected)return res.status(400).send('Missing OAuth state');const params=oauth.callbackParams(req);const tokens=await oauth.callback(backendOrigin+'/auth/google/callback',params,{state:expected.state,nonce:expected.nonce});delete req.session.oauth;const claims=tokens.claims();if(claims.sub!==env.AUTHORIZED_GOOGLE_SUB)return res.status(403).send('Account not authorized');req.session.regenerate(e=>{if(e)return next(e);req.session.subject=claims.sub;req.session.save(err=>err?next(err):res.redirect(origin))})}catch(e){next(e)}});
app.get('/api/me',(req,res)=>res.json({authorized:req.session?.subject===env.AUTHORIZED_GOOGLE_SUB}));
app.post('/auth/logout',(req,res)=>{if(req.get('origin')!==origin)return res.sendStatus(403);req.session.destroy(()=>{res.clearCookie('rvcc.sid',{secure:true,httpOnly:true,sameSite:'none'});res.json({ok:true})})});
app.get('/api/dashboard',auth,async(req,res,next)=>{try{
 const result={updatedAt:new Date().toISOString(),nextAction:{title:'Revisar agenda',detail:'Prioridad automática pendiente de reglas verificadas'},blocked:'Sin bloqueos verificados',calendar:{summary:'Integración no configurada'},mts:{summary:'Integración no configurada'},clinical:{summary:'Integración no configurada'},finance:{summary:'Integración no configurada'}};
 if(env.CALENDAR_ID){const client=await google.auth.getClient({scopes:['https://www.googleapis.com/auth/calendar.readonly']});const calendar=google.calendar({version:'v3',auth:client});const now=new Date();const end=new Date(now.getTime()+24*60*60*1000);const events=await calendar.events.list({calendarId:env.CALENDAR_ID,timeMin:now.toISOString(),timeMax:end.toISOString(),singleEvents:true,orderBy:'startTime',maxResults:25});const count=(events.data.items||[]).length;result.calendar.summary=count+' eventos en próximas 24 horas';result.nextAction={title:'Consultar próximos compromisos',detail:count+' eventos verificados en Calendar'};}
 res.json(result)
}catch(e){next(e)}});
app.use((err,req,res,next)=>{console.error('Request failed:',err.message);res.status(503).json({error:'service_unavailable'})});
app.listen(Number(env.PORT||8080),'0.0.0.0');
