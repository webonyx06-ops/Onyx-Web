import {api,env} from "./discord.mjs";
export async function syncPremium(db,now=Date.now(),call=api){
 const role=process.env.DISCORD_ROLE_PREMIUM_ID,guild=env().guildId;
 if(!/^\d{17,20}$/.test(role||"")||!guild)return;
 const due=await db.collection("socialprofiles").where("roleCheck","<=",now).orderBy("roleCheck").limit(20).get();
 for(const doc of due.docs){
 const w=doc.data(),active=w.until>now;
 try{
 const members=await db.collection("members").where("pid","==",doc.id).limit(2).get();
 const id=members.size===1?members.docs[0].id.match(/^d_(\d+)$/)?.[1]:null;
 if(w.roleAccount&&w.roleAccount!==id)await call("DELETE","/guilds/"+guild+"/members/"+w.roleAccount+"/roles/"+role).catch(e=>{if(e.status!==404)throw e;});
 if(id)await call(active?"PUT":"DELETE","/guilds/"+guild+"/members/"+id+"/roles/"+role).catch(e=>{if(active||e.status!==404)throw e;});
 await doc.ref.update({roleAccount:id||null,roleError:"",roleCheck:active?Math.min(w.until,now+3600000):now+86400000},{lastUpdateTime:doc.updateTime});
 }catch(e){await doc.ref.update({roleError:String(e.message).slice(0,180),roleCheck:now+600000},{lastUpdateTime:doc.updateTime}).catch(()=>{});}
 }
}
