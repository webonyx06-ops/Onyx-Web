import {playerWallet} from "../lib/player-wallet.mjs";
import {initAdmin} from "../lib/admin.mjs";
import {json,whoIs,readBody} from "../lib/auth.mjs";
import {patchSnapshot} from "../lib/publish.mjs";
import {catalog,defaults,categories,rarities,available,entitled,bundlePrice,salePrice} from "../../public/js/catalogo.mjs";
const reject=(msg,status=400)=>{throw Object.assign(new Error(msg),{status});};
const key=x=>typeof x==="string"&&/^[a-zA-Z0-9_-]{1,64}$/.test(x);
const short=(s,n)=>String(s||"").trim().slice(0,n);
const bounded=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
function cleanPicture(value){
 if(!value)return "";
 if(typeof value!=="string"||value.length>110000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))reject("La imagen debe ser PNG, JPEG o WebP de hasta 80 KB.");
 const [format,data]=value.split(","),buf=Buffer.from(data,"base64");
 if(!(format.includes("png")&&buf.subarray(0,8).toString("hex")==="89504e470d0a1a0a"||format.includes("jpeg")&&buf.subarray(0,3).toString("hex")==="ffd8ff"||format.includes("webp")&&buf.toString("ascii",0,4)==="RIFF"&&buf.toString("ascii",8,12)==="WEBP"))reject("Formato de imagen incorrecto.");
 return value;
}
function cleanText(x,n){const v=short(x,n);if(/admin|staff|verificad|moderador|oficial|[✔✓]/iu.test(v))reject("Ese texto puede confundirse con un cargo oficial.");return v;}
function visible(w,items,now){
 const premium=w.until>now,gear={};
 for(const [cat,id] of Object.entries(w.gear||{})){const i=items.find(x=>x.id===id);if(i?.category===cat&&entitled(i,w,now))gear[cat]=id;}
 return {gear,premium,extraBadges:premium?(w.extraBadges||[]).filter(id=>entitled(items.find(i=>i.id===id&&i.category==="badge"),w,now)).slice(0,3):[],animated:premium?w.animated||"":"",label:premium||w.studio?w.label||"":"",agents2:w.agents2||"",verified:w.verified||{},color:premium?w.color||"":"",intensity:w.intensity??50,bio:w.bio||"",photo:w.photo||"",title:premium||w.studio?w.title||"":"",banner:premium||w.studio?w.banner||"":"",song:premium||w.music?w.song||null:null};
}
function balance(perf,redeems){return Math.max(0,(perf.pts||[]).reduce((s,x)=>s+(Number(x.v)||0),0)-redeems.docs.map(x=>x.data()).filter(x=>!x.arch&&!x.coach&&x.method==="pts"&&["ok","pend"].includes(x.status)).reduce((s,x)=>s+(Number(x.pts)||0),0));}
export default async function handler(req){
 try{
 const admin=initAdmin(),db=admin.firestore(),cfg=db.doc("socialconfig/catalog"),now=Date.now();
 const url=new URL(req.url);
 if(req.method==="GET"){
 const asset=url.searchParams.get("art");if(asset){if(!key(asset))reject("Imagen inválida.");const img=(await db.doc("socialart/"+asset).get()).data()?.image;if(!img)reject("Imagen inexistente.",404);const [mime,data]=img.split(",");return new Response(Buffer.from(data,"base64"),{headers:{"content-type":mime.slice(5,-7),"cache-control":"public,max-age=86400","x-content-type-options":"nosniff"}});}
 const c=(await cfg.get()).data()||{},pid=url.searchParams.get("pid");
 if(!pid)return json(200,{config:c},{"cache-control":"public,max-age=0,s-maxage=30,stale-while-revalidate=30"});
 if(!key(pid))reject("Jugador inválido.");
 const [w,v]=await Promise.all([db.doc("socialprofiles/"+pid).get(),db.doc("valstats/"+pid).get()]);const ranked=v.data()||{};
 return json(200,{profile:visible(w.data()||{},catalog(c),now),ranked:{ign:ranked.ign||null,series:ranked.series||[],trend:ranked.trend||[]}});
 }
 if(req.method!=="POST")return json(405,{error:"Método inválido."});
 const who=await whoIs(req,admin);if(!who)reject("Entrá con tu cuenta.",401);
 const b=await readBody(req,250000),action=b.action;
 if(["wallet","walletAdjust","walletMatch"].includes(action)){const result=await playerWallet(db,who,b,admin.firestore.FieldValue,now);if(result.paths)await patchSnapshot(db,result.paths).catch(()=>{});return json(200,result);}
 if(action==="settings"||action==="pack"||action==="item"){
 if(!who.ultra)reject("Solo Ultra Admin.",403);
 if(action==="pack"){const ids=[...new Set(String(b.ids||"").split(/[ ,\n]+/).filter(Boolean))];if(!key(b.id)||!short(b.name,60)||!ids.length||ids.length>80||!bounded(b.discount,0,90))reject("Revisá el paquete.");await db.runTransaction(async tx=>{const current=(await tx.get(cfg)).data()||{},all=catalog(current);if(ids.some(id=>!all.some(i=>i.id===id)))reject("El paquete tiene IDs inexistentes.");tx.set(cfg,{packs:{[b.id]:{name:short(b.name,60),ids,discount:b.discount,active:!!b.active}}},{merge:true});});return json(200,{ok:true});}
 if(action==="settings"){
 const settings={};for(const [k,v] of Object.entries(defaults)){const n=b[k]??v;if(!bounded(n,0,k==="discount"?90:100000))reject("Precio o descuento inválido.");settings[k]=n;}
 await cfg.set({settings},{merge:true});return json(200,{ok:true});
 }
 if(!key(b.id)||!Object.hasOwn(categories,b.category)||!rarities.includes(b.rarity)||!bounded(b.price,0,100000)||!bounded(b.motif,0,19)||!bounded(b.variant,0,3)||!short(b.name,65)||!short(b.collection,50))reject("Revisá los datos del artículo.");
 const item={name:cleanText(b.name,65),collection:short(b.collection,50),description:short(b.description,140),category:b.category,rarity:b.rarity,motif:b.motif,variant:b.variant,price:b.price,premium:!!b.premium||!!b.premiumOnly,premiumOnly:!!b.premiumOnly,promoPrice:b.promoPrice==null?null:b.promoPrice,promoEnd:Number(b.promoEnd)||0,active:!!b.active,featured:!!b.featured,start:Number(b.start)||0,end:Number(b.end)||0};
 if(item.promoPrice!=null&&!bounded(item.promoPrice,0,item.price))reject("Precio promocional inválido.");if(item.end&&item.start>=item.end)reject("Revisá el período de venta.");
 const batch=db.batch();if(b.art){const image=cleanPicture(b.art);batch.set(db.doc("socialart/"+b.id),{image});item.artAt=now;}batch.set(cfg,{items:{[b.id]:item}},{merge:true});await batch.commit();return json(200,{ok:true});
 }
 if(action==="usage"){if(!who.ultra)reject("Solo Ultra Admin.",403);const [ws,rs]=await Promise.all([db.collection("socialprofiles").get(),db.collection("socialreceipts").get()]);return json(200,{profiles:ws.size,premium:ws.docs.filter(d=>d.data().until>now).length,orders:rs.size,spent:rs.docs.reduce((s,d)=>s+d.data().cost,0),errors:ws.docs.filter(d=>d.data().roleError).map(d=>({pid:d.id,error:d.data().roleError})).slice(0,50)});}
 if(action==="reviewPlayerPrize"){
 if(!who.staff)reject("Solo staff.",403);if(!key(b.id)||typeof b.ok!=="boolean")reject("Pedido inválido.");
 const paths=await db.runTransaction(async tx=>{
   const ref=db.doc("redeems/"+b.id),r=(await tx.get(ref)).data();
   if(!r||!r.pid||r.coach||r.method!=="pts")reject("Canje de jugador inexistente.",404);
   const status=b.ok?"ok":"no";
   if(r.status===status)return [];
   if(r.status!=="pend")reject("El pedido ya se revisó.",409);
   const paths=[ref.path];
   if(b.ok){
     const prize=db.doc("prizes/"+r.prizeId),p=(await tx.get(prize)).data();
     if(!p)reject("Ese premio ya no existe.",409);
     const perf=await tx.get(db.doc("perf/"+r.pid)),rs=await tx.get(db.collection("redeems").where("pid","==",r.pid));
     if(balance(perf.data()||{},{docs:rs.docs.filter(doc=>doc.id!==b.id)})<r.pts)reject("Saldo insuficiente.",409);
     if(p.stock!=null&&p.stock!==""){if(!Number.isInteger(+p.stock)||+p.stock<1)reject("Premio agotado.",409);tx.update(prize,{stock:+p.stock-1});paths.push(prize.path);}
   }
   tx.update(ref,{status,reviewedBy:who.u,reviewedAt:now,staffNote:short(b.note,140),delivered:false});
   tx.set(db.collection("audit").doc(),{at:now,uid:who.uid,u:who.u,role:who.role,txt:(b.ok?"Aprobó":"Rechazó")+" el canje "+b.id+" · "+r.prize});
   tx.set(db.doc("pubqueue/main"),{paths:admin.firestore.FieldValue.arrayUnion(...paths),at:now},{merge:true});return paths;
 });
 if(paths.length)await patchSnapshot(db,paths).catch(()=>{});
 return json(200,{ok:true});
 }
 if(action==="reservePrize"||action==="ownPrize"){
 const personal=action==="ownPrize";if(personal&&(!who.pid||who.pid!==b.pid))reject("Vinculá tu jugador para pedir este premio.",403);
 if(!personal&&(!who.captain||!who.team))reject("Solo capitanes con equipo.",403);if(!key(b.pid)||!key(b.prizeId)||!key(b.requestId))reject("Pedido inválido.");
 const player=db.doc("players/"+b.pid),social=db.doc("socialprofiles/"+b.pid),redeem=db.doc("redeems/res_"+b.requestId);
 await db.runTransaction(async tx=>{const [p,pr,perf,rs,previous,account]=await Promise.all([tx.get(player),tx.get(db.doc("prizes/"+b.prizeId)),tx.get(db.doc("perf/"+b.pid)),tx.get(db.collection("redeems").where("pid","==",b.pid)),tx.get(redeem),tx.get(social)]);
 if(previous.exists){if(previous.data().by!==who.uid||previous.data().pid!==b.pid)reject("Pedido inválido.");return;}
 if(personal){const m=(await tx.get(db.doc("members/"+who.uid))).data();if(!p.exists||m?.pid!==b.pid||m.banned)reject("Revisá tu vinculación.",403);}if(!personal&&p.data()?.team!==who.team)reject("El jugador ya no está en tu equipo.",403);const prize=pr.data();if(!prize?.active||!bounded(prize.pts,1,10000000)||(prize.stock!=null&&prize.stock!==""&&Number(prize.stock)<=0))reject("Premio no disponible.");
 if(prize.pts!==b.expectedCost||prize.pts>balance(perf.data()||{},rs))reject("Revisá el precio y el saldo disponible.",409);
 tx.set(social,{reserveAt:now},{merge:true});tx.set(redeem,{prizeId:b.prizeId,prize:short(prize.name,60),pid:b.pid,player:p.data().name||"",team:p.data().team||null,method:"pts",pts:prize.pts,usd:prize.usd??null,note:short(b.note,200),by:who.uid,u:who.u||p.data().name||"Jugador",at:now,status:"pend"});
 tx.set(db.doc("pubqueue/main"),{paths:admin.firestore.FieldValue.arrayUnion(redeem.path),at:now},{merge:true});});
 await patchSnapshot(db,[redeem.path]).catch(()=>{});return json(200,{ok:true});
 }
 const managing=["verifyStats","grant","moderate","membership"].includes(action);
 if(managing&&!who.ultra)reject("Solo Ultra Admin.",403);
 const pid=managing?b.pid:who.pid;if(!key(pid))reject("Vinculá primero tu cuenta con un jugador.",403);
 const ref=db.doc("socialprofiles/"+pid),receipt=key(b.requestId)?db.doc("socialreceipts/"+pid+"_"+b.requestId):null;
 let redeemPath=null;const result=await db.runTransaction(async tx=>{
 const [ws,cs,ps,rs,pl]=await Promise.all([tx.get(ref),tx.get(cfg),tx.get(db.doc("perf/"+pid)),tx.get(db.collection("redeems").where("pid","==",pid)),tx.get(db.doc("players/"+pid))]);if(!managing){const member=await tx.get(db.doc("members/"+who.uid));if(member.data()?.pid!==pid||member.data()?.banned)reject("La vinculación cambió.",403);}if(!pl.exists)reject("Jugador inexistente.",404);
 const w={owned:[],wish:[],gear:{},...ws.data()},c=cs.data()||{},settings={...defaults,...c.settings},items=catalog(c),i=items.find(x=>x.id===b.id),saldo=balance(ps.data()||{},rs),purchases=db.collection("socialreceipts").where("pid","==",pid);
 if(action==="me"){const h=await tx.get(purchases);return {w,saldo,history:h.docs.map(x=>x.data()).sort((a,b)=>b.at-a.at).slice(0,30),profile:visible(w,items,now)};}
 if(managing){
 if(action==="verifyStats"){const allowed=["adr","kast","hs","firstBloods","aces","clutches","rr"];if(!allowed.includes(b.metric)||!Number.isFinite(b.value)||b.value<0||b.value>(["hs","kast"].includes(b.metric)?100:9999)||!/^https:\/\/tracker\.gg\/valorant\/profile\/riot\//.test(b.source))reject("Indicá la métrica, el valor y su perfil de Tracker.");const proof=new URL(b.source);if(decodeURIComponent(proof.pathname.split("/")[4]||"").toLowerCase()!==String(pl.data().ign||"").toLowerCase())reject("El enlace debe corresponder al Riot ID del jugador.");w.verified={...w.verified,[b.metric]:{value:b.value,source:proof.href,at:now,ign:pl.data().ign}};}
 if(action==="moderate")Object.assign(w,{animated:"",label:"",photo:"",bio:"",song:null,title:"",banner:""});
 if(action==="membership"){if(!bounded(b.days,0,365))reject("Duración inválida.");w.until=b.days?now+b.days*86400000:0;}
 if(action==="grant"){if(!i)reject("Artículo desconocido.");w.owned=[...new Set([...w.owned,i.id])];}
 tx.set(db.collection("audit").doc(),{at:now,uid:who.uid,u:who.u,role:"ultra",txt:action+" · "+pid+" · "+(i?.name||b.days||"")});
 }else if(action==="wish"){if(!i)reject("Artículo desconocido.");w.wish=b.on?[...new Set([...w.wish,i.id])]:w.wish.filter(id=>id!==i.id);}
 else if(action==="extra"){if(w.until<=now||!w.until||!i||i.category!=="badge"||!entitled(i,w,now))reject("Requiere Premium e insignia disponible.",403);const old=w.extraBadges||[];w.extraBadges=old.includes(i.id)?old.filter(k=>k!==i.id):[...old.filter(k=>k!==i.id),i.id].slice(-3);}
 else if(action==="equip"){if(!i||!entitled(i,w,now))reject("Artículo sin desbloquear.",403);w.gear[i.category]=i.id;}
 else if(action==="edit"){
 w.agents2=short(b.agents2,100);w.intensity=bounded(b.intensity,0,100)?b.intensity:50;w.bio=cleanText(b.bio,280);if(b.photo!==undefined)w.photo=cleanPicture(b.photo);
 if(w.until>now&&b.animated!==undefined){if(b.animated&&(!/^data:image\/gif;base64,R0lGOD[lh]/.test(b.animated)||b.animated.length>110000))reject("Usá un GIF de hasta 80 KB.");w.animated=b.animated;}
 if(w.until>now||w.studio){w.label=cleanText(b.label,28);w.color=/^#[a-f0-9]{6}$/i.test(b.color||"")?b.color:"";w.title=cleanText(b.title,45);if(b.banner!==undefined)w.banner=cleanPicture(b.banner);}
 if(w.music||w.until>now){if(b.audio&&!/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/[a-f0-9]\/[a-f0-9]{2}\/[^\s?#]+\.(ogg|mp3|wav)$/i.test(b.audio))reject("Usá un audio de Wikimedia Commons.");w.song=b.audio?{audio:short(b.audio,450),name:short(b.song,70),artist:short(b.artist,70),cover:/^https:\/\/upload\.wikimedia\.org\/[^\s?#]+\.(jpg|png|webp)$/i.test(b.cover||"")?short(b.cover,450):""}:null;}
 }else if(action==="buy"){
 if(!receipt)reject("Falta identificar la compra.");if((await tx.get(receipt)).exists)return {ok:true};
 let cost=0,label="";
 if(b.product==="item"){if(!i||i.premiumOnly||!available(i,now))reject("Artículo fuera de venta.");if(w.owned.includes(i.id))return {ok:true};cost=salePrice(i,now);label=i.name;w.owned.push(i.id);}
 else if(b.product==="pack"){const pack=c.packs?.[b.id];if(!pack?.active)reject("Paquete inactivo.");const q=bundlePrice(items.filter(x=>pack.ids.includes(x.id)),w,pack.discount,now);if(!q.ids.length)reject("Ya tenés los artículos disponibles.");w.owned.push(...q.ids);cost=q.cost;label=pack.name;}
 else if(b.product==="bundle"){const q=bundlePrice(items.filter(x=>x.collection===b.collection),w,settings.discount,now);if(!q.ids.length)reject("Ya tenés la colección disponible.");w.owned.push(...q.ids);cost=q.cost;label=b.collection;}
 else if(["days30","days90","days365"].includes(b.product)){cost=settings[b.product];const days=Number(b.product.slice(4));w.until=Math.max(now,w.until||0)+days*86400000;label="ONYX Premium · "+days+" días";}
 else if(b.product==="studio"){if(w.studio)return {ok:true};cost=settings.studio;w.studio=true;label="Editor de banner, título y etiqueta";}
 else if(b.product==="music"){if(w.music)return {ok:true};cost=settings.music;w.music=true;label="Música de perfil";}
 else if(b.product==="discord"){if(!who.discord)reject("Entrá con Discord para solicitar el rol.");cost=settings.discord;label="Rol personalizado y canal exclusivo";}
 else reject("Producto desconocido.");
 if(b.expectedCost!=null&&cost!==b.expectedCost)reject("El precio cambió. Actualizá la tienda y confirmá el nuevo importe.",409);if(cost>saldo)reject("Saldo individual insuficiente.",409);
 const row={pid,at:now,label,cost};tx.set(receipt,row);
 if(cost||b.product==="discord"){const redeem=db.collection("redeems").doc();redeemPath=redeem.path;tx.set(db.doc("pubqueue/main"),{at:now,paths:admin.firestore.FieldValue.arrayUnion(redeem.path)},{merge:true});tx.set(redeem,{pid,player:pl.data().name||"",team:pl.data().team||null,prize:label,prizeId:"social-"+b.product,pts:cost,method:"pts",status:"ok",delivered:b.product!=="discord",at:now});}
 }else reject("Acción desconocida.");
 if(w.until!==ws.data()?.until){const linked=who.pid===pid?who.discord:null;if(linked)w.discord=linked;w.roleCheck=0;}
 tx.set(ref,w);return {ok:true};
 });
 if(redeemPath)await patchSnapshot(db,[redeemPath]).catch(()=>{});
 return json(200,result);
 }catch(e){if(!e.status)console.error("social",e.message);return json(e.status||500,{error:e.status?e.message:"No se pudo guardar o consultar el perfil."});}
}
export const config={path:"/api/social"};
