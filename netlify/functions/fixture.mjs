import { createHash } from "node:crypto";
import { initAdmin, admin } from "../lib/admin.mjs";
import { json, readBody, whoIs } from "../lib/auth.mjs";
import { teamKeysFrom } from "../lib/league.mjs";
import { patchSnapshot } from "../lib/publish.mjs";

const hash = value => createHash("sha256").update(value).digest("hex");
const fail = (status,message) => {throw Object.assign(new Error(message),{status});};
function validTime(value) {
  if (value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) return false;
  const date = new Date(value+"Z");
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0,16) === value;
}

export async function addFixture(db,me,body) {
  const {mode,rows,key} = body || {};
  if (!me?.staff || (mode === "auto" && !me.ultra)) fail(403,"Necesitás permisos de staff.");
  if (!["manual","auto"].includes(mode) || !Array.isArray(rows) || !rows.length || rows.length > (mode==="auto"?450:2) || !/^[a-zA-Z0-9_-]{6,80}$/.test(key||"")) fail(400,"Revisá los partidos. El máximo por sorteo es de 450.");
  const signature = hash(JSON.stringify([mode,rows])), operation = hash(me.uid+" "+key);
  const op = db.doc("fixtureops/"+operation),lock = db.doc("sys/fixtureLock");
  return db.runTransaction(async tx=>{
    const previous = (await tx.get(op)).data();
    if(previous) {
      if(previous.signature !== signature) fail(409,"El pedido cambió. Volvé a generar la vista previa.");
      return previous.ids;
    }
    await tx.get(lock);
    const [teamSnap,matchSnap,cfg] = await Promise.all([tx.get(db.collection("teams")),tx.get(db.collection("matches")),tx.get(db.doc("league/config"))]);
    const teams = new Set(teamKeysFrom(Object.fromEntries(teamSnap.docs.map(d=>[d.id,d.data()]))));
    const existing = matchSnap.docs.map(d=>({...d.data(),ref:d.ref}));
    const occupied = new Set(existing.map(m=>Number(m.fecha)));
    const credited = new Set((cfg.data()?.credited || []).map(Number));
    const ids = [],updates = [],created = [];
    for(const [i,row] of rows.entries()){
      const {fecha,a,b,date,leg} = row || {};
      if(!Number.isInteger(fecha) || fecha < 1 || fecha > 9999 || !teams.has(a) || !teams.has(b) || a===b || !validTime(date) || ![null,"ida","vuelta"].includes(leg)) fail(400,"Revisá la fecha, los equipos y el horario.");
      if(credited.has(fecha) || mode==="auto" && occupied.has(fecha)) fail(409,"La fecha "+fecha+" ya está ocupada o acreditada. Actualizá el fixture.");
      const same = existing.filter(m=>Number(m.fecha)===fecha && [m.a,m.b].some(k=>k===a || k===b));
      const reverse = same[0];
      if(same.length && (same.length!==1 || reverse.a!==b || reverse.b!==a || ![null,undefined,"ida"].includes(reverse.leg) || leg==="ida")) fail(409,"Un equipo ya tiene cruce en la fecha "+fecha+". Usá el desempate si corresponde.");
      if(date && existing.some(m=>m.date===date && [m.a,m.b].some(k=>k===a || k===b))) fail(409,"Un equipo ya juega en ese horario.");
      if(reverse && date && reverse.date && date <= reverse.date) fail(409,"La vuelta tiene que empezar después de la ida.");
      if(!reverse && leg==="vuelta") fail(409,"Falta la ida de ese cruce.");
      if(reverse && !reverse.leg){reverse.leg="ida";updates.push(reverse.ref);}
      const id = "m_"+hash(operation+" "+i).slice(0,24),ref=db.doc("matches/"+id);
      const data={fecha,a,b,date,leg:reverse?"vuelta":leg,status:"pending",ra:null,rb:null,ot:false,noShow:null,map:null,proj:null,mvp:null,stats:{}};
      created.push({ref,data});existing.push({...data,ref});ids.push(id);
    }
    for(const {ref,data} of created)tx.set(ref,data);
    for(const ref of updates)tx.update(ref,{leg:"ida"});
    const paths=[...created.map(m=>m.ref.path),...updates.map(r=>r.path)];
    tx.set(op,{ids,signature,at:Date.now()});tx.set(lock,{at:Date.now()});
    tx.set(db.doc("pubqueue/main"),{paths:admin.firestore.FieldValue.arrayUnion(...paths),at:Date.now()},{merge:true});
    return ids;
  });
}
export default async function(req){
  if(req.method!=="POST")return json(405,{error:"Método no permitido."});
  try {
    const service=initAdmin(),me=await whoIs(req,service),db=service.firestore();
    if(!me?.staff)return json(403,{error:"Solo staff."});
    const ids=await addFixture(db,me,await readBody(req,95000));
    await patchSnapshot(db,ids.map(id=>"matches/"+id));
    return json(200,{ids});
  }catch(e){return json(e.status || 503,{error:e.status?e.message:"No se pudo confirmar el fixture. Reintentá el mismo pedido."});}
}
export const config={path:"/api/fixture"};
