import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import admin from "firebase-admin";
import { fakeDb } from "./helpers/fakedb.mjs";
import { addFixture } from "../netlify/functions/fixture.mjs";
import {handler as pay,checkoutUrl} from "../netlify/functions/inscripcion-pago.mjs";
import { deliver, enqueue, receiptFile,saveReceipt } from "../netlify/lib/recruit-delivery.mjs";

const staff={uid:"staff",staff:true,ultra:true};
const match={fecha:3,a:"onyx",b:"orion",date:"2026-12-01T22:00",leg:null};
test("fixture manual acepta revancha, rechaza horarios cruzados y reintenta sin duplicar",async()=>{
  const db=fakeDb();
  const send=(rows,key="prueba0",mode="manual",me=staff)=>addFixture(db,me,{rows,key,mode});
  const ids=await send([match]);
  assert.deepEqual(await send([match]),ids);
  await assert.rejects(send([{...match,b:"nexus"}],"prueba1"),{status:409});
  await assert.rejects(send([{...match,fecha:4,b:"nexus"}],"prueba2"),{status:409});
  await assert.rejects(send([{...match,fecha:4}], "prueba3","auto",{...staff,ultra:false}),{status:403});
  const [second]=await send([{...match,a:"orion",b:"onyx",date:"2026-12-01T23:30"}],"prueba4");
  assert.equal(db._get("matches/"+ids[0]).leg,"ida");
  assert.equal(db._get("matches/"+second).leg,"vuelta");
  await assert.rejects(send([match],"prueba5"),{status:409});
  await assert.rejects(send([{...match,fecha:4,a:"vortex",b:"zenith"},{...match,fecha:4,b:"oculto"}],"prueba6","auto"),{status:400});
  assert.equal(Object.keys(db._coll("matches")).length,2);
});
test("once equipos: un descanso por vuelta, cinco localías, todos los rivales y horarios simultáneos",()=>{
  const src=readFileSync(new URL("../public/js/app.js",import.meta.url),"utf8");
  const ctx=vm.createContext({});vm.runInContext(src.slice(src.indexOf("const rnd ="),src.indexOf("S.fx = {")),ctx);
  const teams=Array.from({length:11},(_,i)=>"team"+i);
  const rounds=ctx.planSeason(teams,2);
  assert.equal(rounds.length,22);
  for(const team of teams){
    const half=rounds.slice(0,11);
    assert.equal(half.filter(f=>f.bye===team).length,1);
    const games=half.flatMap(f=>f.ms).filter(p=>p.includes(team));
    assert.equal(new Set(games.flat().filter(t=>t!==team)).size,10);
    assert.equal(games.filter(p=>p[0]===team).length,5);
  }
  const times=ctx.planDates(rounds,{start:"2026-12-01",hour:"21:00",every:7,gap:60,parallel:2,legs:true});
  assert.equal(times[0][0][0],times[0][1][0]);assert.equal(times[0][2][0],"2026-12-01T23:00");assert.equal(times[0][2][1],"2026-12-02T00:00");
});
const guild="1550607388267122788",channel="123456789012345671",id="123456789012345672";
function deliveryDb(){
  process.env.DISCORD_GUILD_ID=guild;process.env.DISCORD_BOT_TOKEN="test-token";
  return fakeDb({["recruits/"+id]:{discordId:id,discord:"jugador",riot:"Prueba#AR",status:"approved",paid:false},"bot/recruitment":{receipts:channel,channel}});
}
const pdf="data:application/pdf;base64,"+Buffer.from("%PDF-1.6\ncomprobante").toString("base64");
test("el comprobante privado llega al canal con el archivo y la identidad, sin acreditar el pago", async()=>{
  const db=deliveryDb(),file=receiptFile(pdf);
  assert.throws(()=>receiptFile(pdf.replace("application/pdf","image/png")),{status:400});
  await assert.rejects(saveReceipt(db,id,{id:"otro"},file,"paypal"),{status:403});
  await saveReceipt(db,id,{id},file,"paypal");
  const ch={type:0,guild_id:guild};
  assert.equal(await deliver(db,"receipt",id,{call:async()=>ch}),"config");
  let sends=0;const call=async(method,path,form)=>{
    if(method==="GET")return {...ch,permission_overwrites:[{type:0,id:guild,deny:"1024"}]};
    assert.equal(path,"/channels/"+channel+"/messages");assert.equal(await form.get("files[0]").text(),"%PDF-1.6\ncomprobante");
    assert.match(JSON.parse(form.get("payload_json")).content,/Prueba#AR/);sends++;return {id:"msg"};
  };
  assert.equal(await deliver(db,"receipt",id,{call,manual:true}),"sent");
  assert.equal(await deliver(db,"receipt",id,{call,manual:true}),"sent");assert.equal(sends,1);
  assert.equal(db._get("receiptuploads/"+id),undefined);assert.equal(db._get("recruits/"+id).paid,false);
});
test("invitación dirigida de un uso y 24 h, conserva el enlace si falla el privado",async()=>{
  const db=deliveryDb();await db.doc("recruits/"+id).update({paid:true});await db.runTransaction(tx=>enqueue(tx,db,"invite",id,id));
  let invites=0,dm=0;
  const call=async(method,path,body)=>{
    if(path.includes("/members/"))throw Object.assign(new Error("ausente"),{status:404,body:{code:10007}});
    if(method==="GET")return {type:0,guild_id:guild};
    if(path.endsWith("/invites")){invites++;assert.equal(body.max_age,86400);assert.equal(body.max_uses,1);assert.deepEqual(body.target_user_ids,[id]);return {code:"prueba"};}
    if(path==="/users/@me/channels"){assert.equal(body.recipient_id,id);return {id:"dm"};}
    assert.match(body.content,/discord.gg\/prueba/);
    if(!dm++)throw Object.assign(new Error("cerrado"),{status:403,body:{code:50007}});
    return {id:"msg"};
  };
  assert.equal(await deliver(db,"invite",id,{call}),"blocked");
  assert.equal(await deliver(db,"invite",id,{call,manual:true}),"sent");assert.equal(invites,1);
});
test("checkout fijo de ARS 3000: la cuenta conectada crea un enlace y los siguientes usuarios lo comparten",async()=>{
  assert.equal(checkoutUrl("https://www.mercadopago.com.ar.ejemplo.test/pago"),null);
  admin.initializeApp();globalThis.__db=fakeDb();delete process.env.MP_INSCRIPCION_URL;delete process.env.MP_ACCESS_TOKEN;
  const get=()=>pay(new Request("https://example.test/api/inscripcion-pago"));
  assert.deepEqual(await (await get()).json(),{available:true});
  const post=()=>pay(new Request("https://example.test/api/inscripcion-pago",{method:"POST",body:'{"amount":1}'}));
  assert.deepEqual(await (await post()).json(),{url:"https://mpago.la/1JL1Y54"});
  const old=globalThis.fetch;let calls=0;const url="https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=test";
  process.env.MP_ACCESS_TOKEN="test-private";
  try{
    globalThis.fetch=async(path,options)=>{calls++;assert.equal(path,"https://api.mercadopago.com/checkout/preferences");assert.equal(options.headers.authorization,"Bearer test-private");const [item]=JSON.parse(options.body).items;assert.equal(item.unit_price,3000);assert.equal(item.quantity,1);assert.equal(item.currency_id,"ARS");return Response.json({init_point:url,id:"test"});};
    assert.deepEqual(await (await post()).json(),{url});assert.deepEqual(await (await post()).json(),{url});assert.equal(calls,1);
  }finally{globalThis.fetch=old;delete process.env.MP_ACCESS_TOKEN;}
});
