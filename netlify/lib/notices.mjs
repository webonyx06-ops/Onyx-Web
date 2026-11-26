import {createHash} from "node:crypto";
export function notice(tx,db,pid,event,kind,text,route,at=Date.now()){
 const id=createHash("sha256").update(pid+"/"+event).digest("hex").slice(0,32);
 tx.set(db.doc("playernotices/"+id),{pid,kind,text,route,at},{merge:true});
}
export async function premiumReminders(db,now=Date.now()){
 const until=now+3*86400000;
 const due=await db.collection("socialprofiles").where("until",">",now).where("until","<=",until).get();
 for(const doc of due.docs)await db.runTransaction(async tx=>{
  const w=(await tx.get(doc.ref)).data();if(!w||w.until<=now||w.until>until||w.notifiedUntil===w.until)return;
  notice(tx,db,doc.id,"expiry-"+w.until,"Premium","Tu membresía vence el "+new Date(w.until).toLocaleDateString("es-AR",{timeZone:"America/Argentina/Buenos_Aires"}),"premios",now);
  tx.update(doc.ref,{notifiedUntil:w.until});
 });
}
