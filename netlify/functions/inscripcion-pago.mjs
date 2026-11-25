import { createHash } from "node:crypto";
import { json } from "../lib/auth.mjs";
import { initAdmin } from "../lib/admin.mjs";

const amount = 3000;
const leaguePaymentLink = "https://mpago.la/1JL1Y54";
export function checkoutUrl(value) {
  try {
    const u = new URL(value);
    const domains = ["mpago.la","link.mercadopago.com.ar","www.mercadopago.com.ar","www.mercadopago.com"];
    return u.protocol === "https:" && !u.username && !u.password && !u.port && domains.includes(u.hostname) && u.pathname.length > 1 ? u.href : null;
  } catch { return null; }
}
export async function handler(req) {
  const configured = checkoutUrl(process.env.MP_INSCRIPCION_URL);
  const token = process.env.MP_ACCESS_TOKEN;
  if (req.method === "GET") return json(200,{available:true});
  if (req.method !== "POST") return json(405,{error:"Método no permitido."});
  if (configured) return json(200,{url:configured});
  if (!token) return json(200,{url:leaguePaymentLink});
  try {
    const db = initAdmin().firestore();
    const key = createHash("sha256").update(token).digest("hex").slice(0,24);
    const ref = db.doc("sys/mpInscripcionARS3000_" + key);
    const state = await db.runTransaction(async tx => {
      const data = (await tx.get(ref)).data() || {};
      if (checkoutUrl(data.url)) return data.url;
      if (data.until > Date.now()) return "busy";
      tx.set(ref,{until:Date.now()+30000});
      return "create";
    });
    if (state === "busy") return json(503,{error:"El enlace se está preparando. Volvé a intentar en unos segundos."});
    if (state !== "create") return json(200,{url:state});
    const response = await fetch("https://api.mercadopago.com/checkout/preferences",{
      method:"POST",signal:AbortSignal.timeout(9000),
      headers:{authorization:"Bearer "+token,"content-type":"application/json"},
      body:JSON.stringify({items:[{id:"onyx-inscripcion-ars-3000",title:"Inscripción ONYX League",quantity:1,currency_id:"ARS",unit_price:amount}]})
    });
    const pref = response.ok && await response.json();
    const url = checkoutUrl(pref?.init_point);
    if (!url) throw new Error("checkout");
    await ref.set({url,id:pref.id});
    return json(200,{url});
  } catch { return json(503,{error:"Mercado Pago no pudo abrir el cobro. Podés transferir al alias o volver a intentar."}); }
}
export default function(){return json(403,{error:"Abrí el pago desde tu postulación aceptada."});}
export const config = {path:"/api/inscripcion-pago"};
