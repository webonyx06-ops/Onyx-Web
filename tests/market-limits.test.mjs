import assert from "node:assert/strict";
import test from "node:test";
import {fakeDb} from "./helpers/fakedb.mjs";
import {market} from "../netlify/functions/market.mjs";

const captain={uid:"cap",captain:true,team:"onyx"},staff={uid:"admin",u:"Liga",staff:true,role:"staff"};
function setup(source,buyer){
  const data={"league/config":{maxSign:2,rosterMax:12,rosterMin:0,windowId:1},"players/free":{team:null,value:100,name:"Libre"}};
  for(const [team,count] of [["orion",source],["onyx",buyer]]){
    for(let n=0;n<count;n++)data["players/"+team+n]={name:team+n,team,value:100};
  }
  return fakeDb(data);
}
const submit=(db,pid)=>market(db,captain,{action:"submit",key:pid,pid,amt:100});
const confirm=(db,pid)=>market(db,staff,{action:"confirm",key:pid,owner:captain.uid});
test("tercer fichaje permitido; al pasar de seis a cinco y de seis a siete se cierran ambos cupos",async()=>{
  const db=setup(6,6);
  for(const id of ["old1","old2"])await db.doc("transfers/"+id).set({to:"onyx",win:1});
  await submit(db,"orion0");await confirm(db,"orion0");
  assert.equal(db._get("players/orion0").team,"onyx");
  await assert.rejects(submit(db,"free"),/siete/);
  for(const count of [4,5])await assert.rejects(submit(setup(count,3),"orion0"),/cinco/);
});
test("la confirmación vuelve a contar los planteles con ofertas pendientes",async()=>{
  const db=setup(6,2);
  await submit(db,"orion0");await submit(db,"orion1");
  await confirm(db,"orion0");await assert.rejects(confirm(db,"orion1"),/cinco/);
  const last=setup(7,6);
  await submit(last,"free");await submit(last,"orion0");await confirm(last,"free");
  await assert.rejects(confirm(last,"orion0"),/siete/);
  assert.equal(Object.keys(last._coll("transfers")).length,1);
});
test("solo ultra reinicia el período una vez, conservando ofertas, planteles y saldos",async()=>{
  const db=setup(6,2);
  await submit(db,"orion0");await confirm(db,"orion0");await submit(db,"free");
  await db.doc("league/config").update({windowOpen:false,windowClose:"2026-12-01"});
  const before=["offers","transfers","players","teams"].map(k=>db._coll(k));
  const body={action:"resetWindow",windowId:1},ultra={...staff,ultra:true,role:"ultra"};
  for(const me of [staff,captain])await assert.rejects(market(db,me,body),{status:403});
  await market(db,ultra,body);await assert.rejects(market(db,ultra,body),{status:409});
  const cfg=db._get("league/config");assert.equal(cfg.windowId,2);assert.equal(cfg.windowOpen,true);assert.equal(cfg.windowClose,"");
  assert.deepEqual(["offers","transfers","players","teams"].map(k=>db._coll(k)),before);
  await confirm(db,"free");
});
