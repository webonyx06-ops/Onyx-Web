const checkout = document.getElementById("checkout");
const notice = document.getElementById("notice");
document.getElementById("copy").onclick = async () => {
  try { await navigator.clipboard.writeText("abril.pilla"); notice.textContent = "Alias copiado."; }
  catch { notice.textContent = "Copiá este alias: abril.pilla"; }
};
fetch("/api/recruitment?identity=1",{cache:"no-store"}).then(r=>r.json()).then(d=>{
  if(!d.paymentOptions)return;
  document.getElementById("methods").hidden=false;document.getElementById("gate").hidden=true;
  document.getElementById("paypalLink").href=d.paymentOptions.paypal;checkout.hidden=false;
}).catch(()=>{});
checkout.onclick = async () => {
  checkout.disabled = true;
  try {
    const response = await fetch("/api/recruitment",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"checkout"})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    location.assign(data.url);
  } catch(e) { notice.textContent = e.message; checkout.disabled = false; }
};
