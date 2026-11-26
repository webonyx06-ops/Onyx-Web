import test from "node:test";
import assert from "node:assert/strict";
import api from "../netlify/functions/social.mjs";
import {base,collections,categories,entitled,bundlePrice,catalog,art} from "../public/js/catalogo.mjs";
import {fakeDb} from "./helpers/fakedb.mjs";
const uid="e_"+"a".repeat(24),pid="player";
process.env.FIREBASE_SERVICE_ACCOUNT=JSON.stringify({project_id:"test",client_email:"test",private_key:"test"});
function start(){globalThis.__db=fakeDb({["members/"+uid]:{pid},"players/player":{name:"T",ign:"Tona#ARG"},"teams/a":{coins:99},"perf/player":{pts:[{v:3000}]},"staff/admin":{u:"test",role:"ultra"}});return globalThis.__db;}
async function post(b,token=uid){const res=await api(new Request("https://test/api/social",{method:"POST",headers:{authorization:"Bearer "+token},body:JSON.stringify(b)}));return {status:res.status,...await res.json()};}
test("380 artículos estables, cuotas gratuitas y mínimos por colección",()=>{assert.equal(base.length,380);assert.equal(new Set(base.map(i=>i.id)).size,380);assert.deepEqual(catalog(),catalog());assert.deepEqual(Object.keys(categories).map(k=>base.filter(i=>i.category===k).length),[60,40,80,60,30,20,25,30,15,20]);for(const c of collections)for(const [k,n] of [["banner",3],["frame",2],["badge",4]])assert.equal(base.filter(i=>i.category===k&&i.collection===c).length,n);assert.ok(base.every(i=>art(i).startsWith("data:image/svg+xml")));});
test("paquete excluye compras previas y vencimiento conserva propiedad",()=>{const items=base.filter(i=>i.collection===collections[2]),i=items.find(x=>x.price&&x.premium);const w={owned:[i.id],until:1};assert.ok(entitled(i,w,100));assert.ok(!bundlePrice(items,w,15,100).ids.includes(i.id));assert.ok(!entitled(i,{until:1},100));});
test("canje atómico, reintento y moneda de equipo independiente",async()=>{const db=start(),b={action:"buy",product:"days30",requestId:"req1"};assert.equal((await post(b)).status,200);const until=db._get("socialprofiles/player").until;assert.equal((await post(b)).status,200);assert.equal(db._get("socialprofiles/player").until,until);const me=await post({action:"me"});assert.equal(me.saldo,2650);assert.equal(me.history.length,1);assert.equal(db._get("teams/a").coins,99);});
test("rechaza compras sin saldo, equipamiento ajeno y cambios administrativos",async()=>{const db=start();await db.doc("perf/player").set({pts:[]});assert.equal((await post({action:"buy",product:"days365",requestId:"r"})).status,409);assert.equal((await post({action:"equip",id:base.find(i=>i.price>0).id})).status,403);assert.equal((await post({action:"grant",pid,id:"banner-1"})).status,403);assert.equal((await post({action:"me"},"unknown")).status,401);});
test("perfil público filtra saldo, credenciales, recibos y cosméticos caducados",async()=>{const db=start(),i=base.find(i=>i.price&&i.premium);await db.doc("socialprofiles/player").set({bio:"Hola",until:1,discord:"123",gear:{[i.category]:i.id},owned:[],wish:["secret"],banner:"old",song:{name:"old"}});const {profile:p}=await (await api(new Request("https://test/api/social?pid=player"))).json();assert.equal(p.bio,"Hola");assert.deepEqual(p.gear,{});assert.equal(p.banner,"");assert.equal(p.song,null);assert.ok(!("discord" in p||"wish" in p||"owned" in p));});
test("moderación, métrica verificada y fuente del mismo jugador",async()=>{start();assert.equal((await post({action:"edit",bio:"Admin oficial"})).status,400);const b={action:"verifyStats",pid,metric:"kast",value:71,source:"https://tracker.gg/valorant/profile/riot/Tona%23ARG/overview"};assert.equal((await post(b,"admin")).status,200);assert.equal((await post({...b,source:b.source.replace("Tona","Otra")},"admin")).status,400);});

test("precio cambiante, promociones y paquetes sin repetir artículos permanentes",async()=>{const db=start(),i=base.find(x=>x.price&&!x.premiumOnly);const item={...i,action:"item",price:100,promoPrice:50,promoEnd:Date.now()+100000};assert.equal((await post(item,"admin")).status,200);
 const b={action:"buy",product:"item",id:i.id,expectedCost:100,requestId:"attempt"};assert.equal((await post(b)).status,409);assert.equal((await post({...b,expectedCost:50})).status,200);assert.equal((await post({...b,requestId:"later"})).status,200);
 assert.equal((await post({action:"me"})).saldo,2950);assert.ok(db._get("socialprofiles/player").owned.includes(i.id));});
test("reserva del capitán comparte saldo con el canje de cosméticos",async()=>{const db=start();await db.doc("captains/cap").set({team:"a",u:"Cap"});await db.doc("players/player").set({team:"a"},{merge:true});await db.doc("prizes/p").set({active:true,pts:2800,name:"Premio"});const b={action:"reservePrize",pid,prizeId:"p",expectedCost:2800,requestId:"test-order"};assert.equal((await post(b,"cap")).status,200);assert.equal((await post(b,"cap")).status,200);assert.equal((await post({action:"me"})).saldo,200);assert.equal((await post({action:"buy",product:"days30",requestId:"new"})).status,409);});
test("Premium caducado conserva ajustes para renovar y canjes permanentes",async()=>{const db=start(),i=base.find(x=>x.price&&x.premium);await db.doc("socialprofiles/player").set({until:1,title:"The Hunter",owned:[i.id],gear:{[i.category]:i.id}});let p=(await (await api(new Request("https://test/api/social?pid=player"))).json()).profile;assert.equal(p.title,"");assert.equal(p.gear[i.category],i.id);await post({action:"membership",pid,days:30},"admin");p=(await (await api(new Request("https://test/api/social?pid=player"))).json()).profile;assert.equal(p.title,"The Hunter");});
test("la carga del catálogo no modifica derechos y valida la imagen",async()=>{const db=start(),i=base[0];await post({action:"grant",pid,id:i.id},"admin");const edit={...i,action:"item",art:"data:image/png;base64,QUJD"};assert.equal((await post(edit,"admin")).status,400);delete edit.art;assert.equal((await post(edit,"admin")).status,200);assert.equal((await post(edit,"admin")).status,200);assert.equal(Object.keys(db._get("socialconfig/catalog").items).length,1);assert.deepEqual(db._get("socialprofiles/player").owned,[i.id]);});

test("rol Premium aplicado y retirado al expirar en Discord simulado",async()=>{const {syncPremium}=await import("../netlify/lib/premium-sync.mjs"),discord="123456789012345678",role="234567890123456789";process.env.DISCORD_ROLE_PREMIUM_ID=role;process.env.DISCORD_GUILD_ID="345678901234567890";const db=fakeDb({["members/d_"+discord]:{pid},"socialprofiles/player":{until:100,roleCheck:0}}),calls=[];const call=async(m,p)=>calls.push([m,p]);await syncPremium(db,50,call);await syncPremium(db,101,call);assert.deepEqual(calls.map(x=>x[0]),["PUT","DELETE"]);assert.ok(calls.every(x=>x[1].endsWith(discord+"/roles/"+role)));});
test("cada vista previa del catálogo base es distinta",()=>{assert.equal(new Set(base.map(art)).size,380);});

test("billetera de jugador, ajuste auditado, autorización y repetición",async()=>{const db=start(),b={action:"walletAdjust",pid,amount:200,reason:"Premio de fecha",requestId:"aj1"};assert.equal((await post(b)).status,403);assert.equal((await post(b,"admin")).status,200);assert.equal((await post(b,"admin")).repeated,true);let w=await post({action:"wallet",pid});assert.equal(w.available,3200);assert.equal(w.movements[0].label,"Premio de fecha");assert.equal((await post({...b,amount:-4000,requestId:"aj2"},"admin")).status,409);assert.equal((await post({action:"wallet",pid:"otro"})).status,403);assert.equal(db._get("teams/a").coins,99);});
test("el premio por partido se acredita una vez por acta y temporada",async()=>{const db=start();await db.doc("players/segundo").set({name:"Dos"});await db.doc("matches/m").set({a:"a",b:"b",fecha:1,status:"played",stats:{player:{t:"a"},segundo:{t:"b"}}});const b={action:"walletMatch",mid:"m",amount:25};assert.equal((await post(b,"admin")).count,2);assert.equal((await post(b,"admin")).repeated,true);assert.equal((await post({action:"wallet",pid})).available,3025);assert.equal(db._get("perf/segundo").pts[0].v,25);});
test("jugador libre pide premio con su saldo y no puede usar otra billetera",async()=>{const db=start();await db.doc("prizes/p").set({name:"Remera",active:true,pts:50});const b={action:"ownPrize",pid,prizeId:"p",requestId:"own1",expectedCost:50};assert.equal((await post({...b,pid:"otro"})).status,403);assert.equal((await post(b)).status,200);assert.equal((await post(b)).status,200);const w=await post({action:"wallet"});assert.equal(w.available,2950);assert.equal(w.reserved,50);assert.equal(w.spent,0);});

test("aprobar y repetir descuenta una unidad; rechazar devuelve la reserva",async()=>{const db=start();await db.doc("prizes/p").set({active:true,pts:50,stock:2,name:"Premio"});for(const requestId of ["p1","p2"]){assert.equal((await post({action:"ownPrize",pid,prizeId:"p",expectedCost:50,requestId})).status,200);}const b={action:"reviewPlayerPrize",id:"res_p1",ok:true};assert.equal((await post(b)).status,403);await post(b,"admin");await post(b,"admin");assert.equal(db._get("prizes/p").stock,1);await post({...b,id:"res_p2",ok:false},"admin");const w=await post({action:"wallet"});assert.equal(w.spent,50);assert.equal(w.reserved,0);assert.equal(w.available,2950);});
test("Studio separa borrador, propiedad y publicación. El canje es atómico y conserva el saldo del equipo",async()=>{
 const db=start(),pair=["frame","decoration"].map(c=>base.find(i=>i.category===c&&i.price&&!i.premiumOnly)),ids=pair.map(x=>x.id),cost=pair.reduce((s,i)=>s+i.price,0);
 assert.equal((await post({action:"draft",ids,slot:1})).status,200);
 assert.equal((await post({action:"equipSet",ids})).status,403);
 assert.equal((await post({action:"me"})).saldo,3000);
 const b={action:"buy",product:"outfit",expectedCost:cost,requestId:"test-studio",ids};
 assert.equal((await post(b)).status,200);assert.equal((await post(b)).status,200);
 assert.equal((await post({action:"equipSet",ids})).status,200);assert.equal((await post({action:"me"})).saldo,3000-cost);
 assert.equal(db._get("teams/a").coins,99);
});
test("catálogo precargado y precios administrativos independientes",async()=>{
 const {seedStore}=await import("../netlify/lib/store-init.mjs"),db=start();
 await db.doc("socialconfig/catalog").set({items:{"frame-1":{price:34}}});
 await seedStore(db);await seedStore(db);
 assert.equal(db._get("socialconfig/storeSeed").count,380);assert.equal(db._get("socialconfig/catalog").items["frame-1"].price,34);
});
test("el buscador filtra la licencia y el origen de la grabación",async()=>{
 const {musicSearch}=await import("../netlify/lib/music-search.mjs");
 const make=(license,id)=>({pageid:id,title:"File:Audio",imageinfo:[{url:"https://upload.wikimedia.org/a.ogg",mime:"audio/ogg",extmetadata:{LicenseShortName:{value:license}}}]});
 const fetcher=async()=>Response.json({query:{pages:[make("CC0",1),make("Reservada",2)]}});
 assert.deepEqual((await musicSearch({q:"coro"},fetcher)).map(x=>x.id),["1"]);
});
test("el reembolso documentado solo se aplica una vez y se comunica al jugador",async()=>{
 start();const i=base.find(x=>x.price&&!x.premiumOnly);await post({action:"buy",product:"item",id:i.id,requestId:"dev1"});
 const {rows}=await post({action:"orders"},"admin"),b={action:"refund",order:rows[0].id,reason:"Corrección"};
 assert.equal((await post(b)).status,403);assert.equal((await post(b,"admin")).status,200);assert.equal((await post(b,"admin")).status,200);
 assert.equal((await post({action:"me"})).saldo,3000);assert.equal((await post({action:"inbox"})).rows.length,2);
});
test("staff inspecciona pero no cambia saldos, precios ni premios externos",async()=>{
 const db=start();await db.doc("staff/lector").set({role:"staff",u:"staff",active:true});
 for(const b of [{action:"walletAdjust",pid,amount:100,reason:"Ajuste",requestId:"adjust"},{action:"setFeatured",ids:[]},{action:"externalList"},{action:"metrics"}])assert.equal((await post(b,"lector")).status,403);
 assert.equal((await post({action:"me"})).saldo,3000);
});
test("administración crea premio externo, controla versión y mantiene responsable privado",async()=>{
 const db=start();await db.doc("staff/operador").set({role:"admin",u:"operador",active:true});
 const b={action:"externalPrize",id:"premio",name:"Inscripción",price:250,stock:1,active:true,region:"Latinoamérica",assignee:"Turno tarde"};
 assert.equal((await post(b,"operador")).status,200);assert.equal(db._get("prizes/premio").assignee,undefined);
 assert.equal((await post({...b,stock:9},"operador")).status,409);
 assert.equal((await post({action:"externalList"},"operador")).items[0].assignee,"Turno tarde");
});
test("métricas agregadas deduplican pruebas y vistas sin gastar OC",async()=>{
 start();for(const kind of ["view","trial","view"])assert.equal((await post({action:"measure",id:"frame-1",kind})).status,200);
 const {rows}=await post({action:"metrics"},"admin");assert.deepEqual(rows,[{id:"frame-1",view:1,trial:1}]);assert.equal((await post({action:"me"})).saldo,3000);
});
test("recordatorio de vencimiento único, preferencias privadas y lectura individual",async()=>{
 const {premiumReminders}=await import("../netlify/lib/notices.mjs"),db=start(),now=Date.now();await db.doc("socialprofiles/player").set({until:now+10000});
 await premiumReminders(db,now);await premiumReminders(db,now+1);let r=await post({action:"inbox"});assert.equal(r.rows.length,1);assert.equal(r.unread,1);
 assert.equal((await post({action:"readOne",id:r.rows[0].id})).status,200);assert.equal((await post({action:"inbox"})).unread,0);
 await post({action:"noticePrefs",muted:["Premium"]});assert.equal((await post({action:"inbox"})).rows.length,0);
});
test("catálogo filtra color, animación y texto sin tildes y ordena por canjes",async()=>{
 const {matchesStyle,sortProducts}=await import("../public/js/store-filters.mjs"),a=base.find(x=>x.id==="frame-21"),b=base[0],now=Date.now();
 assert.ok(matchesStyle(a,{q:"orbita"},now)||matchesStyle(a,{q:"bastion"},now));assert.ok(matchesStyle(a,{color:"violeta",motion:"Animado"},now));assert.ok(!matchesStyle(a,{motion:"Estático"},now));assert.equal(sortProducts([a,b],"Popularidad",now,{[b.id]:3})[0].id,b.id);
});
test("Apple Music devuelve solo fichas reales y enlaces al servicio, sin audio promocional",async()=>{
 const {storeTracks}=await import("../netlify/lib/music-search.mjs");const fetcher=async()=>Response.json({results:[{kind:"song",trackId:321,trackName:"Grabación",artistName:"Intérprete",trackViewUrl:"https://music.apple.com/ar/album/321",trackTimeMillis:123000,previewUrl:"https://invalid.test/preview"}]});
 const [t]=await storeTracks({q:"intérprete"},fetcher);assert.equal(t.id,"apple-321");assert.equal(t.duration,123);assert.equal(t.audio,undefined);assert.deepEqual(await storeTracks({id:"apple-322"},fetcher),[]);
});
test("Staff consulta el catálogo completo; un visitante no ve los borradores nuevos",async()=>{
 const db=start();await db.doc("staff/lector").set({role:"staff",u:"staff",active:true});await db.doc("socialconfig/catalog").set({items:{interna:{...base[0],active:false,name:"Borrador"}}});
 const out=await(await api(new Request("https://test/api/social"))).json();assert.equal(out.config.items.interna,undefined);
 assert.equal((await post({action:"inspect"},"lector")).config.items.interna.name,"Borrador");assert.equal((await post({action:"inspect"})).status,403);
});
