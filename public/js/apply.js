(() => {
  const form = document.getElementById("apply");
  const sections = Array.from(form.querySelectorAll("fieldset"));
  const titles = ["Tu identidad","Tu juego","Para el staff"];
  const notes = ["Estos datos aparecen en tu ficha pública cuando se aprueba.","Los equipos usan esta información para buscar jugadores.","Solo el staff puede leer estas respuestas y verificar el pago."];
  const el = id=>document.getElementById(id);
  let step = 0, sending = false;
  function render() {
    sections.forEach((section,i)=>{section.hidden = section.disabled = i!==step;});
    el("count").textContent = "Paso "+(step+1)+" de 3";
    el("stageTitle").textContent=titles[step]; el("intro").textContent=notes[step];
    form.querySelectorAll(".steps li").forEach((li,i)=>li.classList.toggle("done",i<=step));
    el("prev").hidden = step===0; el("next").textContent=step===2?"Enviar postulación":"Continuar →";
    el("error").textContent=""; el("stageTitle").focus();
  }
  el("prev").addEventListener("click",()=>{if (!sending && step>0) {step--;render();}});
  form.addEventListener("submit",async e=>{
    e.preventDefault(); if (sending || !form.reportValidity()) return;
    if (step<2) {step++;render();return;}
    const answers = Object.fromEntries(Array.from(form.querySelectorAll("[name]"),field=>[field.name,field.value.trim()]));
    sending=true; el("prev").disabled=el("next").disabled=true; el("next").textContent="Enviando…"; el("error").textContent="";
    try {
      const res=await fetch("/api/recruitment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"apply",answers})});
      const data=await res.json().catch(()=>({}));
      if (!res.ok || data.status!=="pending") throw new Error(data.error || "No pudimos confirmar la recepción. Revisá tu conexión y volvé a intentar.");
      form.hidden=true; el("success").hidden=false; el("success").querySelector("h2").focus();
    } catch(err) { el("error").textContent=err.message; }
    finally { sending=false; el("prev").disabled=el("next").disabled=false; el("next").textContent="Enviar postulación"; }
  });
  el("share").addEventListener("click",async()=>{
    const url=new URL("postular.html",location.href).href;
    try {await navigator.clipboard.writeText(url);el("copyStatus").textContent="Enlace copiado.";}
    catch {el("copyStatus").textContent=url;}
  });
})();
