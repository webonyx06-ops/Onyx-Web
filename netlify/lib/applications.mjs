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

export async function submitApplication(db, row, discordId) {
  const id = discordId || "web_"+digest(row.riot);
  const ref = db.doc("recruits/"+id);
  await db.runTransaction(async tx=>{
    const previous = (await tx.get(ref)).data();
    if (previous?.status === "approved") fail(409,"La ficha ya fue aprobada. Pedile al staff cualquier cambio.");
    // Un formulario anónimo nunca puede editar la solicitud de otra persona.
    if (previous && !discordId) fail(409,"Ya recibimos una solicitud para ese Riot ID. Contactá al staff para corregirla.");
    const now = Date.now();
    tx.set(ref,{...row,status:"pending",source:discordId?"discord":"web",updated:now,created:previous?.created || now},{merge:true});
  });
}

export async function decideApplication(db,id,action,staff) {
  if (!validId(id)) fail(400,"Solicitud inválida.");
  const ref = db.doc("recruits/"+id);
  return db.runTransaction(async tx=>{
    const row = (await tx.get(ref)).data();
    if (!row) fail(404,"La solicitud ya no existe.");
    if (row.status === "approved" && action === "approve") return row.pid;
    if (row.status && row.status!=="pending") fail(409,"Otro administrador ya resolvió la solicitud.");
    const review = {reviewedAt:Date.now(),reviewedBy:staff.uid};
    if (action==="reject") { tx.update(ref,{...review,status:"rejected"}); return null; }
    const riot = splitRiot(row.riot);
    if (!riot) fail(400,"El Riot ID de la solicitud necesita una corrección.");
    const pid = "p_"+digest(row.riot), players = await tx.get(db.collection("players"));
    if (players.docs.some(d=>d.id===pid || norm(d.data().ign)===norm(row.riot) ||
      (d.data().recruitment?.discord && norm(d.data().recruitment.discord).replace(/^@/,"")===norm(row.discord).replace(/^@/,"")) ||
      (d.data().discord && [norm(id),norm(row.discord).replace(/^@/,"")].includes(norm(d.data().discord).replace(/^@/,""))))) fail(409,"Ya existe un jugador con esa identidad. Revisá su ficha en Jugadores.");
    const role = ["Duelista","Iniciador","Controlador","Centinela","Flex","Suplente"].find(x=>norm(x)===norm(row.principal)) || "Flex";
    tx.set(db.doc("players/"+pid),{name:riot.name,ign:row.riot,team:null,role,rank:row.rango,value:baseValue,clause:0,
      recruitment:profile(row),...(/^\d+$/.test(id)?{discord:id}:{})});
    tx.update(ref,{...review,status:"approved",pid});
    tx.set(db.doc("pubqueue/main"),{paths:admin.firestore.FieldValue.arrayUnion("players/"+pid),at:review.reviewedAt},{merge:true});
    tx.set(db.collection("audit").doc(),{at:review.reviewedAt,uid:staff.uid,u:staff.u,role:staff.role,txt:"Aprobó a "+row.riot+" como agente libre por 1.500 ONYX Coins."});
    return pid;
  });
}
