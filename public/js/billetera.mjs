import {art,base,defaults} from "./catalogo.mjs";
const service=window.onyxWallet;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const number=n=>Number(n||0).toLocaleString("es-AR");
const accountCache=new Map();
let benefitsRequest;
function benefits(){
 if(!benefitsRequest)benefitsRequest=fetch("/api/social").then(async r=>{if(!r.ok)throw Error();return {...defaults,...(await r.json()).config?.settings};}).catch(e=>{benefitsRequest=null;throw e;});
 return benefitsRequest;
}
function benefitList(prices,linked){
 return '<ul class="wallet-history">'+[["music","Canción de perfil"],["discord","Rol personalizado y canal de Discord"],["days30","ONYX Premium · 30 días"],["days90","ONYX Premium · 90 días"],["days365","ONYX Premium · 365 días"]].map(([id,name])=>'<li><span>'+name+'<small>'+number(prices[id])+' OC</small></span>'+(linked?'<button type="button" class="btn sm" data-benefit="'+id+'" data-cost="'+prices[id]+'">Canjear</button>':"")+'</li>').join("")+'</ul>';
}
function fetchWallet(pid,uid){
 const k=uid+"/"+pid,old=accountCache.get(k);
 if(old&&Date.now()-old.at<20000)return old.promise;
 const promise=service.api("/api/social",{action:"wallet",pid}).catch(e=>{accountCache.delete(k);throw e;});
 accountCache.set(k,{at:Date.now(),promise});return promise;
}
const state={pid:"",match:""};
function choices(list,value){return list.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===value?"selected":"")+'>'+esc(x.name)+'</option>').join("");}
function history(w){return w.movements.length?'<ul class="wallet-history">'+w.movements.slice(0,30).map(x=>'<li><span>'+esc(x.label)+'<small>'+esc(x.state)+' · '+(x.at?new Date(x.at).toLocaleDateString("es-AR"):"Fecha sin registrar")+'</small></span><b>'+((x.amount>0)?"+":"")+number(x.amount)+' OC</b></li>').join("")+'</ul>':'<p>Todavía no hay movimientos registrados.</p>';}
function balances(w){return '<div class="wallet-totals">'+[[w.available,"Saldo disponible"],[w.earned,"Créditos y ajustes"],[w.reserved,"Reservado en pedidos"],[w.spent,"Canjeado"]].map(([n,l])=>'<div><small>'+l+'</small><strong>'+number(n)+' OC</strong></div>').join("")+'</div><details><summary>Últimos movimientos</summary>'+history(w)+'</details>';}
function showcase(){return '<div class="wallet-samples">'+[base[0],base.find(i=>i.id==="frame-2"),base.find(i=>i.id==="badge-3")].map(i=>'<button type="button" class="wallet-card" data-social-open="shop" data-wallet-category="'+i.category+'"><img loading="lazy" alt="" src="'+esc(art(i))+'"><strong>'+({banner:"Banners",frame:"Marcos de avatar",badge:"Insignias"})[i.category]+'</strong></button>').join("")+'</div><button class="btn gold" type="button" data-social-open="shop">Abrir tienda y beneficios Premium</button>';}
class Wallet extends HTMLElement {
 connectedCallback(){this.addEventListener("click",this);this.addEventListener("change",this);this.addEventListener("submit",this);this.refresh();}
 disconnectedCallback(){this.removeEventListener("click",this);this.removeEventListener("change",this);this.removeEventListener("submit",this);this.token=null;}
 async refresh(force=false){
  const mode=this.getAttribute("mode")||"player",who=service.identity(),players=service.players(),matches=service.matches(),prizes=service.prizes();
  const pid=mode==="staff"?(players.find(p=>p.id===state.pid)?.id||players[0]?.id):who.pid;
  const signature=JSON.stringify([mode,who,pid,mode==="staff"?players:mode==="match"?matches:prizes.map(p=>[p.id,p.pts,p.stock,p.name])]);
  if(this.signature===signature&&!force)return;
  this.signature=signature;const token=Symbol();this.token=token;
  if(mode!=="player"&&!who.staff){this.textContent="Ingresá con una cuenta de staff.";return;}
  if(mode==="match"){this.innerHTML=matches.length?'<form class="wallet-form" data-kind="match"><label>Partido oficial<select name="mid" required>'+choices(matches,state.match)+'</select></label><label>OC por participante<input type="number" min="1" max="100000" step="1" name="amount" required></label><button class="btn gold">Acreditar premio del partido</button></form><p>Reciben el mismo importe los jugadores que figuran en el acta. Cada partido se premia una sola vez por temporada.</p><output></output>':'<p>Los partidos con resultado oficial y estadísticas de jugadores van a aparecer acá.</p>';return;}
  const picker=mode==="staff"?'<label>Jugador<select name="player">'+choices(players,pid)+'</select></label>':"";
  const editor=mode==="staff"&&pid?'<form data-kind="adjust" class="wallet-form"><label>Operación<select name="type"><option value="1">Acreditar OC</option><option value="-1">Descontar OC</option></select></label><label>Importe<input name="amount" type="number" min="1" max="100000" step="1" required></label><label>Motivo<input name="reason" minlength="3" maxlength="140" required></label><button class="btn">Guardar movimiento</button></form>':"";
  const offers=prizes.map(p=>'<li><span>'+esc(p.name)+'<small>'+number(p.pts)+' OC'+(p.stock==null||p.stock===""?"":" · Stock "+number(p.stock))+'</small></span>'+(who.pid?'<button type="button" class="btn sm" data-prize="'+esc(p.id)+'" '+(p.stock!=null&&p.stock!==""&&+p.stock<=0?"disabled":"")+'>Pedir recompensa</button>':"")+'</li>').join("");
  this.innerHTML=picker+'<section class="wallet-panel"><h3>'+ (mode==="staff"?"Estado de la cuenta":"Mis ONYX Coins")+'</h3><div data-statement aria-live="polite">'+(pid?"Consultando saldo…":mode==="staff"?"No hay jugadores cargados.":who.uid?'Vinculá tu ficha para ver tu saldo. <button class="btn sm" data-account>Ir a mi perfil</button>':'Entrá con tu cuenta para ver tu saldo. <button class="btn sm" data-account>Iniciar sesión</button>')+'</div>'+editor+'<output aria-live="polite"></output></section>'+(mode==="player"?'<section class="wallet-panel"><h3>Recompensas para jugadores</h3>'+showcase()+'<h4>Beneficios canjeables</h4><div data-benefits>Consultando beneficios…</div>'+(offers?'<h4>Premios del staff</h4><ul class="wallet-history">'+offers+'</ul>':"")+'</section>':"");
  if(mode==="player")benefits().then(prices=>{if(this.token===token)this.querySelector("[data-benefits]").innerHTML=benefitList(prices,!!pid);}).catch(()=>{if(this.token===token)this.querySelector("[data-benefits]").textContent="No se pudieron consultar los precios.";});
  this.pid=pid;if(!pid)return;
  try{const w=await fetchWallet(pid,who.uid);if(this.token===token)this.querySelector("[data-statement]").innerHTML=balances(w)+'<button class="btn sm" data-refresh>Actualizar saldo</button>';}
  catch(e){if(this.token===token)this.querySelector("[data-statement]").innerHTML=esc(e.message)+' <button class="btn sm" data-refresh>Reintentar</button>';}
 }
 async handleEvent(e){
  if(e.type==="change"){if(e.target.name==="player"){state.pid=e.target.value;this.refresh(true);}else if(e.target.name==="mid")state.match=e.target.value;return;}
  if(e.target.closest("[data-account]")){service.identity().uid?service.member():service.login();return;}
  if(e.target.closest("[data-refresh]")){accountCache.clear();this.refresh(true);return;}
  const form=e.type==="submit"?e.target:null,button=e.target.closest("[data-prize]");
  const benefit=e.target.closest("[data-benefit]");if(!form&&!button&&!benefit)return;e.preventDefault();if(this.busy)return;
  let body,message;const id=this.pid,kind=form?.dataset.kind;
  if(benefit){const cost=Number(benefit.dataset.cost);body={action:"buy",product:benefit.dataset.benefit,expectedCost:cost};message="¿Canjear "+benefit.parentElement.querySelector("span").firstChild.textContent+" por "+number(cost)+" OC?";}
  else if(button){const p=service.prizes().find(x=>x.id===button.dataset.prize);if(!p)return;
    body={action:"ownPrize",pid:id,prizeId:p.id,expectedCost:p.pts};message="¿Reservar "+number(p.pts)+" OC para "+p.name+"?";}
  else {const data=new FormData(form),amount=Number(data.get("amount"));if(kind==="match"){
    const m=service.matches().find(x=>x.id===data.get("mid"));if(!m)return;
    body={action:"walletMatch",mid:m.id,amount};message="¿Acreditar "+number(amount)+" OC a cada participante de "+m.name+"?";}
    else {body={action:"walletAdjust",pid:id,amount:amount*Number(data.get("type")),reason:data.get("reason")};message="¿Registrar "+number(body.amount)+" OC en la billetera de "+(service.players().find(x=>x.id===id)?.name||id)+"?";}}
  if(!confirm(message))return;this.busy=true;
  const k="onyx-wallet-pending:"+service.identity().uid+":"+JSON.stringify(body);body.requestId=sessionStorage.getItem(k)||crypto.randomUUID();sessionStorage.setItem(k,body.requestId);
  try{const r=await service.api("/api/social",body);sessionStorage.removeItem(k);accountCache.clear();if(benefit)benefitsRequest=null;await this.refresh(true);this.querySelector("output").textContent=r.repeated?"Esta operación ya estaba registrada.":benefit?"Canje registrado. Revisá tu historial.":button?"Pedido enviado al staff. El importe quedó reservado.":kind==="match"?"Premio acreditado a "+r.count+" jugadores.":"Movimiento registrado.";}
  catch(err){const out=this.querySelector("output");if(out)out.textContent=err.message;}finally{this.busy=false;}
 }
}
customElements.define("onyx-wallet",Wallet);
document.addEventListener("onyx-wallet-refresh",()=>document.querySelectorAll("onyx-wallet").forEach(el=>el.refresh()));
document.addEventListener("onyx-purchase-complete",()=>{accountCache.clear();document.querySelectorAll("onyx-wallet").forEach(el=>el.refresh(true));});
