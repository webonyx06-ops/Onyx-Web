import { env, hasPerm, PERM, api, sendMessage } from "./discord.mjs";
import { initAdmin } from "./admin.mjs";

import { readAnswers, submitApplication } from "./applications.mjs";
import { fields } from "./survey-fields.mjs";
export async function survey(i) {
  const quiet = content => ({content,flags:64,allowed_mentions:{parse:[]}});
  if (!env().guildId || i.guild_id !== env().guildId || !i.member?.user) return quiet("Usá el servidor de ONYX.");
  const db = initAdmin().firestore(), config = db.doc("bot/recruitment");
  if (i.data.name === "encuesta") {
    if (!hasPerm(i.member,PERM.MANAGE_GUILD)) return quiet("Solo administración puede elegir el canal.");
    let channel = i.channel_id;
    if (i.data.options?.some(o=>o.name==="crear_canal" && o.value===true)) {
      if (!hasPerm(i.member,16n)) return quiet("Para crear el canal necesitás Gestionar canales.");
      const channels = await api("GET","/guilds/"+i.guild_id+"/channels");
      const target = channels.find(c=>c.type===0 && c.name==="postulaciones-onyx")
        || await api("POST","/guilds/"+i.guild_id+"/channels",{name:"postulaciones-onyx",type:0,topic:"Encuestas de fichajes ONYX · Completá /postular"});
      channel = target.id;
    }
    const message = {content:"**Postulaciones ONYX**\nUsá **/postular** en este canal y completá la encuesta. Tu usuario de Discord se toma de tu cuenta. En la web se muestran tu Riot ID, rangos, roles, agentes, disponibilidad y país. El staff recibe el resto y verifica el pago por separado. El staff revisa tu postulación. Al aprobarla, entrás al mercado libre por 1.500 ONYX Coins.\n\n"+fields.map(([,label])=>"• "+label).join("\n"),allowed_mentions:{parse:[]}};
    if (channel !== i.channel_id) await sendMessage(channel,message);
    await config.set({channel});
    return channel === i.channel_id ? message : quiet("Encuesta publicada en <#"+channel+">.");
  }
  if ((await config.get()).data()?.channel !== i.channel_id) return quiet("Usá el canal de postulaciones habilitado por el staff.");
  const options = Object.fromEntries((i.data.options || []).map(o=>[o.name,String(o.value).trim()]));
  if (!/^[^#\r\n]+#[^#\s]+$/.test(options.riot || "")) return quiet("Revisá tu Riot ID e incluí el #tag.");
  const record = Object.fromEntries(fields.map(([key])=>[key,(options[key] || "").slice(0,key==="motivo"?600:220)]));
  try { await submitApplication(db,readAnswers({...record,discord:i.member.user.username}),i.member.user.id); }
  catch (err) { if (err.status) return quiet(err.message); throw err; }
  return quiet("Tu solicitud está pendiente de revisión por el staff. Al aprobarla entrás al mercado como agente libre.");
}

