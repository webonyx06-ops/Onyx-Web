import {admin} from "./admin.mjs";
import {env,api} from "./discord.mjs";
import {queue,guild} from "./community-sync.mjs";
import {enqueue} from "./recruit-delivery.mjs";

// Upgrade existing accepted applications in small batches. Old confirmed payments and rosters survive.
export async function upgradeRecruitment(db,call=api){
  if(env().guildId!==guild)return;
  const list=await db.collection("recruits").where("status","==","approved").get();
  for(const d of list.docs.filter(d=>!d.data().flowVersion).slice(0,15)){
    const inviteRef=db.doc("recruitjobs/invite_"+d.id);
    const prior=(await inviteRef.get()).data();
    if(!d.data().paid && prior?.code && prior.expires>Date.now()){
      try{await call("DELETE","/invites/"+encodeURIComponent(prior.code));}
      catch(e){if(e.body?.code!==10006)continue;}
    }
    await db.runTransaction(async tx=>{
      const [rs,inv,rc]=await tx.getAll(d.ref,inviteRef,db.doc("recruitjobs/receipt_"+d.id));
      const row=rs.data();if(!row||row.flowVersion)return;
      const pid=row.pid,player=pid?(await tx.get(db.doc("players/"+pid))).data():null;
      const uid=row.discordId || (/^\d{15,22}$/.test(d.id)?d.id:null);
      const receipt=rc.data();
      const changes={flowVersion:2,paymentState:row.paid?"verified":row.receiptState==="sent"?"review":"pending"};
      if(receipt?.hash)changes.receiptHash=receipt.hash;
      if(!row.paid && inv.exists){tx.delete(inviteRef);changes.inviteState="pendingPayment";}
      if(player){tx.update(db.doc("players/"+pid),{recruitId:d.id,marketEligible:!!row.paid});tx.set(db.doc("pubqueue/main"),{paths:admin.firestore.FieldValue.arrayUnion("players/"+pid),at:Date.now()},{merge:true});}
      if(row.paid && player && uid){
        queue(tx,db,"roles_"+pid,"roles",{rid:d.id,pid});
        if(!inv.exists)enqueue(tx,db,"invite",d.id,uid);
        if(!player.team)queue(tx,db,"free_"+pid,"free",{rid:d.id,pid,version:player.marketVersion||0});
      }
      tx.update(d.ref,changes);
    });
  }
}
