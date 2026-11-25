import test from "node:test";
import assert from "node:assert/strict";
import admin from "firebase-admin";
import {fakeDb} from "./helpers/fakedb.mjs";
import {identityCookie} from "../netlify/lib/recruit-id.mjs";
import {survey} from "../netlify/lib/recruitment.mjs";
import endpoint,{rosterReview} from "../netlify/functions/recruitment.mjs";
import resultEndpoint from "../netlify/functions/results.mjs";
import {fields} from "../netlify/lib/survey-fields.mjs";
import {createTiebreak,stageEvidence} from "../netlify/lib/tiebreak.mjs";
import {cleanRead,matchRows} from "../netlify/lib/scoreboard.mjs";

async function simulateDeliveredReceipt(db,id){
  await db.doc("recruitjobs/receipt_"+id).set({id,kind:"receipt",hash:"proof",state:"sent"});
  await db.doc("recruits/"+id).update({receiptState:"sent",receiptHash:"proof",paymentState:"review"});
}
test("encuesta en canal autorizado, ficha pública, pago privado y reenvío", async()=>{
  admin.initializeApp();
  const id="123456789012345678";
  process.env.DISCORD_GUILD_ID="g";
  const db=globalThis.__db=fakeDb({"staff/admin":{u:"staff",role:"staff"}});
  const i={guild_id:"g",channel_id:"channel",member:{permissions:"0",user:{id,username:"zeta"}},data:{name:"encuesta"}};
  assert.match((await survey(i)).content,/Solo/);
  i.member.permissions="32";
  assert.match((await survey(i)).content,/postular/);
  i.data={name:"postular",options:fields.map(([name])=>({name,value:name==="riot"?"Zeta#SUR":"Sí"}))};
  assert.match((await survey({...i,channel_id:"wrong"})).content,/canal/);
  assert.equal((await survey(i)).flags,64);
  const request=(body,token)=>new Request("https://example.test/api/recruitment",{method:"POST",headers:{authorization:"Bearer "+token},body:JSON.stringify(body)});
  const payment={action:"payment",id,paid:true};
  assert.equal((await endpoint(request(payment,"guest"))).status,403);
  assert.equal((await endpoint(request(payment,"admin"))).status,409);
  await survey(i);
  const privateRow = db._get("recruits/"+id);
  assert.equal(!!privateRow.paid,false);
  assert.deepEqual((await (await endpoint(new Request("https://example.test/api/recruitment"))).json()).rows,[]);
  assert.equal((await endpoint(request({action:"approve",id},"guest"))).status,403);
  const approved=await endpoint(request({action:"approve",id},"admin"));
  assert.equal(approved.status,200);
  assert.deepEqual(db._coll("players"),{});await simulateDeliveredReceipt(db,id);
  assert.equal((await endpoint(request({...payment,hash:"proof"},"admin"))).status,200);
  const {pid}=db._get("recruits/"+id);
  assert.equal(db._get("players/"+pid).value,1500);
  assert.equal(db._get("players/"+pid).team,null);
  assert.equal(db._get("players/"+pid).discord,id);
  const publicData = await (await endpoint(new Request("https://example.test/api/recruitment"))).json();
  assert.equal(publicData.rows.length,1);
  assert.equal(publicData.rows[0].riot,"Zeta#SUR");
  for(const key of ["pago","paid","motivo","sugerencias","dudas","verifiedBy"]) assert.equal(key in publicData.rows[0],false);
});

test("sugiere equipos por identidad vinculada, sin mover jugadores con roles ambiguos",()=>{
  const member={roles:["r1"],user:{id:"8",username:"uno"}};
  const doc=(id,data)=>({id,data:()=>data});
  const players=[doc("a",{name:"Uno",team:"orion"})],links=[doc("d_8",{pid:"a"})],teams={onyx:{role:"r1"},orion:{role:"r2"}};
  assert.match(rosterReview([{...member,roles:[]}],players,links,teams)[0].issue,/Sin rol/);
  assert.deepEqual(rosterReview([member],players,links,teams)[0].roles,["onyx"]);
  assert.match(rosterReview([{...member,roles:["r1","r2"]}],players,links,teams)[0].issue,/varios/);
  assert.equal(rosterReview([{...member,roles:["r2"]}],players,links,teams).length,0);
});

test("el desempate exige serie empatada y devuelve el mismo partido al rival",async()=>{
  const a={a:"onyx",b:"orion",fecha:4,status:"played",ra:13,rb:8};
  const db=fakeDb({"matches/ida":a,"matches/vuelta":{...a}});
  const who={captain:true,team:"onyx",uid:"cap1"};
  await assert.rejects(createTiebreak(db,db.doc("matches/ida"),who),{status:409});
  await db.doc("matches/vuelta").update({a:"orion",b:"onyx"});
  await assert.rejects(createTiebreak(db,db.doc("matches/ida"),{...who,team:"nexus"}),{status:403});
  const mid=await createTiebreak(db,db.doc("matches/ida"),who);
  assert.equal(await createTiebreak(db,db.doc("matches/vuelta"),{...who,team:"orion"}),mid);
  assert.equal(db._get("matches/"+mid).leg,"desempate");
});

test("una corrección mantiene la captura anterior y una aprobación bloquea su reemplazo",async()=>{
  admin.initializeApp();
  const db=globalThis.__db=fakeDb({"matches/m":{fecha:1,a:"onyx",b:"orion",status:"pending"},"captains/cap":{team:"onyx",u:"cap"}});
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>{throw new Error("offline")};
  const image="data:image/png;base64,iVBORw0KGgo=";
  const send=img=>resultEndpoint(new Request("https://example.test/api/results",{method:"POST",headers:{authorization:"Bearer cap"},body:JSON.stringify({action:"submit",mid:"m",ra:13,rb:8,img})}));
  try {
    assert.equal((await send(image)).status,200);
    assert.equal(db._get("resultimg/m_onyx").data,image);
    assert.equal((await send(null)).status,200);
    assert.equal(db._get("results/m_onyx").hasImg,true);
    await db.doc("results/m_onyx").update({status:"ok"});
    assert.equal((await send("data:image/jpeg;base64,YWJj")).status,409);
    assert.equal(db._get("resultimg/m_onyx").data,image);
  } finally {globalThis.fetch=originalFetch;}
});

test("OCR conserva celdas ilegibles y distingue homónimos por tag",()=>{
  const row=cleanRead({teams:[{players:[{name:"Nova#AR",k:null,d:0}]}]}).teams[0].players[0];
  assert.equal(row.k,null); assert.equal(row.d,0);
  const p=[{id:"a",name:"Nova",ign:"Nova#AR"},{id:"b",name:"Nova",ign:"Nova#CL"}];
  assert.equal(matchRows([row],p)[0].pid,"a");
  assert.equal(matchRows([{name:"Nova"}],p)[0].pid,null);
});


test("solicitud web, revisión privada y reintento sin alterar a un jugador fichado",async()=>{
  admin.initializeApp();
  const db=globalThis.__db=fakeDb({"staff/admin":{u:"admin",role:"staff"}});
  const req=(body,token)=>new Request("https://example.test/api/recruitment",{method:"POST",headers:token?{authorization:"Bearer "+token}:{},body:JSON.stringify(body)});
  const answers=Object.fromEntries(fields.map(([key])=>[key,"Sí"]));
  Object.assign(answers,{riot:"Prueba#AR1",principal:"Centinela",discord:"jugador",rango:"Platino 2",motivo:"Privado"});
  const user={id:"234567890123456789",username:"jugador"};
  process.env.DISCORD_CLIENT_SECRET="test-only";
  assert.equal((await endpoint(req({action:"apply",answers}))).status,401);
  const apply=()=>{const r=req({action:"apply",answers});r.headers.set("cookie",identityCookie(user,process.env.DISCORD_CLIENT_SECRET).split(";")[0]);return endpoint(r);};
  assert.equal((await apply()).status,201);
  assert.equal((await apply()).status,409);
  const [id]=Object.keys(db._coll("recruits"));
  assert.equal(db._get("recruits/"+id).status,"pending");
  assert.deepEqual(db._coll("players"),{});
  const approve=()=>endpoint(req({action:"approve",id},"admin"));
  const approved=await approve();
  assert.equal(approved.status,200);
  assert.deepEqual(db._coll("players"),{});await simulateDeliveredReceipt(db,id);
  assert.equal((await endpoint(req({action:"payment",id,paid:true,hash:"proof"},"admin"))).status,200);
  const {pid}=db._get("recruits/"+id), player=db._get("players/"+pid);
  assert.equal(player.value,1500); assert.equal(player.team,null); assert.equal(player.role,"Centinela");
  assert.equal(player.discord,user.id); assert.equal(player.recruitment.discord,"jugador");
  assert.equal(db._get("public/snapshot").json.includes("Privado"),false);
  assert.equal((await endpoint(req({action:"payment",id,paid:true},"admin"))).status,200);
  assert.equal(db._get("recruits/"+id).paid,true);
  await db.doc("players/"+pid).update({team:"orion",value:2500});
  assert.equal((await approve()).status,200);
  assert.equal(db._get("players/"+pid).value,2500);
  assert.equal(db._get("players/"+pid).team,"orion");
  assert.deepEqual((await (await endpoint(new Request("https://example.test/api/recruitment"))).json()).rows,[]);
});

test("un rechazo, un duplicado existente y una encuesta incompleta nunca crean jugadores",async()=>{
  admin.initializeApp();
  const db=globalThis.__db=fakeDb({"staff/admin":{u:"admin",role:"staff"},"players/a":{name:"Existente",ign:"Hielo#SUR",team:"onyx",value:3000}});
  const send=(body)=>endpoint(new Request("https://example.test/api/recruitment",{method:"POST",headers:{authorization:"Bearer admin"},body:JSON.stringify(body)}));
  assert.equal((await send({action:"apply",answers:{riot:"Hielo#SUR"}})).status,400);
  const id="123456789012345678";
  await db.doc("recruits/"+id).set({riot:"hielo#sur",discord:"nuevo",updated:1});
  assert.equal((await send({action:"approve",id})).status,409);
  assert.equal((await send({action:"reject",id})).status,200);
  assert.equal((await send({action:"approve",id})).status,409);
  assert.equal(db._get("recruits/"+id).status,"rejected");
  assert.deepEqual(Object.keys(db._coll("players")),["a"]);
});

test("una captura anticipada permanece privada y se recupera con el ID del desempate confirmado",async()=>{
  const first={a:"onyx",b:"orion",fecha:2,status:"pending"};
  const db=fakeDb({"matches/a":first,"matches/b":first}),cap={captain:true,team:"onyx",uid:"cap"};
  await assert.rejects(stageEvidence(db,db.doc("matches/a"),{...cap,team:"nexus"},"prueba"),{status:403});
  const id=await stageEvidence(db,db.doc("matches/a"),cap,"captura");
  assert.equal(db._get("matches/"+id),undefined);
  await db.doc("matches/a").update({status:"played",ra:13,rb:7});
  await db.doc("matches/b").update({status:"played",ra:8,rb:13});
  assert.equal(await createTiebreak(db,db.doc("matches/b"),cap),id);
  assert.equal(db._get("resultimg/"+id+"_onyx").data,"captura");
  assert.equal(db._get("resultimg/"+id+"_orion"),undefined);
});
