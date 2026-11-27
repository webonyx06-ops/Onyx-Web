import {queue} from "./community-sync.mjs";
import { enqueue } from "./recruit-delivery.mjs";
import { createHash } from "node:crypto";
import { admin } from "./admin.mjs";
import { fields, profile } from "./survey-fields.mjs";
import { splitRiot } from "./valstats.mjs";

export const baseValue = 1500;
export const validId = id => typeof id === "string" && /^(?:\d{15,22}|web_[a-f0-9]{32})$/.test(id);
const norm = value => String(value || "").normalize("NFKC").trim().toLowerCase();
const digest = text => createHash("sha256").update(norm(text)).digest("hex").slice(0,32);
const fail = (status,message) => { throw Object.assign(new Error(message),{status}); };

export function readAnswers(input) {
  const row = {};
  for (const [key,label] of [["discord","Discord"],...fields]) {
    const value = input?.[key] ?? "";
    if (typeof value !== "string" || value.length > (key==="motivo"?600:220)) fail(400,"Revisá el campo "+label+".");
    row[key] = value.trim();
    if (!row[key] && !["dudas","sugerencias"].includes(key)) fail(400,"Completá el campo "+label+".");
  }
  const id = splitRiot(row.riot);
  if (!id || /[\r\n]/.test(row.riot)) fail(400,"Escribí tu Riot ID como Nombre#TAG.");
  row.riot = id.name.trim()+"#"+id.tag;
  if (![row.capitan,row.pago].every(x=>["si","sí","no"].includes(norm(x)))) fail(400,"Elegí Sí o No para capitanía y pago.");
  return row;
}

export async function submitApplication(db, row, discordId, {source=discordId?"discord":"web",receipt=null}={}) {
  const id = discordId || "web_"+digest(row.riot);
  const ref = db.doc("recruits/"+id);
  await db.runTransaction(async tx=>{
    const previous = (await tx.get(ref)).data();
    if (previous?.status === "approved") fail(409,"La ficha ya fue aprobada. Pedile al staff cualquier cambio.");
    // Un formulario anónimo nunca puede editar la solicitud de otra persona.
    if (previous && source==="web") fail(409,"Ya recibimos una solicitud para ese Riot ID. Contactá al staff para corregirla.");
    const priorInvite=discordId && (await tx.get(db.doc("recruitjobs/invite_"+id))).exists;
    if(discordId && !priorInvite) enqueue(tx,db,"invite",id,discordId);
    const now = Date.now();
    if(receipt)fail(409,"Esperá la aceptación de tu solicitud.");
    tx.set(ref,{...row,feeCurrency:"ARS",feeAmount:3000,...(discordId?{discordId}:{}),...(receipt?{receiptState:"pending",receiptCount:1}:{}),status:"pending",source,updated:now,created:previous?.created || now},{merge:true});
  });
  return id;
}

export async function decideApplication(db,id,action,staff) {
  if (!validId(id)) fail(400,"Solicitud inválida.");
  const ref = db.doc("recruits/"+id);
  return db.runTransaction(async tx=>{
    const row = (await tx.get(ref)).data();
    if (!row) fail(404,"La solicitud ya no existe.");
    if(action==="verify" || action==="denyReceipt"){
      if(!staff.staff || row.status!=="approved")fail(409,"Primero aceptá la solicitud.");
      if(row.paid && action==="verify")return row.pid;
      const job=(await tx.get(db.doc("recruitjobs/receipt_"+id))).data();
      if(row.paid || row.receiptState!=="sent" || !job?.hash || job.hash!==staff.receiptHash || row.paymentState==="rejected")fail(409,"Recargá el comprobante vigente antes de decidir.");
      const history=db.collection("paymenthistory").doc();
      if(action==="denyReceipt"){
        tx.update(ref,{paid:false,paymentState:"rejected"});
        tx.set(history,{id,hash:job.hash,method:row.method||null,decision:"rejected",by:staff.uid,at:Date.now()});return null;
      }
      const recipient=row.discordId || (/^\d+$/.test(id)?id:null);
      if(!recipient)fail(409,"Vinculá el Discord antes de verificar.");
      const riot=splitRiot(row.riot),pid=row.pid || "p_"+digest(row.riot);
      const player=(await tx.get(db.doc("players/"+pid))).data();
      const hasInvite=(await tx.get(db.doc("recruitjobs/invite_"+id))).exists;
      const players=await tx.get(db.collection("players"));
      if(players.docs.some(d=>d.id!==pid && (norm(d.data().ign)===norm(row.riot)||d.data().discord===recipient)))fail(409,"Ya existe una ficha con esa identidad.");
      if(player && row.pid!==pid)fail(409,"Ya existe ese jugador.");
      if(!player)tx.set(db.doc("players/"+pid),{name:riot.name,ign:row.riot,joinedAt:Date.now(),team:null,rank:row.rango,role:["Duelista","Iniciador","Controlador","Centinela","Flex","Suplente"].find(v=>norm(v)===norm(row.principal))||"Flex",value:baseValue,clause:0,recruitment:profile(row),discord:recipient,recruitId:id});
      else tx.update(db.doc("players/"+pid),{recruitId:id,discord:recipient,marketEligible:true});
      tx.set(history,{id,hash:job.hash,method:row.method||null,decision:"verified",by:staff.uid,at:Date.now()});
      tx.update(ref,{pid,paid:true,flowVersion:2,paymentState:"verified",verifiedBy:staff.u,verifiedAt:Date.now()});
      if(!hasInvite)enqueue(tx,db,"invite",id,recipient);
      queue(tx,db,"roles_"+pid,"roles",{rid:id,pid});
      if(!player?.team)queue(tx,db,"free_"+pid,"free",{rid:id,pid,version:player?.marketVersion||0});
      tx.set(db.doc("pubqueue/main"),{paths:admin.firestore.FieldValue.arrayUnion("players/"+pid),at:Date.now()},{merge:true});return pid;
    }
    if (row.status === "approved" && action === "approve") return row.pid || null;
    if (row.status && row.status!=="pending") fail(409,"Otro administrador ya resolvió la solicitud.");
    const review = {reviewedAt:Date.now(),reviewedBy:staff.uid};
    if (action==="reject") { tx.update(ref,{...review,status:"rejected"}); return null; }
    const riot = splitRiot(row.riot);
    if (!riot) fail(400,"El Riot ID de la solicitud necesita una corrección.");
    const pid = "p_"+digest(row.riot), players = await tx.get(db.collection("players"));
    if (players.docs.some(d=>d.id===pid || norm(d.data().ign)===norm(row.riot) ||
      (d.data().recruitment?.discord && norm(d.data().recruitment.discord).replace(/^@/,"")===norm(row.discord).replace(/^@/,"")) ||
      (d.data().discord && [norm(id),norm(row.discord).replace(/^@/,"")].includes(norm(d.data().discord).replace(/^@/,""))))) fail(409,"Ya existe un jugador con esa identidad. Revisá su ficha en Jugadores.");
    tx.update(ref,{...review,status:"approved",flowVersion:2,paymentState:"pending"});
    tx.set(db.collection("audit").doc(),{at:Date.now(),uid:staff.uid,u:staff.u,role:staff.role,txt:"Aceptó la postulación de "+row.riot});
    return null;
  });
}
