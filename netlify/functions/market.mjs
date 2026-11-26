import {notice} from "../lib/notices.mjs";
import {initAdmin,admin} from "../lib/admin.mjs";
import {json,readBody,whoIs} from "../lib/auth.mjs";
import {teamKeysFrom} from "../lib/league.mjs";
import {digest,fail,queue,work} from "../lib/community-sync.mjs";
import {patchSnapshot} from "../lib/publish.mjs";

const keyOk=s=>typeof s==="string" && /^[A-Za-z0-9_-]{1,128}$/.test(s);
const active=["pend","review","accepted"];
export async function market(db,me,b){
  if(!me?.staff && !me?.captain)fail(403,"Se requiere una cuenta de staff o capitán.");
  if(b.action==="resetWindow"){
    if(!me.ultra)fail(403,"Solo el ultra admin puede reiniciar la ventana.");
    if(!Number.isSafeInteger(b.windowId) || b.windowId<1)fail(400,"Ventana inválida.");
    return db.runTransaction(async tx=>{
      const ref=db.doc("league/config"),current=(await tx.get(ref)).data()?.windowId??1;
      if(current!==b.windowId)fail(409,"La ventana ya cambió. Actualizá el panel.");
      tx.set(ref,{windowId:current+1,windowOpen:true,windowClose:""},{merge:true});
      tx.set(db.collection("audit").doc(),{uid:me.uid,u:me.u,role:me.role,at:Date.now(),txt:"Reinició la ventana de fichajes N° "+(current+1)});
      tx.set(db.doc("pubqueue/main"),{paths:admin.firestore.FieldValue.arrayUnion(ref.path),at:Date.now()},{merge:true});
      return {paths:[ref.path],jobs:[]};
    });
  }
  if(b.action==="swap"){
    if(!me.ultra&&me.role!=="admin")fail(403,"Solo administración.");
    if(![b.key,b.pid,b.other].every(keyOk)||b.pid===b.other)fail(400,"Elegí dos jugadores.");
    const op=digest(me.uid+"/swap/"+b.key),ids=[b.pid,b.other];
    return db.runTransaction(async tx=>{
      const refs=ids.map(id=>db.doc("players/"+id)),trans=ids.map((_,n)=>db.doc("transfers/"+op+n));
      const [a,bp,existing]=await tx.getAll(...refs,trans[0]);if(existing.exists)return {jobs:[],paths:[]};
      const players=[a.data(),bp.data()];if(players.some((p,n)=>!p?.team||p.team!==b.teams?.[n]||(p.marketVersion||0)!==b.versions?.[n])||players[0].team===players[1].team)fail(409,"Las plantillas cambiaron.");
      const teams=await tx.getAll(...players.map(p=>db.doc("teams/"+p.team)));if(teams.some(t=>!t.exists))fail(409,"Equipo inexistente.");
      const cfg=(await tx.get(db.doc("league/config"))).data()||{},links=await Promise.all(ids.map(id=>tx.get(db.collection("recruits").where("pid","==",id))));
      const paths=[],jobs=[],at=Date.now();for(let n=0;n<2;n++){const p=players[n],other=players[1-n],team=teams[n].data(),rid=links[n].docs[0]?.id||p.recruitId||null;
        const data={pid:ids[n],name:p.name||ids[n],from:p.team,to:other.team,fromName:team.name||p.team,toName:teams[1-n].data().name||other.team,at,version:(p.marketVersion||0)+1,win:cfg.windowId||1,amt:0,swap:op};
        notice(tx,db,ids[n],op,"Mercado","Intercambio confirmado · "+data.toName,"mercado",at);tx.update(refs[n],{team:other.team,marketVersion:data.version});tx.set(trans[n],data);paths.push(refs[n].path,trans[n].path);
        if(team.captain===ids[n]||team.sub===ids[n]){tx.set(teams[n].ref,{...(team.captain===ids[n]?{captain:null}:{}),...(team.sub===ids[n]?{sub:null}:{})},{merge:true});paths.push(teams[n].ref.path);}
        if(!n){const id="swap_"+op;queue(tx,db,id,"transfer",{...data,rid,otherName:other.name||ids[1]});jobs.push(id);}
        if(rid){const id="roles_"+op+n;queue(tx,db,id,"roles",{...data,rid});jobs.push(id);}
      }
      tx.set(db.collection("audit").doc(),{uid:me.uid,u:me.u,at,role:me.role,txt:"Intercambio oficial "+ids.join(" / ")});
      tx.set(db.doc("pubqueue/main"),{at,paths:admin.firestore.FieldValue.arrayUnion(...paths)},{merge:true});return {jobs,paths};
    });
  }
  const submit=b.action==="submit",manual=b.action==="manual",cancel=b.action==="cancel";
  if(!submit && !cancel && !me.staff || submit && !me.captain)fail(403,"Permisos insuficientes.");
  const owner=submit || cancel && !me.staff?me.uid:b.owner;
  if(!keyOk(b.key)||!manual && !keyOk(owner))fail(400,"Pedido inválido.");
  return db.runTransaction(async tx=>{
    const op=digest((manual?me.uid:owner)+"/"+b.key);
    const trans=db.doc("transfers/"+op),offerRef=manual?null:db.doc("offers/"+owner);
    const existing=(await tx.get(trans)).data();
    if(existing){if(["confirm","manual"].includes(b.action))return {paths:[],jobs:[]};fail(409,"El pase ya fue confirmado.");}
    const oDoc=offerRef?(await tx.get(offerRef)).data()||{}:{};
    const items=oDoc.items || [],offer=items.find(x=>x.id===b.key);
    if(submit && offer)return {paths:[],jobs:[]};
    if(!submit && !manual && (!offer || !active.includes(offer.status)))fail(409,"Oferta cerrada o inexistente.");
    const to=submit?me.team:manual?b.to:oDoc.team;
    const pid=submit||manual?b.pid:offer.pid;
    if(!keyOk(pid)||to!==null&&!keyOk(to))fail(400,"Equipo o jugador inválido.");
    const playerRef=db.doc("players/"+pid),player=(await tx.get(playerRef)).data();
    if(!player)fail(404,"Jugador inexistente.");
    const from=player.team||null,version=player.marketVersion||0,at=Date.now();
    const audit=txt=>tx.set(db.collection("audit").doc(),{at,uid:me.uid,u:me.u||me.uid,role:me.role||me.kind,txt});
    const status={review:"review",accept:"accepted",reject:"no",cancel:"cancelled",confirm:"ok"}[b.action];
    if(!manual && !submit && !status)fail(400,"Acción inválida.");
    function updateOffer(status){
      tx.update(offerRef,{items:items.map(o=>o.id===b.key?{...o,status,updated:at}:o)});
      audit("Oferta "+b.key+" · "+status);
    }
    if(status && status!=="ok"){
      if(status==="review" && offer.status!=="pend" || status==="accepted" && !["pend","review"].includes(offer.status))fail(409,"Transición inválida.");
      if(status==="no")notice(tx,db,pid,op+"rejected","Mercado","Solicitud de fichaje rechazada","mercado",at);updateOffer(status);return {paths:[],jobs:[]};
    }
    if(from===to || (!submit && (manual?b.from!==from || b.version!==version:offer.from!==undefined && offer.from!==from || offer.version!==undefined && offer.version!==version)))fail(409,"El plantel cambió. Revisá el jugador y la oferta.");
    const amt=manual||submit?b.amt:offer.amt;
    if(!Number.isSafeInteger(amt)||amt<0||amt>100000000||!to && amt!==0)fail(400,"Monto inválido.");
    const [allTeams,config,players]=await Promise.all([tx.get(db.collection("teams")),tx.get(db.doc("league/config")),tx.get(db.collection("players"))]);
    const teams=Object.fromEntries(allTeams.docs.map(d=>[d.id,d.data()])),cfg=config.data()||{},win=cfg.windowId??1;
    if(to && !teamKeysFrom(teams).includes(to))fail(409,"Equipo inactivo.");
    const funds=Number(teams[to]?.coins??6000);
    if(to && amt>funds)fail(409,"Saldo insuficiente.");
    if(!manual){
      const count=k=>players.docs.filter(d=>d.data().team===k).length;
      if(!to || cfg.windowOpen===false)fail(409,"La ventana de fichajes está cerrada.");
      if(count(to)>=7)fail(409,"El equipo comprador ya tiene siete jugadores.");
      if(from && count(from)<=5)fail(409,"El equipo de origen necesita conservar al menos cinco jugadores.");
    }
    const rid=player.recruitId || (await tx.get(db.collection("recruits").where("pid","==",pid))).docs[0]?.id;
    const ridData=rid?(await tx.get(db.doc("recruits/"+rid))).data():null;
    if(to && !from && ridData && (!ridData.paid || ridData.status!=="approved"))fail(409,"El agente libre tiene un pago pendiente.");
    if(submit){
      if(items.some(o=>o.pid===pid && active.includes(o.status)))fail(409,"Ya hay una oferta abierta.");
      if(amt<Math.max(100,Math.round((player.value||100)*0.5/50)*50)||amt>3000)fail(400,"Monto fuera del rango de oferta.");
      notice(tx,db,pid,op+"requested","Mercado","Recibiste una solicitud de fichaje de "+(teams[to]?.name||to),"mercado",at);tx.set(offerRef,{team:to,items:[...items,{id:b.key,pid,team:to,from,version,amt,len:String(b.len||"").slice(0,80),msg:String(b.msg||"").slice(0,140),at,status:"pend"}]});return {paths:[],jobs:[]};
    }
    const data={pid,name:player.name,from,to,amt,win,at,version:version+1,status:"confirmed",fromName:teams[from]?.name||from,toName:teams[to]?.name||to};
    const paths=[playerRef.path,trans.path];
    tx.update(playerRef,{team:to,marketVersion:version+1,...(rid?{recruitId:rid}:{})});
    if(to && amt){tx.set(db.doc("teams/"+to),{coins:funds-amt},{merge:true});paths.push("teams/"+to);}
    if(from && (amt || teams[from]?.captain===pid || teams[from]?.sub===pid)){const old=teams[from]||{};tx.set(db.doc("teams/"+from),{...(amt?{coins:(old.coins??6000)+amt}:{}),...(old.captain===pid?{captain:null}:{}),...(old.sub===pid?{sub:null}:{})},{merge:true});paths.push("teams/"+from);}
    notice(tx,db,pid,op,"Mercado",to?"Pase confirmado a "+(data.toName||to):"Volviste al mercado libre","mercado",at);tx.set(trans,data);if(offer)updateOffer("ok");else audit("Pase confirmado de "+player.name);
    const jobs=[];
    function add(kind){const id=kind+"_"+op;queue(tx,db,id,kind,{...data,rid:rid||null});jobs.push(id);}
    add("transfer");if(ridData?.paid)add("roles");if(!to&&(!rid||ridData?.paid))add("free");
    tx.set(db.doc("pubqueue/main"),{paths:admin.firestore.FieldValue.arrayUnion(...paths),at},{merge:true});
    return {paths,jobs};
  });
}
export default async function(req){
  if(req.method!=="POST")return json(405,{error:"Método inválido."});
  try{const a=initAdmin(),db=a.firestore(),me=await whoIs(req,a);
    const result=await market(db,me,await readBody(req,4096));
    if(result.paths.length)await patchSnapshot(db,result.paths).catch(e=>console.error("Publicación pendiente",e.message));
    for(const key of result.jobs)await work(db,key);
    return json(200,{ok:true});
  }catch(e){return json(e.status||503,{error:e.status?e.message:"Reintentá la operación."});}
}
export const config={path:"/api/market"};

