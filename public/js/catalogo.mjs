export const collections = ["ONYX Classic","Royal Gold","Crimson","Phantom","Frozen","Galaxy","Cyberpunk","Emerald","Obsidian","Inferno","Electric","Sakura","Void","Solar","Lunar","Diamond","Toxic","Retro Arcade","Celestial","Neon Night"];
export const colors = ["ad77ff","f2bc59","ff526a","a4b5ce","82e8ff","b791ff","fb72db","53e1a6","a9a3bd","ff8253","62e4ff","ffadc9","ac83df","ffd66c","d6e1ff","96f1ff","afe957","ff91b4","a9bdff","ed68ff"];
const marks=["⬢","♛","⚔","◈","❄","✧","⌁","❖","◆","♨","ϟ","✿","◎","☀","☾","◇","✣","▦","✶","≋"];
export const categories={banner:"Banner",frame:"Marco",badge:"Insignia",title:"Título",label:"Etiqueta",theme:"Tema",effect:"Efecto",avatar:"Avatar",stars:"Estrellas"};
const designs={banner:["Horizonte","Eclipse","Vanguardia"],frame:["Órbita","Bastión"],badge:["Sello","Blasón","Emblema","Sigilo"],title:["Guardián","The Wanderer","Heraldo"],label:["Pulso","Eco"],theme:["Atmósfera"],effect:["Destello","Estela"],avatar:["Centinela","Espectro"],stars:["Constelación"]};
const counts=[60,40,80,60,30,20,25,30,15],free=[10,5,10,10,5,3,0,10,0];
export const rarities=["Gratis","Común","Poco común","Raro","Épico","Legendario","Exclusivo"];
export const base=Object.keys(categories).flatMap((category,k)=>Array.from({length:counts[k]},(_,n)=>{
 const motif=n%20,variant=Math.floor(n/20),collection=collections[motif],type=designs[category][variant];
 const r=n<free[k]?0:1+(n+k+variant)%6;
 return {id:category+"-"+(n+1),category,collection,motif,variant,name:type+" · "+collection,description:categories[category]+" de la serie "+collection,rarity:rarities[r],price:[0,25,55,95,160,275,425][r],premium:r<6||motif===19,premiumOnly:motif===19&&["theme","effect"].includes(category),duration:"Permanente al canjear",active:true,featured:motif<3};
}));
export const defaults={discount:15,studio:175,music:200,discord:250,days30:350,days90:850,days365:2500};
export function catalog(config={}){return [...new Set([...base.map(x=>x.id),...Object.keys(config.items||{})])].map(id=>({...byId.get(id),...config.items?.[id],id}));}
const byId=new Map(base.map(i=>[i.id,i]));
export const premiumOnly=i=>!!i.premiumOnly;
export const salePrice=(i,now)=>i.promoPrice!=null&&i.promoEnd>now?i.promoPrice:i.price;
export const available=(i,now)=>i.active!==false&&(!i.start||i.start<=now)&&(!i.end||i.end>now);
export const entitled=(i,w,now)=>!!i&&(w.owned?.includes(i.id)||!i.premiumOnly&&salePrice(i,now)===0&&available(i,now)||w.until>now&&i.premium&&available(i,now));
export function bundlePrice(items,w,discount,now){const missing=items.filter(i=>available(i,now)&&!w.owned?.includes(i.id)&&!i.premiumOnly&&salePrice(i,now)>0);return {ids:missing.map(i=>i.id),cost:Math.ceil(missing.reduce((s,i)=>s+salePrice(i,now),0)*(100-discount)/100)};}
export function art(i){
 if(i.artAt)return "/api/social?art="+encodeURIComponent(i.id)+"&v="+Number(i.artAt);
 const n=i.motif%20,v=i.variant||0,c="#"+colors[n],mark=marks[n],cat=i.category;
 const pattern=[ '<path d="M-15 112L85 0m-30 112L155 0m-30 112L225 0" stroke-width="12"/>','<circle cx="90" cy="56" r="36"/><circle cx="90" cy="56" r="48"/>','<path d="m0 76 45-44 45 44 45-44 45 44m-180 12 45-44 45 44 45-44 45 44"/>','<path d="M0 85h42V61h34V31h44V15h60M0 97h52V73h35V43h44V27h49"/>','<path d="m10 80 40-64 35 84 32-77 55 57-71-24z"/>' ][(n+v)%5];
 const glyphs=["M-20-12 0-23 20-12 20 12 0 23-20 12zM-10-6 0-12 10-6 10 6 0 12-10 6z","M-23-12-11-3 0-20 11-3 23-12 17 12h-34zM-16 18h32","M-15 18 11-13 20-19 17-7-9 20zM-19 3l16 15","M-21 14v-12q0-23 21-23T21 2v16l-8-6-9 7-9-7-8 7zM-9-4h3m12 0h3","M0-23v46M-20-12l40 24m0-24-40 24M-7-17l7 6 7-6","M-16 5a17 17 0 1 1 32 0a17 17 0 0 1-32 0M-25 12q22 3 48-25","M-19 16h10v-30h17V3h12M-23-4h12M12 13h10","M-19-9-7-21H9L21-8 0 22zM-19-9h40M-6-9 0 22 8-9","M-18 16-8-20 10-16 21 17 0 22zM-8-20 0 22 10-16","M-18 12q-6-14 11-27-2 9 4 12 4-6 8-19 23 22 10 37-15 15-33-3z","M4-24-20 4h15l-4 20 29-30H4z","M0-7q-16-25-23-5-3 10 12 14-15 17 1 20 9 1 12-11 14 19 22 4 2-10-12-12 17-15 2-22-10-4-14 12z","M-21 0a21 21 0 1 0 42 0a21 21 0 1 0-42 0M-11 0a11 11 0 1 1 22 0a11 11 0 1 1-22 0","M0-24v8m0 32v8M-24 0h8m32 0h8M-17-17l6 6m22 22 6 6M-11 0a11 11 0 1 1 22 0a11 11 0 1 1-22 0","M8-22a23 23 0 1 0 12 34A22 22 0 0 1 8-22z","M-23-7-12-18h24L23-7 0 22zM-23-7h46M-9-7 0 22 9-7","M-12-20h24M-7-19v13L-20 16q-1 4 5 4h30q6 0 4-5L7-6v-13M-11 6h22","M-22 12V-2h7v-8h8v-7H7v7h8v8h7v14h-8V7H7v7H-7V7h-7v5z","M0-24 6-7 23-5 10 5 14 22 0 12-14 22-10 5-23-5-6-7z","M-23 11-9-16 0 7 11-19 23 9M-18 18h36"];
 const glyph='<path d="'+glyphs[n]+'" fill="'+c+'" fill-opacity=".18" stroke="'+c+'" stroke-linejoin="round" stroke-width="2.5"/>';
 const seal=(x,y,scale)=>'<g transform="translate('+x+' '+y+') scale('+scale+')">'+glyph+'</g>';
 const poly=(s,r,angle=0)=>Array.from({length:s},(_,j)=>{const t=2*Math.PI*j/s+angle;return [90+Math.cos(t)*r,56+Math.sin(t)*r].join(",");}).join(" ");
 const ring='<polygon points="'+poly(5+n%6,47,n/4)+'" fill="none" stroke="'+c+'" stroke-width="3"/>';
 const backdrop='<rect width="180" height="112" fill="#151320"/><g opacity=".38" stroke="'+c+'" fill="none">'+pattern+'</g>';
 let body=backdrop;
 if(cat==="frame"){body=ring+'<circle cx="90" cy="56" r="41" fill="none" stroke="'+c+'" stroke-dasharray="'+(4+n)+' '+(4+v*7)+'"/>'+seal(90,v?12:97,.29);}
 else if(cat==="badge")body+= '<polygon points="'+poly(3+v,40,-1.57)+'" fill="#211e2e" stroke="'+c+'"/>'+seal(90,56,.94);
 else if(cat==="avatar")body+= '<circle cx="90" cy="55" r="40" fill="#201c2e" stroke="'+c+'"/>'+seal(90,55,1.2)+(v?'<path d="m61 78 29 12 29-12" fill="none" stroke="'+c+'"/>':"");
 else if(cat==="stars")body+=Array.from({length:3+n%5},(_,j)=>seal(18+j*145/(2+n%5),55+14*Math.sin(j+n),.36)).join("");
 else if(cat==="banner")body+=seal([132,88,45][v]||88,56,1.65);
 else if(cat==="title"||cat==="label")body+='<rect x="13" y="30" rx="'+(cat==="label"?23:3)+'" width="154" height="52" fill="#191422" stroke="'+c+'"/>'+seal(37,56,.52)+'<text x="58" y="61" fill="'+c+'" font-family="sans-serif" font-size="12">'+designs[cat][v%designs[cat].length]+'</text>';
 else if(cat==="effect")body+=Array.from({length:6},(_,j)=>seal(15+30*j,24+(n*17+j*23)%66,.14+(j%3)*.12)).join("");
 else body+=seal(132,45,.9)+'<path d="M18 37h58M18 50h43M18 68h75" stroke="'+c+'" stroke-width="5"/>';
 return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 112">'+body+'</svg>');
}
