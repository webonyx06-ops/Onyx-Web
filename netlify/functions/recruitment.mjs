import { initAdmin } from "../lib/admin.mjs";
import { json, whoIs, readBody } from "../lib/auth.mjs";
import { env, api } from "../lib/discord.mjs";
import { signupLimit } from "../lib/coaching.mjs";
import { patchSnapshot } from "../lib/publish.mjs";
import { decideApplication, readAnswers, submitApplication, validId } from "../lib/applications.mjs";
import { profile } from "../lib/survey-fields.mjs";

const snowflake = id => /^\d{15,22}$/.test(id || "");
export function rosterReview(members, players, links, teams) {
  const review = [];
  for (const member of members) {
    if (member.user.bot) continue;
    const roles = Object.entries(teams).filter(([,t]) => t.role && member.roles.includes(t.role)).map(([key])=>key);

    const id = member.user.id, username = member.user.username;
    const linked = links.find(doc=>doc.id === "d_"+id)?.data()?.pid;
    const verified = linked ? players.filter(p=>p.id===linked) : players.filter(p=>[id,username.toLowerCase()].includes(String(p.data().discord || "").replace(/^@/,"").toLowerCase()));
    const hits = verified.length || linked ? verified : players.filter(p=>String(p.data().recruitment?.discord || "").replace(/^@/,"").toLowerCase()===username.toLowerCase());
    const p = hits.length === 1 ? hits[0] : null;
    if (!roles.length && !p?.data().team) continue;
    if (roles.length === 1 && p?.data().team === roles[0]) continue;
    review.push({pid:p?.id || "",discord:username,player:p?.data().name || "",actual:p?.data().team || "",roles,
      issue:!p ? "Revisar vínculo de Discord" : !roles.length ? "Sin rol de equipo en Discord" : roles.length !== 1 ? "Tiene varios roles de equipo" : "Revisar equipo en Jugadores"});
  }
  return review;
}
export default async function(req) {
  try {
    const db = initAdmin().firestore();
    if (req.method === "GET") {
      const list = await db.collection("players").where("team","==",null).get();
      return json(200,{rows:list.docs.map(d=>d.data()).filter(p=>p.recruitment && !p.team).map(p=>({...profile({...p.recruitment,riot:p.ign || p.recruitment.riot,rango:p.rank || p.recruitment.rango,principal:p.role || p.recruitment.principal}),value:p.value ?? 1500}))},{"cache-control":"public, max-age=30"});
    }
    if (req.method !== "POST") return json(405,{error:"Método no permitido."});
    const body = await readBody(req,12000);
    if (body?.action === "apply") {
      const row = readAnswers(body.answers);
      const ip = req.headers.get("x-nf-client-connection-ip") || "local";
      if (!await signupLimit(db,"application:"+ip,Date.now())) return json(429,{error:"Alcanzaste el límite diario de solicitudes."});
      await submitApplication(db,row);
      return json(201,{status:"pending"});
    }
    const me = await whoIs(req,initAdmin());
    if (!me?.staff) return json(403,{error:"Solo staff."});
    if (["approve","reject"].includes(body?.action)) {
      const pid = await decideApplication(db,body.id,body.action,me);
      if (pid) await patchSnapshot(db,["players/"+pid]);
      return json(200,{ok:true,pid});
    }
    if (body.action === "payment" && validId(body.id) && typeof body.paid === "boolean") {
      await db.doc("recruits/"+body.id).update({paid:body.paid,verifiedBy:me.u,verifiedAt:Date.now()});
      return json(200,{ok:true});
    }
    if (body.action === "count") {
      const records = db.collection("recruits");
      const [all,done]=await Promise.all([records.count().get(), records.where("status","in",["approved","rejected"]).count().get()]);
      return json(200,{pending:Math.max(0,all.data().count-done.data().count)});
    }
    if (body.action === "list") {
      const list = await db.collection("recruits").orderBy("updated","desc").get();
      return json(200,{rows:list.docs.map(d=>({...d.data(),id:d.id}))});
    }
    if (body.action === "roles") {
      const after = body.after || "0";
      if (after !== "0" && !snowflake(after)) return json(400,{error:"Página inválida."});
      const [members,config,players,links] = await Promise.all([
        api("GET","/guilds/"+env().guildId+"/members?limit=1000&after="+after), db.doc("bot/config").get(),
        db.collection("players").get(),db.collection("members").get()
      ]);
      const teams = config.data()?.teams || {};
      if (!Object.values(teams).some(t=>t.role)) return json(409,{error:"Configurá los roles de equipo en ONYX Bot."});
      return json(200,{rows:rosterReview(members,players.docs,links.docs,teams),next:members.length===1000?members.at(-1).user.id:null});
    }
    return json(400,{error:"Acción inválida."});
  } catch (error) { if (error.status) return json(error.status,{error:error.message}); console.error("recruitment",error.message); return json(503,{error:"No se pudo completar la consulta. Para revisar roles, verificá el bot y Server Members Intent."}); }
}
export const config = {path:"/api/recruitment"};

