(() => {
  const form = document.getElementById("apply");
  const sections = Array.from(form.querySelectorAll("fieldset"));
  const titles = ["Tu identidad","Tu juego","Para el staff"];
  const notes = ["Estos datos aparecen en tu ficha pública cuando se aprueba.","Los equipos usan esta información para buscar jugadores.","Solo el staff puede leer estas respuestas y verificar el pago."];
  const el = id=>document.getElementById(id);
  let step = 0, sending = false;
  const receiptText = state => ({sent:"El comprobante llegó al canal del staff.",pending:"Recibimos el archivo. El envío al canal está pendiente.",sending:"El bot está enviando el comprobante.",retry:"Archivo recibido. El bot reintentará la entrega.",config:"Archivo recibido. El staff tiene que revisar el canal de destino."}[state] || "Todavía no subiste un comprobante.");
  async function refresh(){
    const response=await fetch("/api/recruitment?identity=1",{cache:"no-store"});
    if(!response.ok)throw new Error("Recargá la página para verificar tu Discord.");
    const {user,application,invite}=await response.json();
    if(!user)return;
    el("connect").hidden=true;form.hidden=!!application;el("myApplication").hidden=!application;
    form.elements.discord.value=user.username;
    if(!application)return;
    el("success").hidden=true;
    el("myStatus").textContent={approved:"Postulación aprobada",pending:"Pendiente de aprobación",rejected:"Postulación rechazada"}[application.status];
    el("myRiot").textContent=application.riot;
    el("myNotice").textContent=application.access==="joined"?"Jugador incorporado al servidor.":application.paid?"Pago verificado.":application.status==="pending"?"Tu solicitud está en revisión. Al aceptarla se habilitará el pago.":application.status==="rejected"?"Postulación rechazada.":application.paymentState==="rejected"?"El staff rechazó el comprobante. Podés enviar otro.":receiptText(application.receipt);
    el("myInvite").hidden=!invite;
    if(invite)el("myInvite").href=invite;
    el("paymentUpload").dataset.id=application.id;
    el("paymentUpload").hidden=application.paid || application.status!=="approved";
  }
  if(new URLSearchParams(location.search).has("discord"))el("connectNote").textContent="No pudimos conectar Discord. Volvé a intentar.";
  refresh().catch(err=>el("connectNote").textContent=err.message);
  async function encodeReceipt(file){
    if(!file)return null;
    const read=blob=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(new Error("No pudimos leer el archivo."));r.readAsDataURL(blob);});
    if(file.type==="application/pdf" || /\.pdf$/i.test(file.name)){
      if(file.size>650*1024)throw new Error("El PDF supera los 650 KB. Subí una captura o un PDF más chico.");
      return read(new Blob([file],{type:"application/pdf"}));
    }
    if(!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size>12*1024*1024)throw new Error("Elegí una imagen JPG, PNG o WEBP de hasta 12 MB.");
    if(file.size<=650*1024)return read(file);
    const img=new Image(),url=URL.createObjectURL(file);
    try{
      img.src=url;await img.decode();
      const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");
      for(const width of [2200,1800,1400,1000]){
        const scale=Math.min(1,width/Math.max(img.width,img.height));
        canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
        ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const data=canvas.toDataURL("image/jpeg",.86);if(data.length<890000)return data;
      }
      throw new Error("La imagen sigue siendo muy pesada. Recortá el comprobante y probá de nuevo.");
    }finally{URL.revokeObjectURL(url);}
  }
  el("paymentUpload").addEventListener("submit",async e=>{
    e.preventDefault();const btn=e.currentTarget.querySelector("button");if(btn.disabled)return;
    btn.disabled=true;el("payStatus").textContent="Enviando…";
    try{
      const receipt=await encodeReceipt(el("laterFile").files[0]);
      const res=await fetch("/api/recruitment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"receipt",method:el("paidVia").value,id:el("paymentUpload").dataset.id,receipt})});
      const data=await res.json();if(!res.ok)throw new Error(data.error);
      el("payStatus").textContent=receiptText(data.receiptState);el("laterFile").value="";await refresh();
    }catch(err){el("payStatus").textContent=err.message;}finally{btn.disabled=false;}
  });
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
    answers.pago="No";
    sending=true; el("prev").disabled=el("next").disabled=true; el("next").textContent="Enviando…"; el("error").textContent="";
    try {
      const receipt=null;
      const res=await fetch("/api/recruitment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"apply",answers,receipt})});
      const data=await res.json().catch(()=>({}));
      if (!res.ok || data.status!=="pending") throw new Error(data.error || "No pudimos confirmar la recepción. Revisá tu conexión y volvé a intentar.");
      form.hidden=true; el("success").hidden=false; el("success").querySelector("h2").focus(); await refresh().catch(()=>{});
    } catch(err) { el("error").textContent=err.message; }
    finally { sending=false; el("prev").disabled=el("next").disabled=false; el("next").textContent="Enviar postulación"; }
  });
  el("share").addEventListener("click",async()=>{
    const url=new URL("postular.html",location.href).href;
    try {await navigator.clipboard.writeText(url);el("copyStatus").textContent="Enlace copiado.";}
    catch {el("copyStatus").textContent=url;}
  });
})();
