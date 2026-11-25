import {initAdmin,admin} from "../lib/admin.mjs";
import {json,readBody,whoIs} from "../lib/auth.mjs";
import {teamKeysFrom} from "../lib/league.mjs";
import {digest,fail,queue,work} from "../lib/community-sync.mjs";
import {patchSnapshot} from "../lib/publish.mjs";

const keyOk=s=>typeof s==="string" && /^[A-Za-z0-9_-]{1,128}$/.test(s);
const active=["pend","review","accepted"];
export async function market(db,me,b){
  if(!me?.staff && !me?.captain)fail(403,"Se requiere una cuenta de staff o capitán.");
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
      updateOffer(status);return {paths:[],jobs:[]};
    }
    if(from===to || (!submit && (manual?b.from!==from || b.version!==version:offer.from!==undefined && offer.from!==from || offer.version!==undefined && offer.version!==version)))fail(409,"El plantel cambió. Revisá el jugador y la oferta.");
    const amt=manual||submit?b.amt:offer.amt;
    if(!Number.isSafeInteger(amt)||amt<0||amt>100000000||!to && amt!==0)fail(400,"Monto inválido.");
    const [allTeams,config,players,transfers]=await Promise.all([tx.get(db.collection("teams")),tx.get(db.doc("league/config")),tx.get(db.collection("players")),tx.get(db.collection("transfers"))]);
    const teams=Object.fromEntries(allTeams.docs.map(d=>[d.id,d.data()])),cfg=config.data()||{},win=cfg.windowId??1;
    if(to && !teamKeysFrom(teams).includes(to))fail(409,"Equipo inactivo.");
    const funds=Number(teams[to]?.coins??6000);
    if(to && amt>funds)fail(409,"Saldo insuficiente.");
    if(!manual){
      const count=k=>players.docs.filter(d=>d.data().team===k).length;
      if(!to || cfg.windowOpen===false || count(to)>=(cfg.rosterMax??7) || from && count(from)<=(cfg.rosterMin??5) || transfers.docs.filter(d=>d.data().to===to && d.data().win===win).length>=(cfg.maxSign??2))fail(409,"La ventana o los cupos del plantel impiden el pase.");
    }
    const rid=player.recruitId || (await tx.get(db.collection("recruits").where("pid","==",pid))).docs[0]?.id;
    const ridData=rid?(await tx.get(db.doc("recruits/"+rid))).data():null;
    if(to && !from && ridData && (!ridData.paid || ridData.status!=="approved"))fail(409,"El agente libre tiene un pago pendiente.");
    if(submit){
      if(items.some(o=>o.pid===pid && active.includes(o.status)))fail(409,"Ya hay una oferta abierta.");
      if(amt<Math.max(100,Math.round((player.value||100)*0.5/50)*50)||amt>3000)fail(400,"Monto fuera del rango de oferta.");
      tx.set(offerRef,{team:to,items:[...items,{id:b.key,pid,team:to,from,version,amt,len:String(b.len||"").slice(0,80),msg:String(b.msg||"").slice(0,140),at,status:"pend"}]});return {paths:[],jobs:[]};
    }
    const data={pid,name:player.name,from,to,amt,win,at,version:version+1,status:"confirmed",fromName:teams[from]?.name||from,toName:teams[to]?.name||to};
    const paths=[playerRef.path,trans.path];
    tx.update(playerRef,{team:to,marketVersion:version+1,...(rid?{recruitId:rid}:{})});
    if(to && amt){tx.set(db.doc("teams/"+to),{coins:funds-amt},{merge:true});paths.push("teams/"+to);}
    if(from && (amt || teams[from]?.captain===pid || teams[from]?.sub===pid)){const old=teams[from]||{};tx.set(db.doc("teams/"+from),{...(amt?{coins:(old.coins??6000)+amt}:{}),...(old.captain===pid?{captain:null}:{}),...(old.sub===pid?{sub:null}:{})},{merge:true});paths.push("teams/"+from);}
    tx.set(trans,data);if(offer)updateOffer("ok");else audit("Pase confirmado de "+player.name);
    const jobs=[];
    function add(kind){const id=kind+"_"+op;queue(tx,db,id,kind,{...data,rid:rid||null});jobs.push(id);}
    add("transfer");if(ridData?.paid){add("roles");if(!to)add("free");}
    tx.set(db.doc("pubqueue/main"),{paths:admin.firestore.FieldValue.arrayUnion(...paths),at},{merge:true});
    return {paths,jobs};
  });
}
export default async function(req){
  if(req.method!=="POST")return json(405,{error:"Método inválido."});
  try{const a=initAdmin(),db=a.firestore(),me=await whoIs(req,a);
    const result=await market(db,me,await readBody(req,4096));
    if(result.paths.length)await patchSnapshot(db,result.paths);
    for(const key of result.jobs)await work(db,key);
    return json(200,{ok:true});
  }catch(e){return json(e.status||503,{error:e.status?e.message:"Reintentá la operación."});}
}
export const config={path:"/api/market"};

