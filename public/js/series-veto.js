let stopVetoView=()=>{};
function renderSeriesVeto(root,team){
 stopVetoView();
 const {TM,api}=globalThis.onyxVetoCtx,D=globalThis.onyxVetoCtx.D,S=globalThis.onyxVetoCtx.S;
 const games=D.pending.filter(m=>(!team||m.a===team||m.b===team)&&m.leg!=="desempate");
 const groups=new Map(games.map(m=>[JSON.stringify([m.fecha,[m.a,m.b].sort()]),m]));
 root.innerHTML='<label>Enfrentamiento <select></select></label> <button class="btn sm">Actualizar</button><p role="status"></p><section></section>';
 const select=root.querySelector("select"),status=root.querySelector("p"),panel=root.querySelector("section");
 for(const m of groups.values())select.add(new Option("Fecha "+m.fecha+" · "+TM(m.a).name+" vs "+TM(m.b).name,m.id));
 if(!select.length){root.textContent="Sin cruces pendientes.";return;}
 if([...select.options].some(o=>o.value===S.mp.vetoId))select.value=S.mp.vetoId;
 let busy=false,active=true,last=null,clock=null,offset=0,stamp="";
 const add=(tag,txt)=>{const el=document.createElement(tag);el.textContent=txt;panel.append(el);return el;};
 function button(label,action,value){const el=add("button",label);el.className="btn sm";el.onclick=()=>request(action,value);}
 function tick(){if(clock&&last?.deadline&&!last.paused){const seconds=Math.max(0,Math.ceil((last.deadline-Date.now()-offset)/1000));clock.textContent=seconds?seconds+" s restantes":"Tiempo agotado · se requiere administración";}}
 function draw(s){
  panel.replaceChildren();clock=null;
  add("h3",TM(s.a).name+" vs "+TM(s.b).name);
  add("p",s.turn?"Turno de "+TM(s.turn.team).name+" · "+({ban:"Banear",pick:"Elegir mapa",side:"Elegir lado"}[s.turn.type]):"Veto confirmado");
  const progress=add("progress","");progress.max=9;progress.value=s.history.length;progress.setAttribute("aria-label","Progreso del veto");
  clock=add("p",s.paused?"Reloj pausado":s.turn&&!s.deadline?"Pendiente de inicio":"");tick();
  if(team&&s.turn&&!s.paused&&!s.deadline)button("Iniciar reloj","start");
  for(const map of s.pool){
   const action=s.history.find(h=>h.type!=="side"&&h.value===map);
   if(s.turn?.team===team && s.turn.type!=="side" && s.remaining.includes(map)&&!s.paused)button(map,"move",map);
   else add("span",map+" · "+(action?.type==="ban"?"Baneado":s.picks.includes(map)?(s.picks[2]===map?"Desempate":"Seleccionado"):"Disponible")+"  ").className="chip";
  }
  if(s.turn?.team===team&&team&&s.turn.type==="side"&&!s.paused)for(const side of ["Ataque","Defensa"])button(side,"move",side);
  for(const [i,map] of s.picks.entries())add("p",(i===2?"Desempate":"Mapa "+(i+1))+" · "+map+" · "+(s.sides[i]?TM(s.sides[i].team).name+" inicia en "+s.sides[i].value:"Lado pendiente"));
  if(s.history.length){const list=add("ol","");for(const h of s.history){const item=document.createElement("li");item.textContent=TM(h.team).name+" · "+({ban:"Baneo",pick:"Selección",side:"Lado"}[h.type])+" · "+h.value;list.append(item);}}
  if(s.adminControl && s.turn && (s.deadline||s.history.length)){
   button("Pausar","pause");button("Reiniciar turno","resume");button("Agregar 60 s","extend");
   const inputs={};for(const [key,label] of [["ban","Baneo"],["pick","Selección"],["side","Lado"]]){const l=add("label",label+" (s) ");const n=document.createElement("input");n.type="number";n.min=10;n.max=900;n.value=s.limits?.[key]||(key==="side"?60:90);l.append(n);inputs[key]=n;}
   const save=add("button","Guardar tiempos");save.className="btn sm";save.onclick=()=>request("clock",Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,Number(v.value)])));
  }
 }
 async function request(action="read",value){
  if(busy||!active)return;busy=true;const mid=select.value;S.mp.vetoId=mid;
  try{const s=await api("/api/map-veto",{mid,action,value,revision:last?.history.length});
   if(!active||select.value!==mid)return;
   offset=s.serverNow-Date.now();last=s;status.textContent="";const next=JSON.stringify([mid,s.history,s.deadline,s.paused,s.limits,s.pool]);
   if(next!==stamp){stamp=next;draw(s);}
  }catch(e){if(active)status.textContent=e.message;}finally{busy=false;}
 }
 select.onchange=()=>{stamp="";last=null;panel.replaceChildren();request();};root.querySelector("button").onclick=()=>request();
 const t=setInterval(()=>{if(location.hash==="#elegir-mapa"&&!document.hidden)request();},5000);
 const c=setInterval(tick,1000);stopVetoView=()=>{active=false;clearInterval(t);clearInterval(c);};
 if(location.hash==="#elegir-mapa")request();
}
