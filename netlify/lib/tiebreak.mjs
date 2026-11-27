import { createHash } from "node:crypto";
const fail = (status,text) => { throw Object.assign(new Error(text),{status}); };
async function series(db,tx,source,who) {
  const first = (await tx.get(source)).data();
  if (!first || !who.captain || ![first.a,first.b].includes(who.team) || !who.team)
    fail(403,"Solo un capitán de este cruce puede cargar el desempate.");
  const key = [first.a,first.b].sort();
  const round = await tx.get(db.collection("matches").where("fecha","==",first.fecha));
  const games = round.docs.filter(d=>key.includes(d.data().a) && key.includes(d.data().b) && d.data().a!==d.data().b);
  const existing = games.find(d=>d.data().leg==="desempate");
  const pair = games.filter(d=>d.data().leg!=="desempate");
  if (pair.length!==2 && pair.length>0) return {first,key,existing,winners:[]};
  if (pair.length!==2) fail(409,"El cruce debe tener ida y vuelta en la misma fecha.");
  const id = existing?.id || "tb_"+createHash("sha256").update(JSON.stringify(pair.map(d=>d.id).sort())).digest("hex").slice(0,24);
  const winners = pair.map(d=>d.data()).filter(m=>m.status==="played" && m.ra!=null && m.rb!=null && +m.ra!==+m.rb).map(m=>+m.ra>+m.rb?m.a:m.b);
  return {first,key,id,existing,winners};
}
export async function createTiebreak(db,source,who,optional=false) {
  return db.runTransaction(async tx=>{
    const {first,key,id,existing,winners} = await series(db,tx,source,who);
    if (existing) return id;
    if (optional && new Set(winners).size!==2) return null;
    if (new Set(winners).size!==2) fail(409,"El desempate se habilita cuando cada equipo ganó una partida.");
    const ref = db.doc("matches/"+id);
    if ((await tx.get(ref)).exists) fail(409,"El identificador del desempate ya está en uso.");
    tx.set(ref,{fecha:first.fecha,a:key[0],b:key[1],leg:"desempate",status:"pending",ra:null,rb:null,date:"",map:first.deciderMap||null,initialSide:first.deciderSide||null,stats:{},createdBy:who.uid});
    return id;
  });
}
export async function stageEvidence(db,source,who,data) {
  return db.runTransaction(async tx=>{
    const {id,winners,existing}=await series(db,tx,source,who);
    if (existing?.data().status==="played" || (winners.length===2 && new Set(winners).size===1)) fail(409,"La serie ya está definida.");
    if ((await tx.get(db.doc("results/"+id+"_"+who.team))).exists) fail(409,"Corregí la captura desde el resultado que ya enviaste.");
    tx.set(db.doc("resultimg/"+id+"_"+who.team),{data,by:who.uid,at:Date.now(),staged:true});
    return id;
  });
}
