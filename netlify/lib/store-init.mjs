import {base} from "../../public/js/catalogo.mjs";
export async function seedStore(db){
 return db.runTransaction(async tx=>{
 const ref=db.doc("socialconfig/storeSeed");if((await tx.get(ref)).data()?.version===1)return;
 for(const item of base)tx.set(db.doc("storebase/"+item.id),item);
 tx.set(ref,{version:1,count:base.length});
 });
}
