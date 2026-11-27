import test from "node:test";
import assert from "node:assert/strict";
import {advance} from "../netlify/functions/map-veto.mjs";
test("BO3 congela turnos, rechaza repetidos y determina mapa neutral y lados",()=>{
 const pool=["a","b","c","d","e","f","g"];
 const s={a:"local",b:"visita",remaining:[...pool],pool,picks:[],sides:[],history:[]};
 assert.throws(()=>advance(s,"visita","a",0),{status:403});
 advance(s,"local","a",0);
 assert.throws(()=>advance(s,"visita","a",1),{status:409});
 assert.throws(()=>advance(s,"visita","b",0),{status:409});
 for(const [team,value] of [["visita","b"],["local","c"],["visita","Ataque"],["visita","d"],["local","Defensa"],["local","e"],["visita","f"],["local","Ataque"]])advance(s,team,value,s.history.length);
 assert.deepEqual(s.picks,["c","d","g"]);assert.equal(s.sides.length,3);assert.equal(pool.length,7);
 assert.throws(()=>advance(s,"local","g",9),{status:409});
});
import endpoint from "../netlify/functions/map-veto.mjs";
import admin from "firebase-admin";
import {fakeDb} from "./helpers/fakedb.mjs";
test("reloj persistido: espectador, vencimiento, permisos y reanudación",async()=>{
 admin.initializeApp();const db=globalThis.__db=fakeDb();
 for(const [path,data] of Object.entries({
 "matches/first":{fecha:2,a:"uno",b:"dos",leg:"ida"},"matches/second":{fecha:2,a:"dos",b:"uno",leg:"vuelta"},
 "league/config":{maps:[..."ABCDEFG"].map(n=>({n}))},"captains/cap":{team:"uno"},"staff/admin":{role:"admin"},
 "members/e_000000000000000000000000":{role:"player"}
 }))await db.doc(path).set(data);
 const act=(action,uid="cap",value)=>endpoint(new Request("https://example.test/api/map-veto",{method:"POST",headers:{authorization:"Bearer "+uid},body:JSON.stringify({action,mid:"first",revision:0,value})}));
 const started=await (await act("start")).json();assert.ok(started.deadline>started.serverNow);
 const member="e_000000000000000000000000";
 assert.equal((await (await act("read",member)).json()).deadline,started.deadline);
 assert.equal((await act("move",member,"A")).status,403);
 const key=Object.keys(db._coll("mapvetos"))[0];await db.doc("mapvetos/"+key).update({deadline:1});
 assert.equal((await act("move","cap","A")).status,409);
 assert.equal((await act("resume","cap")).status,403);
 assert.equal((await act("resume","admin")).status,200);
 assert.equal((await act("move","cap","A")).status,200);
});
