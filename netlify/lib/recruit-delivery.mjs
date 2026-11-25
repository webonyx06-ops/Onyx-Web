import {createHash,randomUUID} from "node:crypto";
import {membership,guild} from "./community-sync.mjs";
import {api,env} from "./discord.mjs";
import {snowflake} from "./recruit-id.mjs";

const hash=s=>createHash("sha256").update(s).digest("hex");
export const labels={pending:"Pendiente",sending:"Enviando",sent:"Enviado",blocked:"Discord bloqueó el mensaje privado",config:"Revisar el canal y los permisos",retry:"Reintento programado",identity:"Falta verificar el usuario de Discord",expired:"Invitación vencida"};
const error=(status,msg)=>Object.assign(new Error(msg),{status});
export function receiptFile(input) {
  if(!input)return null;
  const m=typeof input==="string" && input.match(/^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!m || m[2].length>900000) throw error(400,"Usá un comprobante en JPG, PNG, WEBP o PDF que entre en el límite indicado.");
  const bytes=Buffer.from(m[2],"base64"),sig=bytes.subarray(0,12), type=m[1];
  if(bytes.length<12 || !(type==="image/jpeg"?sig.subarray(0,3).toString("hex")==="ffd8ff":
    type==="image/png"?sig.subarray(0,8).toString("hex")==="89504e470d0a1a0a":
    type==="image/webp"?sig.toString("ascii",0,4)==="RIFF" && sig.toString("ascii",8,12)==="WEBP":sig.toString("ascii",0,5)==="%PDF-"))
    throw error(400,"El contenido del archivo no coincide con su formato.");
  return {data:m[2],type,hash:hash(bytes)};
}
const stateField=kind=>kind==="invite"?"inviteState":"receiptState";
const jobRef=(db,kind,id)=>db.doc("recruitjobs/"+kind+"_"+id);
export function enqueue(tx,db,kind,id,recipient,file) {
  const job={id,kind,recipient,state:"pending",next:0,attempt:0};
  if(file){job.hash=file.hash;tx.set(db.doc("receiptuploads/"+id),file);}
  tx.set(jobRef(db,kind,id),job);
}
export async function saveReceipt(db,id,user,file,method) {
  if(!["mercadopago","paypal"].includes(method))throw error(400,"Elegí el medio de pago.");
  if(!file)throw error(400,"Elegí el comprobante.");
  const ref=db.doc("recruits/"+id), job=jobRef(db,"receipt",id);
  return db.runTransaction(async tx=>{
    const [r,j]=await tx.getAll(ref,job),row=r.data(),prev=j.data();
    if(!row || (row.discordId||id)!==user.id || row.status!=="approved")throw error(403,"No hay una postulación habilitada para esa cuenta.");
    const proof=db.doc("receipthashes/"+file.hash);
    const seen=(await tx.get(proof)).data();
    if(seen && (seen.id!==id || prev?.hash!==file.hash) || row.paymentState==="rejected" && prev?.hash===file.hash)throw error(409,"Este comprobante ya fue presentado.");
    if(prev?.hash===file.hash)return prev.state;
    if(row.paid)throw error(409,"El pago ya está verificado.");
    if(prev && prev.state!=="sent" && prev.state!=="config")throw error(409,"Ya se está procesando el comprobante anterior.");
    if((row.receiptCount || 0)>=5)throw error(429,"Ya enviaste cinco comprobantes. Pedile al staff que revise los anteriores.");
    tx.set(proof,{id,at:Date.now()});
    tx.set(db.collection("paymenthistory").doc(),{id,hash:file.hash,method,decision:"submitted",by:user.id,at:Date.now()});
    enqueue(tx,db,"receipt",id,user.id,file);
    tx.update(ref,{method,receiptHash:file.hash,paymentState:"submitted",receiptState:"pending",receiptCount:(row.receiptCount||0)+1});
    return "pending";
  });
}

export async function deliver(db,kind,id,{call=api,now=Date.now,manual=false}={}) {
  const ref=jobRef(db,kind,id), recruit=db.doc("recruits/"+id), token=randomUUID(),field=stateField(kind);
  const job=await db.runTransaction(async tx=>{
    const [js,rs]=await tx.getAll(ref,recruit),j=js.data(),r=rs.data();
    if(!j || !r || (kind==="invite" && (r.status!=="approved" || !r.paid)))return {stop:true,state:r?.[field]||"identity"};
    if((j.state==="sent" && !(kind==="invite" && j.expires<=now())) || (j.state==="sending" && j.next>now()) || (!manual && (["blocked","identity","expired","joined"].includes(j.state) || j.next>now())))return {stop:true,state:j.state};
    tx.update(ref,{state:"sending",token,next:now()+120000,attempt:(j.attempt||0)+1});
    return {...j,discord:r.discord,riot:r.riot,method:r.method};
  });
  if(job.stop)return job.state;
  const persist=(changes,state)=>db.runTransaction(async tx=>{
    if((await tx.get(ref)).data()?.token!==token)return false;
    tx.update(ref,{...changes,...(state?{state}:{})});
    if(kind==="invite" && (changes.code || state==="expired" || state==="joined")){
      tx.set(db.collection("invitehistory").doc(),{id,recipient:job.recipient,event:changes.code?"created":state,at:now(),expires:changes.expires||job.expires||null});
    }
    if(state)tx.update(recruit,{[field]:state,...(kind==="receipt" && state==="sent"?{paymentState:"review"}:{})});
    if(state==="sent" && kind==="receipt"){
      tx.delete(db.doc("receiptuploads/"+id));
      tx.update(recruit,{receiptMessage:changes.messageId,receiptChannel:changes.channelId});
      tx.set(db.collection("paymenthistory").doc(),{id,hash:job.hash,method:job.method||null,decision:"review",by:"ONYX Bot",at:now()});
    }
    return true;
  });
  try{
    if(kind==="invite"){
      if(env().guildId!==guild)throw error(403,"config");
      const member=await membership(call,job.recipient);
      if(member){await persist({joinedAt:now()},"joined");return "joined";}
    }
    const settings=(await db.doc("bot/recruitment").get()).data()||{};
    const channel=kind==="receipt"?(settings.receipts || process.env.DISCORD_RECEIPTS_CHANNEL_ID):(process.env.DISCORD_INVITE_CHANNEL_ID || settings.channel);
    if(!snowflake(channel)||!snowflake(env().guildId)||!env().token)throw error(403,"config");
    const ch=await call("GET","/channels/"+channel);
    if(ch.guild_id!==env().guildId || ![0,5].includes(ch.type))throw error(403,"config");
    if(kind==="receipt"){
      const file=(await db.doc("receiptuploads/"+id).get()).data();
      const everyone=ch.permission_overwrites?.find(o=>o.id===ch.guild_id && o.type===0);
      if(!everyone || !(BigInt(everyone.deny || 0) & 1024n))throw error(403,"config");
      if(!file || file.hash!==job.hash)throw error(409,"archivo");
      const name="comprobante."+({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf"}[file.type]);
      const form=new FormData();
      form.append("payload_json",JSON.stringify({content:"Comprobante de inscripción para revisar · "+(job.method==="paypal"?"PayPal":"Mercado Pago")+"\nDiscord: "+job.discord+" ("+job.recipient+")\nRiot ID: "+job.riot,allowed_mentions:{parse:[]},attachments:[{id:0,filename:name}],nonce:hash(id+file.hash).slice(0,24),enforce_nonce:true}));
      form.append("files[0]",new Blob([Buffer.from(file.data,"base64")],{type:file.type}),name);
      const msg=await call("POST","/channels/"+channel+"/messages",form);
      await persist({messageId:msg.id,channelId:channel,sentAt:now()},"sent");return "sent";
    }
    if(!snowflake(job.recipient)){await persist({},"identity");return "identity";}
    let code=job.code,expires=job.expires;
    if(!code || expires<=now()){
      if(code && !manual){await persist({},"expired");return "expired";}
      const invite=await call("POST","/channels/"+channel+"/invites",{max_age:86400,max_uses:1,unique:true,temporary:false,target_user_ids:[job.recipient]});
      code=invite.code;if(!code)throw new Error("invite");expires=Date.parse(invite.expires_at)||now()+86400000;
      if(!await persist({code,expires,createdAt:now()}))return "sending";
    }
    const dm=await call("POST","/users/@me/channels",{recipient_id:job.recipient});
    await call("POST","/channels/"+dm.id+"/messages",{content:"¡Tu postulación a ONYX League fue aprobada! Ya estás en el mercado como agente libre. Tu invitación personal de un solo uso vence <t:"+Math.floor(expires/1000)+":R>.\nhttps://discord.gg/"+code,nonce:hash(id+code).slice(0,24),enforce_nonce:true,allowed_mentions:{parse:[]}});
    await persist({sentAt:now()},"sent");return "sent";
  }catch(e){
    const state=e.body?.code===50007?"blocked":e.status>=400 && e.status<500 && e.status!==429?"config":"retry";
    await persist({lastError:String(e.message).slice(0,200),errorAt:now(),next:now()+(state==="config"?3600000:Math.min(3600000,60000*2**Math.min(6,job.attempt||0)))},state);
    return state;
  }
}
export async function retryDeliveries(db) {
  const expired=await db.collection("recruitjobs").where("kind","==","invite").get();
  for(const d of expired.docs.filter(d=>["sent","blocked"].includes(d.data().state)&&d.data().expires<=Date.now()).slice(0,20)){
    await db.runTransaction(async tx=>{const j=(await tx.get(d.ref)).data(),r=db.doc("recruits/"+j.id);
      const row=(await tx.get(r)).data();
      if(!row || !["sent","blocked"].includes(j.state)||j.expires>Date.now())return;
      const state=row.joinedAt?"joined":"expired";
      tx.set(db.collection("invitehistory").doc(),{id:j.id,recipient:j.recipient,event:state,at:Date.now(),expires:j.expires});tx.update(d.ref,{state,closedAt:Date.now()});tx.update(r,{inviteState:state});
    });
  }
  for(const state of ["pending","sending","retry","config"]){
    const jobs=await db.collection("recruitjobs").where("state","==",state).get();
    for(const d of jobs.docs.filter(d=>d.data().next<=Date.now()).slice(0,5)){
      const j=d.data();await deliver(db,j.kind,j.id);
    }
  }
}
