// ONYX 6.0 · Etapa 2: la invitación al Discord es independiente del pago y tiene salidas cuando falla.
import test from "node:test";
import assert from "node:assert/strict";
import {fakeDb} from "./helpers/fakedb.mjs";
import {guild} from "../netlify/lib/community-sync.mjs";
import {deliver,enqueue,reissueInvite,recoverInvites} from "../netlify/lib/recruit-delivery.mjs";
const id="123456789012345678",other="123456789012345679",chan="323456789012345678";
const base={discordId:id,discord:"test",riot:"Test#AR",status:"pending",paid:false,paymentState:"pending"};
function setup(rows={}){
  Object.assign(process.env,{DISCORD_GUILD_ID:guild,DISCORD_BOT_TOKEN:"test",DISCORD_INVITE_CHANNEL_ID:chan});
  return fakeDb({["recruits/"+id]:base,...rows});
}
function discord({dmOpen=true}={}){
  const s={invites:0,dms:0,present:false};
  s.call=async(method,path,body)=>{
    if(path.includes("/members/")){if(s.present)return {user:{id}};throw Object.assign(new Error("ausente"),{status:404,body:{code:10007}});}
    if(method==="GET")return {type:0,guild_id:guild};
    if(path.endsWith("/invites")){s.invites++;return {code:"c"+s.invites,expires_at:new Date(Date.now()+86400000).toISOString()};}
    if(path==="/users/@me/channels")return {id:"dm"};
    s.dms++;if(!dmOpen)throw Object.assign(new Error("cerrado"),{status:403,body:{code:50007}});return {id:"m"+s.dms};
  };
  return s;
}
const queue=async(db,rid=id,who=id)=>db.runTransaction(async tx=>enqueue(tx,db,"invite",rid,who));

test("jugador sin pagar y pendiente de revisión recibe la invitación",async()=>{
  for(const row of [{paid:false,status:"pending"},{paid:false,status:"approved",paymentState:"review"},{paid:false,status:"approved",receiptState:"sent"}]){
    const db=setup({["recruits/"+id]:{...base,...row}}),d=discord();await queue(db);
    assert.equal(await deliver(db,"invite",id,{call:d.call}),"sent");
    assert.equal(d.invites,1);assert.equal(d.dms,1);assert.equal(db._get("recruits/"+id).paid,false);
  }
});
test("la postulación rechazada no recibe invitación",async()=>{
  const db=setup({["recruits/"+id]:{...base,status:"rejected"}}),d=discord();await queue(db);
  assert.notEqual(await deliver(db,"invite",id,{call:d.call}),"sent");assert.equal(d.invites,0);
});
test("con mensajes privados cerrados el enlace queda guardado y el jugador puede pedir otro desde su perfil",async()=>{
  const db=setup(),d=discord({dmOpen:false});await queue(db);
  assert.equal(await deliver(db,"invite",id,{call:d.call}),"blocked");
  assert.match(db._get("recruitjobs/invite_"+id).code,/^c1$/);
  assert.equal(db._get("recruits/"+id).inviteState,"blocked");
  const out=await reissueInvite(db,id,{id},{call:d.call});
  assert.equal(out.link,"https://discord.gg/c1");
  assert.equal(d.invites,1);
});
test("invitación vencida: el jugador obtiene una nueva sin staff y hay enfriamiento",async()=>{
  const db=setup(),d=discord();await queue(db);
  await db.doc("recruitjobs/invite_"+id).update({code:"old",expires:1,state:"sent"});
  const t=Date.now();
  const out=await reissueInvite(db,id,{id},{call:d.call,now:()=>t});
  assert.equal(d.invites,1);assert.match(out.link,/discord\.gg\/c1$/);
  await assert.rejects(reissueInvite(db,id,{id},{call:d.call,now:()=>t+1000}),{status:429});
  await assert.rejects(reissueInvite(db,id,{id:other},{call:d.call,now:()=>t+9e6}),{status:403});
});
test("quien ya está en el servidor no genera otra invitación",async()=>{
  const db=setup(),d=discord();d.present=true;await queue(db);
  assert.equal(await deliver(db,"invite",id,{call:d.call}),"joined");
  const out=await reissueInvite(db,id,{id},{call:d.call});
  assert.equal(out.state,"joined");assert.equal(d.invites,0);
});
test("recuperación: simula sin escribir, y al confirmar solo encola a los afectados",async()=>{
  const a="223456789012345678",b="223456789012345679",c="223456789012345680",rej="223456789012345681",ok="223456789012345682";
  const db=setup({
    ["recruits/"+a]:{...base,discordId:a},["recruits/"+b]:{...base,discordId:b},["recruits/"+c]:{...base,discordId:c},
    ["recruits/"+rej]:{...base,discordId:rej,status:"rejected"},["recruits/"+ok]:{...base,discordId:ok},
    ["recruits/web_"+"a".repeat(32)]:{riot:"X#1",status:"pending"},
    ["recruitjobs/invite_"+b]:{id:b,kind:"invite",recipient:b,state:"expired",code:"x",expires:1,next:0,attempt:3},
    ["recruitjobs/invite_"+c]:{id:c,kind:"invite",recipient:c,state:"blocked",code:"y",expires:1,next:0,attempt:1},
    ["recruitjobs/invite_"+ok]:{id:ok,kind:"invite",recipient:ok,state:"joined",next:0,attempt:1},
  });
  const before=JSON.stringify(db._coll("recruitjobs"));
  const sim=await recoverInvites(db);
  assert.equal(sim.dryRun,true);assert.equal(JSON.stringify(db._coll("recruitjobs")),before);
  assert.equal(sim.counts.sinInvitacion,2);// id (de setup) y a
  assert.equal(sim.counts.atascadas,2);assert.equal(sim.counts.sinDiscord,1);
  const real=await recoverInvites(db,{dryRun:false,by:"admin"});
  assert.equal(real.dryRun,false);
  const jobs=db._coll("recruitjobs");
  assert.equal(jobs["invite_"+a].state,"pending");assert.equal(jobs["invite_"+b].state,"pending");assert.equal(jobs["invite_"+b].code,null);
  assert.equal(jobs["invite_"+rej],undefined);assert.equal(jobs["invite_"+ok].state,"joined");
  const again=await recoverInvites(db);assert.equal(again.counts.atascadas,0);assert.equal(again.counts.sinInvitacion,0);
});

// Etapa 3: estado de registro y estado económico son independientes.
import {decideApplication} from "../netlify/lib/applications.mjs";
test("aceptar la postulación no marca el pago; el mercado se habilita solo al verificar",async()=>{
  const staff={staff:true,ultra:true,uid:"admin",u:"admin",role:"ultra"};
  const db=setup({["recruits/"+id]:{...base,status:"pending",rango:"Oro",principal:"Flex",riot:"Test#AR"}});
  await decideApplication(db,id,"approve",staff);
  const r=db._get("recruits/"+id);
  assert.equal(r.status,"approved");assert.equal(r.paid||false,false);assert.equal(r.paymentState,"pending");
  assert.equal(db._get("players/"+(r.pid||"x")),undefined);
  // el staff no puede verificar sin comprobante enviado
  await assert.rejects(decideApplication(db,id,"verify",{...staff,receiptHash:"x"}),{status:409});
  // y un usuario sin permiso de staff nunca verifica
  await assert.rejects(decideApplication(db,id,"verify",{staff:false,uid:"u"}),{status:409});
});
