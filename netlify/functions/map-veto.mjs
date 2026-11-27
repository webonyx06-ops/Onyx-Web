import {createHash} from "node:crypto";
import {initAdmin,admin} from "../lib/admin.mjs";
import {whoIs,readBody,json} from "../lib/auth.mjs";
import {patchSnapshot} from "../lib/publish.mjs";
const turns=[["a","ban"],["b","ban"],["a","pick"],["b","side"],["b","pick"],["a","side"],["a","ban"],["b","ban"],["a","side"]];
function fail(status,message){throw Object.assign(new Error(message),{status});}
export function advance(state,team,value,revision){
 const turn=turns[state.history.length];
 if(!turn||revision!==state.history.length)fail(409,"El turno cambió. Actualizá el veto.");
 if(team!==state[turn[0]])fail(403,"Es el turno del rival.");
 const type=turn[1];
 if(type==="side"){
  if(!["Ataque","Defensa"].includes(value))fail(400,"Elegí el lado inicial.");
  state.sides.push({team,value});
 }else{
  if(!state.remaining.includes(value))fail(409,"Ese mapa no está disponible.");
  state.remaining=state.remaining.filter(n=>n!==value);
  if(type==="pick")state.picks.push(value);
 }
 state.history.push({team,type,value,at:Date.now()});
 if(state.history.length===8)state.picks.push(state.remaining[0]);
 return state;
}
export default async function(req){
 try{
  if(req.method!=="POST")return json(405,{error:"Usá POST."});
  const svc=initAdmin(), user=await whoIs(req,svc),db=svc.firestore();
  if(!user)fail(403,"Ingresá como capitán.");
  const b=await readBody(req,4000);
  if(!/^[\w-]{1,80}$/.test(b.mid||""))fail(400,"Partido inválido.");
  const result=await db.runTransaction(async tx=>{
   const match=(await tx.get(db.doc("matches/"+b.mid))).data();
   if(!match)fail(404,"No se encontró el partido.");
   if(b.action!=="read" && !user.staff&&![match.a,match.b].includes(user.team))fail(403,"Este cruce pertenece a otros equipos.");
   const round=await tx.get(db.collection("matches").where("fecha","==",match.fecha));
   const legs=round.docs.filter(d=>d.data().leg!=="desempate"&&[match.a,match.b].includes(d.data().a)&&[match.a,match.b].includes(d.data().b)).sort((x,y)=>Number(y.data().leg==="ida")-Number(x.data().leg==="ida")||x.id.localeCompare(y.id));
   if(legs.length!==2)fail(409,"Programá la ida y la vuelta antes del veto.");
   const key=createHash("sha256").update(JSON.stringify(legs.map(d=>d.id).sort())).digest("hex");
   const ref=db.doc("mapvetos/"+key),saved=(await tx.get(ref)).data();
   let s=saved;
   if(!s){
    const cfg=(await tx.get(db.doc("league/config"))).data();
    const pool=[...new Set((cfg?.maps||[]).filter(x=>x.on!==false).map(x=>x.n).filter(Boolean))];
    if(pool.length!==7)fail(409,"El Staff debe activar exactamente siete mapas en la configuración de la liga.");
    s={a:legs[0].data().a,b:legs[0].data().b,pool,remaining:pool,picks:[],sides:[],history:[]};
   }
   const now=Date.now();
   const adminControl=!!user.staff && (user.ultra||user.role==="admin");
   const limits=s.limits||{ban:90,pick:90,side:60};
   const kind=turns[s.history.length]?.[1];
   const timedOut=!!(kind && s.deadline && s.deadline<=now);
   if(b.action==="start"){
    if(!user.captain||![s.a,s.b].includes(user.team))fail(403,"Solo un capitán del cruce puede iniciar.");
    if(legs.some(d=>d.data().status==="played"||d.data().map))fail(409,"El cruce ya tiene resultados o mapas.");
    if(!s.deadline && !s.paused && kind){s.deadline=now+limits[kind]*1000;tx.set(ref,s);}
   }else if(["pause","resume","extend","clock"].includes(b.action)){
    if(!adminControl)fail(403,"Solo administración puede modificar el reloj.");
    if(!kind||!saved)fail(409,"Primero iniciá un veto pendiente.");
    if(b.revision!==s.history.length)fail(409,"El turno cambió.");
    if(b.action==="clock"){
     for(const k of ["ban","pick","side"])if(!Number.isInteger(b.value?.[k])||b.value[k]<10||b.value[k]>900)fail(400,"Usá entre 10 y 900 segundos.");
     s.limits={ban:b.value.ban,pick:b.value.pick,side:b.value.side};
    }else if(b.action==="pause"){s.paused=true;}
    else {s.paused=false;s.deadline=(b.action==="extend"?Math.max(now,s.deadline||0):now)+(b.action==="extend"?60:limits[kind])*1000;}
    tx.set(ref,s);tx.set(db.collection("vetoaudit").doc(),{at:now,user:user.uid,action:b.action,series:key,turn:s.history.length});
   }else if(b.action==="move"){
    if(!user.captain)fail(403,"Solo los capitanes pueden elegir.");
    if(legs.some(d=>d.data().status==="played" || (!saved && d.data().map)))fail(409,"Este cruce ya tiene mapas asignados o jugados.");
    if(timedOut||s.paused)fail(409,"Turno pausado. Administración puede reanudarlo.");
    advance(s,user.team,b.value,b.revision);
    s.history.at(-1).uid=user.uid;
    s.deadline=turns[s.history.length]?now+limits[turns[s.history.length][1]]*1000:null;
    tx.set(ref,s);
    if(s.history.length===9){
     legs.forEach((d,i)=>tx.update(d.ref,{map:s.picks[i],initialSide:s.sides[i],deciderMap:s.picks[2],deciderSide:s.sides[2]}));
     tx.set(db.doc("pubqueue/main"),{paths:admin.firestore.FieldValue.arrayUnion(...legs.map(d=>d.ref.path)),at:Date.now()},{merge:true});
    }
   }else if(b.action!=="read")fail(400,"Acción desconocida.");
   const next=turns[s.history.length];
   return {...s,history:s.history.map(({uid,...entry})=>entry),adminControl,serverNow:now,paused:!!(s.paused||kind && s.deadline && s.deadline<=now),turn:next?{team:s[next[0]],type:next[1]}:null,paths:legs.map(d=>d.ref.path)};
  });
  if(b.action==="move"&&!result.turn)await patchSnapshot(db,result.paths).catch(()=>{});
  return json(200,result);
 }catch(e){return json(e.status||503,{error:e.status?e.message:"No se pudo consultar el veto."});}
}
export const config={path:"/api/map-veto"};
