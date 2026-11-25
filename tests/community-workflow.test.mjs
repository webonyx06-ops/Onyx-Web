import endpoint from "../netlify/functions/recruitment.mjs";
import admin from "firebase-admin";
import test from "node:test";
import assert from "node:assert/strict";
import {fakeDb} from "./helpers/fakedb.mjs";
import {market} from "../netlify/functions/market.mjs";
import {guild,freeChannel,transferChannel,work,queue} from "../netlify/lib/community-sync.mjs";
import {decideApplication} from "../netlify/lib/applications.mjs";
import {deliver,enqueue,saveReceipt,receiptFile} from "../netlify/lib/recruit-delivery.mjs";
import {upgradeRecruitment} from "../netlify/lib/recruit-upgrade.mjs";
import {identity,identityCookie} from "../netlify/lib/recruit-id.mjs";
import blockedCheckout from "../netlify/functions/inscripcion-pago.mjs";
const id="123456789012345678",botId="123456789012345679",pid="p_test";
const ids=["223456789012345678","223456789012345679","223456789012345680"],teamRole="223456789012345681",highest="223456789012345689";
const staff={staff:true,ultra:true,uid:"admin",u:"admin",role:"ultra"},cap={captain:true,uid:"captain",team:"onyx",u:"cap"};
const accepted={status:"approved",discordId:id,discord:"test",riot:"Test#AR",rango:"Platino",principal:"Centinela",paid:true,pid,flowVersion:2};
const player={team:null,marketVersion:0,recruitId:id,discord:id,name:"Test",value:1500,rank:"Platino",role:"Centinela"};
function setup(){
  Object.assign(process.env,{DISCORD_GUILD_ID:guild,DISCORD_APP_ID:botId,DISCORD_BOT_TOKEN:"test",DISCORD_ROLE_PAID_ID:ids[0],DISCORD_ROLE_PLAYER_ID:ids[1],DISCORD_ROLE_VERIFIED_ID:ids[2]});
  return fakeDb({["players/"+pid]:player,["recruits/"+id]:accepted,"bot/config":{teams:{onyx:{role:teamRole}}},"teams/onyx":{coins:6000,name:"ONYX"},"league/config":{rosterMin:0},"bot/recruitment":{channel:freeChannel}});
}
function discord(){
  const member={user:{id},roles:[]},sent=[],edits=[],mutations=[];
  const state={joined:false,temporary:false,top:10};
  const call=async(method,path,data)=>{
    if(path==="/users/@me")return {id:botId};
    if(path.endsWith("/members/"+botId))return {roles:[highest]};
    if(path.endsWith("/members/"+id)){
      if(!state.joined)throw Object.assign(new Error("Ausente"),{status:404,body:{code:10007}});
      return member;
    }
    if(method==="GET" && path.endsWith("/roles"))return [...ids,teamRole,highest].map(r=>({id:r,position:r===highest?state.top:2,permissions:r===highest?"268435456":"0"}));
    if(path.includes("/roles/")){const r=path.split("/").at(-1);mutations.push([method,r]);member.roles=method==="PUT"?[...new Set([...member.roles,r])]:member.roles.filter(x=>x!==r);return;}
    if(method==="GET" && path.includes("/messages?"))return sent.map(x=>({...x,author:{id:botId}}));
    if(method==="GET" && path.startsWith("/channels/"))return {type:0,guild_id:guild};
    if(method==="PATCH"){edits.push(data);return {};}
    if(path.endsWith("/messages")){
      if(state.temporary){state.temporary=false;throw new Error("Falla temporal");}
      const msg={...data,channel:path.split("/")[2],id:String(sent.length+1)};sent.push(msg);return msg;
    }
    throw Error("Ruta inesperada: "+method+" "+path);
  };
  return {state,call,member,sent,edits,mutations};
}
test("las fases de una oferta, ejecución atómica y anuncios de disponibilidad en dos ciclos",async()=>{
  const db=setup(),d=discord(),key="offer1",owner=cap.uid;
  await db.runTransaction(tx=>queue(tx,db,"initial","free",{pid,rid:id,version:0}));
  await work(db,"initial",{call:d.call});
  assert.equal(d.sent[0].channel,freeChannel);assert.deepEqual(d.sent[0].embeds[0].fields.map(f=>f.value),["Test","Platino","Centinela"]);
  for(const k of [key,"competing"]){
    await market(db,k===key?cap:{...cap,uid:"other",team:"orion"},{action:"submit",key:k,pid,amt:1500});
  }
  for(const action of ["review","accept"])await market(db,staff,{action,owner,key});
  assert.equal(d.sent.length,1);assert.equal(Object.keys(db._coll("transfers")).length,0);
  const confirmed=await market(db,staff,{action:"confirm",owner,key});assert.equal(db._get("teams/onyx").coins,4500);
  assert.equal(db._get("players/"+pid).team,"onyx");assert.deepEqual((await market(db,staff,{action:"confirm",owner,key})).jobs,[]);
  await assert.rejects(market(db,staff,{action:"confirm",owner:"other",key:"competing"}),{status:409});
  d.state.joined=true;
  for(const job of confirmed.jobs)await work(db,job,{call:d.call});
  assert.equal(d.sent[1].channel,transferChannel);assert.equal(d.edits.length,1);assert.deepEqual(new Set(d.member.roles),new Set([...ids,teamRole]));
  const released=await market(db,staff,{action:"manual",key:"release",pid,from:"onyx",to:null,version:1,amt:0});
  for(const job of released.jobs)await work(db,job,{call:d.call});
  assert.equal(db._get("players/"+pid).team,null);assert.deepEqual(new Set(d.member.roles),new Set(ids));
  assert.equal(d.sent.at(-1).channel,freeChannel);assert.equal(d.sent.at(-1).embeds[0].fields[0].value,"<@"+id+">");
  for(const job of released.jobs)await work(db,job,{call:d.call});
  assert.equal(d.sent.length,3);
});
test("ausencia, ingreso detectado tras reinicio, jerarquía y resincronización sin asignar dos veces",async()=>{
  const db=setup(),d=discord();
  await db.runTransaction(tx=>{queue(tx,db,"r","roles",{pid,rid:id});enqueue(tx,db,"invite",id,id);});
  await work(db,"r",{call:d.call});assert.equal(db._get("communityjobs/r").state,"waiting");
  d.state.joined=true;d.state.top=1;
  await work(db,"r",{call:d.call,manual:true});assert.equal(db._get("communityjobs/r").state,"retry");assert.equal(d.mutations.length,0);
  d.state.top=10;await work(db,"r",{call:d.call,manual:true});
  assert.deepEqual(d.member.roles,ids);assert.equal(db._get("recruits/"+id).accessState,"joined");
  assert.equal(await deliver(db,"invite",id,{call:d.call}),"joined");
  await db.runTransaction(tx=>queue(tx,db,"repeat","roles",{pid,rid:id}));
  await work(db,"repeat",{call:d.call});assert.equal(d.mutations.length,3);
});
test("pago rechazado, prueba repetida entre cuentas y puertas de acceso",async()=>{
  const db=setup(),r=db.doc("recruits/"+id);
  await r.update({paid:false,status:"pending"});await db.runTransaction(tx=>enqueue(tx,db,"invite",id,id));
  const file=receiptFile("data:application/pdf;base64,"+Buffer.from("%PDF-1.6 test file").toString("base64"));
  await assert.rejects(saveReceipt(db,id,{id},file,"paypal"),{status:403});
  let calls=0;await deliver(db,"invite",id,{call:async()=>{calls++;}});assert.equal(calls,0);
  await r.update({status:"approved"});await saveReceipt(db,id,{id},file,"paypal");
  await assert.rejects(decideApplication(db,id,"verify",{...staff,receiptHash:file.hash}),{status:409});
  await r.update({receiptState:"sent"});await db.doc("recruitjobs/receipt_"+id).update({state:"sent"});
  await decideApplication(db,id,"denyReceipt",{...staff,receiptHash:file.hash});
  assert.equal(db._get("recruits/"+id).paymentState,"rejected");
  await assert.rejects(saveReceipt(db,id,{id},file,"paypal"),{status:409});
  const other=botId;await db.doc("recruits/"+other).set({...accepted,discordId:other,paid:false});
  await assert.rejects(saveReceipt(db,other,{id:other},file,"paypal"),{status:409});
  assert.equal((await blockedCheckout()).status,403);
  const cookie=identityCookie({id,username:"uno"},"key").split(";")[0];
  assert.equal(identity(new Request("https://example.test",{headers:{cookie}}),"key").id,id);
  assert.equal(identity(new Request("https://example.test",{headers:{cookie:cookie.replace("onyx_rc=","onyx_rc=x")}}),"key"),null);
});
test("fallo temporal, recuperación por mensaje persistido y rechazo/cancelación sin fichaje",async()=>{
  const db=setup(),d=discord();await db.runTransaction(tx=>queue(tx,db,"free0","free",{pid,rid:id,version:0}));
  d.state.temporary=true;await work(db,"free0",{call:d.call});assert.equal(db._get("communityjobs/free0").state,"retry");
  await work(db,"free0",{call:d.call,manual:true});assert.equal(d.sent.length,1);
  await db.doc("communityjobs/free0").update({state:"retry",next:0});await work(db,"free0",{call:d.call});assert.equal(d.sent.length,1);
  for(const action of ["reject","cancel"]){
    await market(db,cap,{action:"submit",key:action,amt:1500,pid});
    await market(db,action==="reject"?staff:cap,{action,key:action,owner:cap.uid});
  }
  assert.equal(Object.keys(db._coll("transfers")).length,0);
});
test("vencimiento y regeneración manual para un solo destinatario; migración revoca un enlace previo sin pago",async()=>{
  const db=setup(),inv=db.doc("recruitjobs/invite_"+id),d=discord();
  await db.runTransaction(tx=>enqueue(tx,db,"invite",id,id));
  await inv.update({code:"old",expires:1,state:"sent"});
  assert.equal(await deliver(db,"invite",id,{call:d.call}),"expired");
  let created=0;
  const call=async(m,path,b)=>{
    if(path.endsWith("/invites")){created++;assert.deepEqual(b.target_user_ids,[id]);assert.equal(b.max_age,86400);assert.equal(b.max_uses,1);return {code:"renewed"};}
    if(path==="/users/@me/channels")return {id:"dm"};
    return d.call(m,path,b);
  };
  assert.equal(await deliver(db,"invite",id,{manual:true,call}),"sent");assert.equal(created,1);
  await db.doc("recruits/"+id).update({flowVersion:0,paid:false});
  const revoked=[];await upgradeRecruitment(db,async(m,path)=>{revoked.push([m,path]);});
  assert.deepEqual(revoked,[["DELETE","/invites/renewed"]]);assert.equal((await inv.get()).exists,false);
});


test("el panel personal solo entrega el enlace vigente a su titular con el pago verificado",async()=>{
  admin.initializeApp();const db=globalThis.__db=setup();
  process.env.DISCORD_CLIENT_SECRET="solo-pruebas";
  const read=async who=>{
    const cookie=identityCookie({id:who,username:"cuenta"},process.env.DISCORD_CLIENT_SECRET).split(";")[0];
    return (await endpoint(new Request("https://example.test/api/recruitment?identity=1",{headers:{cookie}}))).json();
  };
  const inv=db.doc("recruitjobs/invite_"+id);
  await inv.set({recipient:id,code:"personal",expires:Date.now()+86400000});
  assert.equal((await read(id)).invite,"https://discord.gg/personal");
  assert.equal((await read(botId)).invite,null);
  await db.doc("recruits/"+id).update({paid:false});
  assert.equal((await read(id)).invite,null);
  await db.doc("recruits/"+id).update({paid:true});
  await inv.update({expires:1});assert.equal((await read(id)).invite,null);
});
test("dos confirmaciones compiten por un mismo jugador con una transacción por pase",async()=>{
  const db=setup(),run=db.runTransaction;let tail=Promise.resolve();
  // Represent the serial commit order after Firestore retries a conflicting transaction.
  db.runTransaction=fn=>{const result=tail.then(()=>run(fn));tail=result.catch(()=>{});return result;};
  await Promise.all([market(db,cap,{action:"submit",key:"one",amt:1500,pid}),market(db,{...cap,uid:"other",team:"orion"},{action:"submit",key:"two",amt:1500,pid})]);
  const result=await Promise.allSettled([market(db,staff,{action:"confirm",owner:cap.uid,key:"one"}),market(db,staff,{action:"confirm",owner:"other",key:"two"})]);
  assert.equal(result.filter(r=>r.status==="fulfilled").length,1);assert.equal(Object.keys(db._coll("transfers")).length,1);
  assert.equal(db._get("teams/onyx").coins,4500);assert.equal(db._get("teams/orion"),undefined);
});
test("el anuncio del fichaje llega aunque falle editar el aviso anterior; al reintentar solo se corrige ese aviso",async()=>{
  const db=setup(),d=discord();d.state.joined=true;
  await db.doc("marketposts/"+pid).set({message:"original",version:0});
  await db.runTransaction(tx=>queue(tx,db,"confirmed","transfer",{pid,rid:id,version:1,from:null,to:"onyx",name:"Test"}));
  let blocked=true;
  const call=async(m,path,body)=>{
    if(path.includes("/members/"))throw Object.assign(new Error("Sin acceso al miembro"),{status:403});
    if(m==="PATCH" && blocked)throw Object.assign(new Error("Falta acceso al aviso anterior"),{status:403});
    return d.call(m,path,body);
  };
  await work(db,"confirmed",{call});
  assert.equal(d.sent.length,1);assert.equal(d.sent[0].channel,transferChannel);
  assert.equal(d.sent[0].embeds[0].fields[0].value,"Test");
  assert.equal(db._get("communityjobs/confirmed").message,d.sent[0].id);
  assert.equal(db._get("communityjobs/confirmed").state,"retry");
  blocked=false;await work(db,"confirmed",{manual:true,call});
  assert.equal(d.sent.length,1);assert.equal(d.edits.length,1);assert.equal(db._get("communityjobs/confirmed").state,"done");
});
test("la sincronización de roles no demora el anuncio de un jugador libre",async()=>{
  const db=setup(),d=discord();
  await db.doc("communitylocks/role_"+pid).set({until:Date.now()+180000,token:"roles"});
  await db.runTransaction(tx=>queue(tx,db,"freeNew","free",{pid,rid:id,version:0}));
  await work(db,"freeNew",{call:d.call});
  assert.equal(d.sent.length,1);assert.equal(d.sent[0].channel,freeChannel);
});
