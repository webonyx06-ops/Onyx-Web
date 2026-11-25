import {createHash,randomUUID} from "node:crypto";
import {env,api} from "./discord.mjs";
import {snowflake} from "./recruit-id.mjs";
export const guild="1550607388267122788", freeChannel="1575217513476657162", transferChannel="1575215567391039498";
export const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export const digest=value=>createHash("sha256").update(value).digest("hex").slice(0,24);
export function queue(tx,db,id,kind,data){
  tx.set(db.doc("communityjobs/"+id),{kind,...data,state:"pending",next:0,attempt:0,at:Date.now()});
}
export async function membership(call,id){
  if(!snowflake(id))return null;
  try{return await call("GET","/guilds/"+guild+"/members/"+id);}
  catch(e){if(e.status===404 && e.body?.code===10007)return null;throw e;}
}
const roleVars=["DISCORD_ROLE_PAID_ID","DISCORD_ROLE_PLAYER_ID","DISCORD_ROLE_VERIFIED_ID"];
export async function syncRoles(db,call,row,player,member){
  if(row?.status!=="approved" || !row.paid)fail(409,"Pago sin verificar.");
  const base=roleVars.map(k=>process.env[k]);
  if(base.some(r=>!snowflake(r))||new Set(base).size!==3)fail(409,"Configurá los tres IDs de roles distintos.");
  const config=(await db.doc("bot/config").get()).data()?.teams || {};
  const teamIds=Object.values(config).map(t=>t.role).filter(Boolean);
  if(teamIds.some(r=>base.includes(r)))fail(409,"Los roles de equipo deben ser distintos de los roles de acceso.");
  const target=config[player?.team]?.role;
  const desired=target?[...base,target]:base;
  const add=desired.filter(r=>!member.roles.includes(r));
  const remove=member.roles.filter(r=>teamIds.includes(r)&&r!==target);
  if(add.length || remove.length){
    const bot=await call("GET","/users/@me");
    const self=await membership(call,bot.id),roles=await call("GET","/guilds/"+guild+"/roles");
    const own=roles.filter(r=>self.roles.includes(r.id)||r.id===guild);
    const perms=own.reduce((p,r)=>p|BigInt(r.permissions),0n);
    if(!(perms & (8n|268435456n)))fail(403,"Falta Gestionar roles.");
    const top=Math.max(...own.map(r=>r.position));
    for(const id of [...add,...remove]){
      const role=roles.find(r=>r.id===id);
      if(!role || role.managed || role.position>=top)fail(403,"Revisá la jerarquía del rol "+id);
    }
    const path="/guilds/"+guild+"/members/"+member.user.id+"/roles/";
    for(const id of add)await call("PUT",path+id);
    for(const id of remove)await call("DELETE",path+id);
  }
  return desired;
}
const safeName=s=>String(s||"—").replace(/[<>@*_~`|]/g,"").slice(0,100)||"—";
async function announcement(db,call,key,j,p,member){
  const free=j.kind==="free", ch=free?freeChannel:transferChannel;
  const ref=db.doc("marketposts/"+j.pid);
  const prev=(await ref.get()).data();
  if(free && (p.team || (p.marketVersion||0)!==(j.version||0)))return;
  if(!free && j.to && prev?.message && (prev.version||0)===j.version-1){
    try{await call("PATCH","/channels/"+freeChannel+"/messages/"+prev.message,{embeds:[{title:"Jugador fichado",description:safeName(p.name),color:0x706582}],allowed_mentions:{parse:[]}});}
    catch(e){if(e.body?.code!==10008)throw e;}
  }
  if(!free && !j.to)return;
  const channel=await call("GET","/channels/"+ch);
  if(channel.guild_id!==guild)fail(403,"Canal fuera del servidor oficial.");
  const display=member?"<@"+member.user.id+">":safeName(j.name||p.name);
  const field=(name,value)=>({name,value,inline:true});
  const embed=free?{title:"🟢 NUEVO JUGADOR LIBRE",fields:[field("Jugador",display),field("Rango",safeName(p.rank)),field("Posición",safeName(p.role))]}:
    {title:j.from?"🔄 TRASPASO OFICIAL":"✍️ NUEVO FICHAJE OFICIAL",fields:[field("Jugador",display),field("Procedencia",safeName(j.fromName||"Agente libre")),field("Nuevo equipo",safeName(j.toName||j.to)),field("Estado","✅ Confirmado")],thumbnail:{url:env().site+"/api/logo/"+encodeURIComponent(j.to)},footer:{text:"ONYX Leagues | Mercado de fichajes"}};
  embed.color=0x984bfa;
  embed.url=env().site+"/#mercado-"+key;
  // If Discord accepted the POST but the function stopped before Firestore acknowledged it,
  // recover the original message even after Discord's nonce window expires.
  let message;
  if(j.attempt){
    let before="";
    for(;;){
      const batch=await call("GET","/channels/"+ch+"/messages?limit=100"+(before?"&before="+before:""));
      message=batch.find(m=>m.author?.id===env().appId && m.embeds?.some(e=>e.url===embed.url));
      if(message || batch.length<100 || Date.parse(batch.at(-1).timestamp)<j.at-60000)break;
      before=batch.at(-1).id;
    }
  }
  if(!message)message=await call("POST","/channels/"+ch+"/messages",{embeds:[embed],allowed_mentions:{parse:[],users:member?[member.user.id]:[]},nonce:digest(key),enforce_nonce:true});
  if(free)await ref.set({message:message.id,version:j.version||0});
  return message.id;
}
export async function work(db,key,{call=api,now=Date.now,manual=false}={}){
  const ref=db.doc("communityjobs/"+key),token=randomUUID();
  const j=await db.runTransaction(async tx=>{
    const j=(await tx.get(ref)).data();
    if(!j || j.state==="done" || j.next>now() && (j.state==="sending" || !manual))return;
    const lock=db.doc("communitylocks/"+j.pid);
    if(((await tx.get(lock)).data()?.until||0)>now())return;
    tx.set(lock,{until:now()+180000,token});
    tx.update(ref,{state:"sending",token,next:now()+180000,attempt:j.attempt+1});return j;
  });
  if(!j)return;
  const finish=(state,extra={})=>db.runTransaction(async tx=>{
    const lock=db.doc("communitylocks/"+j.pid);
    const [current,locked]=await tx.getAll(ref,lock);
    if(locked.data()?.token===token)tx.delete(lock);
    if(current.data()?.token===token)tx.update(ref,{state,next:state==="done"?0:now()+Math.min(3600000,60000*2**Math.min(j.attempt,6)),...extra});
  });
  try{
    if(env().guildId!==guild)fail(409,"Revisá DISCORD_GUILD_ID.");
    const player=(await db.doc("players/"+j.pid).get()).data();
    if(!player){await finish("done");return;}
    const rid=j.rid || player.recruitId;
    const row=rid?(await db.doc("recruits/"+rid).get()).data():null;
    if(j.kind!=="transfer" && (!row?.paid || row.status!=="approved")){await finish("done");return;}
    const uid=row?.discordId || (snowflake(rid)?rid:player.discord);
    const member=await membership(call,uid);
    if(j.kind==="roles"){
      if(!member){await finish("waiting",{next:now()+300000});return;}
      const roles=await syncRoles(db,call,row,player,member);
      const recruit=db.doc("recruits/"+rid);
      await db.runTransaction(async tx=>{
        const current=(await tx.get(recruit)).data();
        const invite=db.doc("recruitjobs/invite_"+rid),iv=(await tx.get(invite)).data();
        if(!current.joinedAt && iv?.code){
          tx.set(db.collection("invitehistory").doc(),{id:rid,recipient:uid,event:"membershipObserved",at:now(),expires:iv.expires});
          tx.update(invite,{state:"joined",joinedAt:now()});
        }
        tx.update(recruit,{roleIds:roles,rolesCheckedAt:now(),joinedAt:current.joinedAt||now(),accessState:"joined"});
      });
    }else {
      const message=await announcement(db,call,key,j,player,member);
      await finish("done",{message:message||null,error:null});return;
    }
    await finish("done",{error:null,roles:(await db.doc("recruits/"+rid).get()).data()?.roleIds||[]});
  }catch(e){await finish("retry",{error:String(e.message).slice(0,250),lastErrorAt:now()});}
}
export async function tickCommunity(db){
  const jobs=await db.collection("communityjobs").where("state","in",["waiting","retry","pending","sending"]).get();
  for(const job of jobs.docs.filter(d=>d.data().next<=Date.now()).sort((a,b)=>a.data().next-b.data().next).slice(0,15))await work(db,job.id);
}
