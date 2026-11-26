import {test} from "node:test";
import assert from "node:assert/strict";
import {base} from "../public/js/catalogo.mjs";
import {profileCard} from "../public/js/profile-card.mjs";
const registry=new Map();
globalThis.HTMLElement=class {};
globalThis.customElements={define:(k,c)=>registry.set(k,c)};
globalThis.IntersectionObserver=class {};
globalThis.document={addEventListener(){}};
globalThis.localStorage={getItem(){return null;}};
const p={name:"Jugador de prueba",rank:"Platino",role:"Iniciador",ign:"Prueba#QA"};
globalThis.window={onyxProfiles:{me:()=>"p",player:()=>p,players:()=>[]},onyxWallet:{identity:()=>({staff:false})}};
await import("../public/js/store.mjs");
function screen(){const s=new (registry.get("onyx-store"))();Object.assign(s,{items:base,w:{owned:[]},view:{gear:{}},gear:{},config:{},balance:1000,f:{},tab:"Explorar",mode:"Perfil",activity:new Set(),dialog:{classList:{toggle(){}},showModal(){this.open=true;}}});return s;}
test("probador combina sobre la misma identidad que el perfil y mantiene las estadísticas en vista de capitán",()=>{
 const s=screen();s.gear={frame:"frame-13",banner:"banner-12",decoration:"decoration-9"};s.detail();
 assert.ok(s.dialog.innerHTML.includes(profileCard(p,s.view,base,s.gear)));assert.ok(s.dialog.innerHTML.includes(p.ign));
 s.mode="Capitán";s.detail();assert.ok(s.dialog.innerHTML.includes(profileCard(p,s.view,base,s.gear,true)));assert.ok(s.dialog.innerHTML.includes("Platino"));assert.deepEqual(s.w.owned,[]);
});
test("las 380 fichas se pueden previsualizar con el perfil y las 20 colecciones calculan su progreso",()=>{
 const s=screen();for(const i of base){s.selected=i.id;s.gear={[i.category]:i.id};s.detail();assert.ok(s.dialog.innerHTML.includes(i.name));}
 for(const c of new Set(base.map(i=>i.collection))){s.f.collection=c;assert.ok(s.collectionInfo().includes("en propiedad"));}
});
test("el catálogo preserva el filtro de lista de deseos al filtrar por categoría",()=>{
 const s=screen();s.tab="Lista de deseos";s.w.wish=["frame-12","banner-13"];s.category="frame";assert.deepEqual(s.filtered().map(x=>x.id),["frame-12"]);
});
