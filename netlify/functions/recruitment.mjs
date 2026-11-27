import { initAdmin } from "../lib/admin.mjs";
import { json, whoIs, readBody } from "../lib/auth.mjs";
import { env, api } from "../lib/discord.mjs";
import { signupLimit } from "../lib/coaching.mjs";
import { patchSnapshot } from "../lib/publish.mjs";
import { decideApplication, readAnswers, submitApplication, validId } from "../lib/applications.mjs";
import {handler as checkout} from "./inscripcion-pago.mjs";
import {work} from "../lib/community-sync.mjs";
import { identity } from "../lib/recruit-id.mjs";
import { deliver,enqueue,receiptFile,saveReceipt,labels,reissueInvite,recoverInvites } from "../lib/recruit-delivery.mjs";
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
    const user=identity(req);
    if(req.method==="GET" && new URL(req.url).searchParams.has("identity")){
      if(!user)return json(200,{user:null});
      const own=await db.doc("recruits/"+user.id).get();
      const legacy=own.exists?null:await db.collection("recruits").where("discordId","==",user.id).limit(1).get();
      const record=own.exists?own:legacy?.docs[0],r=record?.data();
      const job=r?(await db.doc("recruitjobs/invite_"+record.id).get()).data():null;
      return json(200,{paymentOptions:r?.status==="approved" && !r.paid?{paypal:"https://paypal.me/zerinhoprogamer2005"}:null,user:{username:user.username},application:r?{id:record.id,status:r.status||"pending",riot:r.riot,receipt:r.receiptState,paymentState:r.paymentState,access:r.accessState,paid:!!r.paid,inviteState:r.inviteState||job?.state||null,inviteNote:labels[r.inviteState||job?.state]||null,canReinvite:r.status!=="rejected" && !r.joinedAt && r.inviteState!=="joined"}:null,
        invite:r && r.status!=="rejected" && !r.joinedAt && job?.code && job.recipient===user.id && job.expires>Date.now()?"https://discord.gg/"+encodeURIComponent(job.code):null});
    }
    if (req.method === "GET") {
      const list = await db.collection("players").where("team","==",null).get();
      return json(200,{rows:list.docs.map(d=>d.data()).filter(p=>p.recruitment && !p.team && p.marketEligible!==false).map(p=>({...profile({...p.recruitment,riot:p.ign || p.recruitment.riot,rango:p.rank || p.recruitment.rango,principal:p.role || p.recruitment.principal}),value:p.value ?? 1500}))},{"cache-control":"public, max-age=30"});
    }
    if (req.method !== "POST") return json(405,{error:"Método no permitido."});
    const body = await readBody(req,925000);
    if(body?.action==="checkout"){
      if(!user)return json(403,{error:"Conectá Discord."});
      const own=await db.doc("recruits/"+user.id).get();
      const r=own.exists?own.data():(await db.collection("recruits").where("discordId","==",user.id).limit(1).get()).docs[0]?.data();
      if(!r || r.status!=="approved" || r.paid)return json(403,{error:"El pago requiere una postulación aceptada y pendiente de pago."});
      return checkout(req);
    }
    if(body?.action==="receipt"){
      if(!user || !validId(body.id))return json(403,{error:"Conectá tu cuenta de Discord."});
      const state=await saveReceipt(db,body.id,user,receiptFile(body.receipt),body.method);
      const receiptState=state==="sent"?state:await deliver(db,"receipt",body.id);
      return json(200,{ok:true,receiptState});
    }
    if(body?.action==="reinvite"){
      if(!user)return json(403,{error:"Conectá tu cuenta de Discord."});
      const own=await db.doc("recruits/"+user.id).get();
      const rid=own.exists?user.id:(await db.collection("recruits").where("discordId","==",user.id).limit(1).get()).docs[0]?.id;
      if(!rid)return json(404,{error:"No encontramos una postulación para esta cuenta."});
      const out=await reissueInvite(db,rid,user);
      return json(200,{ok:true,state:out.state,message:out.state==="joined"?"Ya estás en el servidor.":labels[out.state]||out.state,invite:out.link});
    }
    if (body?.action === "apply") {
      const row = readAnswers({...body.answers,...(user?{discord:user.username}:{})});
      if(!user)return json(401,{error:"Conectá tu Discord para recibir la invitación."});
      if(body.receipt)return json(409,{error:"Esperá la aceptación de la solicitud."});
      const receipt=null;
      const ip = req.headers.get("x-nf-client-connection-ip") || "local";
      if (!await signupLimit(db,"application:"+ip,Date.now(),30)) return json(429,{error:"Alcanzaste el límite diario de solicitudes."});
      const id=await submitApplication(db,row,user.id,{source:"web",receipt});
      await deliver(db,"invite",id).catch(e=>console.error("invitación tras postular",id,e.message));
      const receiptState=receipt?await deliver(db,"receipt",id):null;
      return json(201,{status:"pending",id,receiptState});
    }
    const me = await whoIs(req,initAdmin());
    if (!me?.staff) return json(403,{error:"Solo staff."});
    if(body.action==="bindLegacy"){
      if(!me.ultra || !validId(body.id) || !body.id.startsWith("web_") || !snowflake(body.discordId))return json(403,{error:"Vinculación reservada al ultra admin."});
      const account=await api("GET","/users/"+body.discordId);
      const ref=db.doc("recruits/"+body.id);
      await db.runTransaction(async tx=>{
        const [rec,byId,byLink]=await Promise.all([tx.get(ref),tx.get(db.doc("recruits/"+body.discordId)),tx.get(db.collection("recruits").where("discordId","==",body.discordId))]);
        const row=rec.data();
        if(!row || row.discordId || byId.exists || !byLink.empty || account.username.toLowerCase()!==String(row.discord).replace(/^@/,"").toLowerCase())throw Object.assign(new Error("Hay otra ficha o el usuario de Discord no coincide."),{status:409});
        tx.update(ref,{discordId:body.discordId,linkedBy:me.uid,linkedAt:Date.now()});
        tx.set(db.collection("audit").doc(),{uid:me.uid,u:me.u,role:me.role,at:Date.now(),txt:"Vinculó la solicitud anterior "+body.id});
      });
      return json(200,{ok:true});
    }
    if (["approve","reject"].includes(body?.action)) {
      const pid = await decideApplication(db,body.id,body.action,me);
      
      return json(200,{ok:true,pid});
    }
    if(body.action==="recoverInvites"){
      if(!me.ultra)return json(403,{error:"Solo ultra admin."});
      const dryRun=body.confirm!==true;
      const out=await recoverInvites(db,{dryRun,limit:Number(body.limit)||50,by:me.uid});
      if(!dryRun)db.collection("audit").doc().set({uid:me.uid,u:me.u,role:me.role,at:Date.now(),txt:"Recuperó invitaciones de Discord ("+out.selected+")"}).catch(()=>{});
      return json(200,out);
    }
    if(body.action==="retryDelivery" && validId(body.id) && ["invite","receipt"].includes(body.kind)){
      const ref=db.doc("recruits/"+body.id),row=(await ref.get()).data();
      if(!row || body.kind==="invite" && row.status==="rejected")return json(409,{error:"Primero aprobá al jugador."});
      if(body.kind==="invite" && !(await db.doc("recruitjobs/invite_"+body.id).get()).exists){
        const recipient=row.discordId || (snowflake(body.id)?body.id:body.discordId);
        if(!snowflake(recipient))return json(400,{error:"Indicá el ID numérico de Discord del jugador."});
        if(!row.discordId && !snowflake(body.id)){
          const u=await api("GET","/users/"+recipient);
          if(u.username.toLowerCase()!==String(row.discord).replace(/^@/,"").toLowerCase())return json(409,{error:"El ID no coincide con el usuario de la encuesta."});
        }
        await db.runTransaction(async tx=>{
          const jobRef=db.doc("recruitjobs/invite_"+body.id);
          if((await tx.get(jobRef)).exists)return;
          enqueue(tx,db,"invite",body.id,recipient);tx.update(ref,{discordId:recipient,inviteState:"pending"});
        });
      }
      const state=await deliver(db,body.kind,body.id,{manual:true});
      return json(200,{state,message:labels[state]||state});
    }
    if (body.action === "payment" && validId(body.id) && typeof body.paid === "boolean") {
      const pid=await decideApplication(db,body.id,body.paid?"verify":"denyReceipt",{...me,receiptHash:body.hash});
      if(pid){await patchSnapshot(db,["players/"+pid]);await Promise.all([work(db,"roles_"+pid),work(db,"free_"+pid),deliver(db,"invite",body.id)]);}
      return json(200,{ok:true});
    }
    if(["checkChannels","testChannel"].includes(body.action)){
 if(!me.ultra)return json(403,{error:"Solo Ultra Admin."});const channels=["1575215567391039498","1575217513476657162"];
 if(body.action==="testChannel"&&!channels.includes(body.channel))return json(400,{error:"Canal inválido."});
 const bot=await api("GET","/users/@me"),names=[];for(const id of body.action==="testChannel"?[body.channel]:channels){const ch=await api("GET","/channels/"+id);if(ch.guild_id!=="1550607388267122788")return json(409,{error:"Servidor incorrecto."});names.push(ch.name);}
 if(body.action==="testChannel"){await api("POST","/channels/"+body.channel+"/messages",{embeds:[{title:"PRUEBA DE CANAL · ONYX LEAGUES",description:"Verificación de envío desde Ultra Admin.",color:0xc29955}],allowed_mentions:{parse:[]}});return json(200,{status:"Mensaje de prueba enviado."});}
 return json(200,{status:bot.username+" · Canales accesibles: "+names.join(", ")});
 }
 if(body.action==="operations"){
      if(!me.ultra)return json(403,{error:"Solo ultra admin."});
      const [jobs,history,invites,events,dispatch]=await Promise.all([db.collection("communityjobs").get(),db.collection("paymenthistory").get(),db.collection("recruitjobs").where("kind","==","invite").get(),db.collection("invitehistory").get(),db.collection("recruitjobs").get()]);
      return json(200,{deliveryErrors:dispatch.docs.map(d=>d.data()).filter(j=>j.lastError).map(j=>({id:j.id,kind:j.kind,error:j.lastError,at:j.errorAt,state:j.state})),events:events.docs.map(d=>d.data()),jobs:jobs.docs.map(d=>({...d.data(),id:d.id,token:undefined})),history:history.docs.map(d=>d.data()),invites:invites.docs.map(d=>{const {id,state,expires,createdAt,joinedAt}=d.data();return {id,state,expires,createdAt,joinedAt};})});
    }
    if(body.action==="cancelJob"){
      if(!me.ultra||!/^\w[\w-]{1,139}$/.test(body.key||""))return json(403,{error:"Solo ultra admin."});
      const ref=db.doc("communityjobs/"+body.key);const cancelled=await db.runTransaction(async tx=>{const j=(await tx.get(ref)).data();if(!j||!["pending","waiting","retry","failed"].includes(j.state)||j.message||j.deliveryUncertain!==false&&j.kind!=="roles")return false;
        tx.update(ref,{state:"cancelled",next:0,updatedAt:Date.now()});tx.set(db.collection("audit").doc(),{uid:me.uid,u:me.u,role:me.role,at:Date.now(),txt:"Canceló el evento "+body.key});return true;});return json(cancelled?200:409,cancelled?{ok:true}:{error:"El evento cambió o su entrega requiere verificación."});}
    if(body.action==="retryJob"){
      if(!me.ultra || !/^[\w-]{2,140}$/.test(body.key||""))return json(403,{error:"Solo ultra admin."});
      const ref=db.doc("communityjobs/"+body.key);
      await db.runTransaction(async tx=>{const j=(await tx.get(ref)).data();if(j?.kind==="roles" && j.state==="done")tx.update(ref,{state:"pending",next:0});});
      await work(db,body.key,{manual:true});return json(200,{ok:true});
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

