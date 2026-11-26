import {categories,rarities,salePrice} from "./catalogo.mjs";
const palette=["violeta","dorado","rojo","gris","celeste","violeta","fucsia","verde","gris","naranja","celeste","rosa","violeta","dorado","plata","celeste","verde","rosa","azul","violeta"];
export const tones=[...new Set(palette)].sort();
export function styleOf(item){return {color:palette[item.motif],animated:item.category==="effect"||item.category==="frame"&&item.variant>0||item.category==="banner"&&item.variant===2};}
const fold=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
export function matchesStyle(item,filters,now){
 const {color,animated}=styleOf(item);
 const words=[item.name,item.collection,item.description,categories[item.category],item.rarity,color,animated?"animado":"estático",...(Array.isArray(item.tags)?item.tags:[])];
 return (!filters.q||fold(words.join(" ")).includes(fold(filters.q)))&&(!filters.color||color===filters.color)&&(!filters.motion||(filters.motion==="Animado")===animated)&&(!filters.term||(filters.term==="Permanente"?!item.premiumOnly:item.premium))&&(!filters.extra||(filters.extra==="Exclusivo"?item.premiumOnly:filters.extra==="Incluido en Premium"?item.premium:salePrice(item,now)===0));
}
export function sortProducts(items,mode,now,popularity={}){
 const value=mode==="Popularidad"?x=>Number(popularity[x.id])||0:mode==="Novedad"?x=>x.createdAt||x.artAt||0:mode==="Mayor precio"?x=>salePrice(x,now):mode==="Menor precio"?x=>-salePrice(x,now):mode==="Rareza"?x=>rarities.indexOf(x.rarity):null;
 return value?items.sort((a,b)=>value(b)-value(a)):items;
}
