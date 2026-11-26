import {notice} from "./notices.mjs";
const fail=(status,msg)=>{throw Object.assign(new Error(msg),{status});};
const valid=s=>typeof s==="string"&&/^[\w-]{1,100}$/.test(s);
const clean=(s,max)=>String(s??"").trim().slice(0,max);
export async function commerce(db,who,b,now,fv){
 const admin=who.staff&&(who.ultra||who.role==="admin");
 if(!admin)fail(403,"Se requiere administración.");
 if(b.action==="externalPrize"){
  if(!valid(b.id)||!clean(b.name,60)||!Number.isSafeInteger(b.price)||b.price<=0||!Number.isSafeInteger(b.stock)||b.stock<0)fail(400,"Revisá nombre, precio y stock.");
  const image=clean(b.image,500);if(image&&!/^https:\/\/[^\s<>"]+$/.test(image))fail(400,"La imagen debe usar HTTPS.");
  const ref=db.doc("prizes/"+b.id),data={name:clean(b.name,60),description:clean(b.description,400),pts:b.price,stock:b.stock,region:clean(b.region,60),conditions:clean(b.conditions,400),delivery:clean(b.delivery,140),image,active:b.active===true,external:true};
  await db.runTransaction(async tx=>{const old=(await tx.get(ref)).data();if(old&&!old.external)fail(409,"Ese identificador ya corresponde a otro premio.");if(old&&(b.version??0)!==(old.version??0))fail(409,"El premio cambió. Actualizá la vista.");tx.set(ref,{...data,version:(old?.version||0)+1},{merge:true});tx.set(db.doc("externalstaff/"+b.id),{assignee:clean(b.assignee,80)},{merge:true});tx.set(db.collection("audit").doc(),{at:now,uid:who.uid,u:who.u,role:who.role,txt:"Actualizó premio externo "+b.id});tx.set(db.doc("pubqueue/main"),{at:now,paths:fv.arrayUnion(ref.path)},{merge:true});});
  return {ok:true};
 }
 if(b.action==="externalList"){const [pr,privateData]=await Promise.all([db.collection("prizes").get(),db.collection("externalstaff").get()]);const assignees=new Map(privateData.docs.map(d=>[d.id,d.data().assignee]));return {items:pr.docs.filter(d=>d.data().external).map(d=>({id:d.id,...d.data(),assignee:assignees.get(d.id)||""}))};}
 if(!valid(b.id))fail(400,"Canje inválido.");const ref=db.doc("redeems/"+b.id);
 await db.runTransaction(async tx=>{const r=(await tx.get(ref)).data();if(!r||r.status!=="ok"||!r.pid||!r.prizeId||r.arch)fail(409,"El canje debe estar aprobado.");if(r.delivered)return;
 tx.update(ref,{delivered:true,deliveredAt:now,deliveredBy:who.uid});notice(tx,db,r.pid,b.id+"delivery","Premios","Premio entregado · "+r.prize,"canjes",now);tx.set(db.collection("audit").doc(),{at:now,uid:who.uid,u:who.u,role:who.role,txt:"Confirmó entrega "+b.id});tx.set(db.doc("pubqueue/main"),{at:now,paths:fv.arrayUnion(ref.path)},{merge:true});});return {ok:true};
}
