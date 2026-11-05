// Entrar con Discord (para jugadores). Rutas:
//   /api/auth/discord           → manda a Discord a pedir permiso (solo el nombre y la foto: scope "identify")
//   /api/auth/discord/callback  → vuelve de Discord, crea o actualiza la cuenta del jugador y lo deja logueado en la página
// Necesita en Netlify: DISCORD_APP_ID (el mismo de ONYX Bot) y DISCORD_CLIENT_SECRET (Developer Portal → OAuth2),
// y en Discord, la dirección de vuelta registrada: https://<tu-sitio>/api/auth/discord/callback
import { randomBytes } from "node:crypto";
import { initAdmin } from "../lib/admin.mjs";

const site = () => (process.env.SITE_URL || process.env.URL || "https://onyxt1.netlify.app").replace(/\/$/, "");
const cfg = () => ({ id: process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APP_ID || "", secret: process.env.DISCORD_CLIENT_SECRET || "" });
const back = (hash) => Response.redirect(`${site()}/#${hash}`, 302);
const cookie = (v, age) => `onyx_oauth=${v}; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const readCookie = (req) => { const m = (req.headers.get("cookie") || "").match(/(?:^|;\s*)onyx_oauth=([^;]+)/); return m ? m[1] : ""; };
const avatarOf = (u) => u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${String(u.avatar).startsWith("a_") ? "gif" : "png"}?size=128`
  : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`;

export default async (req) => {
  const url = new URL(req.url), C = cfg();
  if (!C.id || !C.secret) return back("perfil&login=nocfg");
  const redirect = `${site()}/api/auth/discord/callback`;

  if (!url.pathname.endsWith("/callback")) {
    const state = randomBytes(18).toString("hex");
    const q = new URLSearchParams({ client_id: C.id, response_type: "code", redirect_uri: redirect, scope: "identify", state, prompt: "none" });
    return new Response(null, { status: 302, headers: { location: `https://discord.com/oauth2/authorize?${q}`, "set-cookie": cookie(state, 600), "cache-control": "no-store" } });
  }

  const clear = { "set-cookie": cookie("", 0), "cache-control": "no-store" };
  const fail = (why) => new Response(null, { status: 302, headers: { location: `${site()}/#perfil&login=${why}`, ...clear } });
  if (url.searchParams.get("error")) return fail("cancel");
  const code = url.searchParams.get("code"), state = url.searchParams.get("state");
  if (!code || !state || state !== readCookie(req)) return fail("state");
  try {
    const tr = await fetch("https://discord.com/api/oauth2/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: C.id, client_secret: C.secret, grant_type: "authorization_code", code, redirect_uri: redirect }) });
    const tok = await tr.json().catch(() => ({}));
    if (!tr.ok || !tok.access_token) return fail("token");
    const ur = await fetch("https://discord.com/api/users/@me", { headers: { authorization: `Bearer ${tok.access_token}` } });
    const u = await ur.json().catch(() => ({}));
    if (!ur.ok || !/^\d{5,25}$/.test(String(u.id || ""))) return fail("user");
    const admin = initAdmin(), db = admin.firestore(), uid = `d_${u.id}`, now = Date.now();
    const name = String(u.global_name || u.username || "Jugador").slice(0, 32), username = String(u.username || "").slice(0, 40), avatar = avatarOf(u);
    const ref = db.doc(`members/${uid}`), cur = await ref.get(), prev = cur.exists ? cur.data() : null;
    if (prev && prev.banned) return fail("banned");
    const doc = { uid, discordId: String(u.id), name, username, avatar, last: now, first: (prev && prev.first) || now, pid: (prev && prev.pid) || null };
    // vínculo automático: si el staff cargó el usuario de Discord en el jugador
    if (!doc.pid) {
      const ps = await db.collection("players").where("discord", "in", [username, username.toLowerCase(), String(u.id)].filter(Boolean)).get().catch(() => ({ docs: [] }));
      const p = ps.docs[0];
      if (p) {
        const taken = await db.collection("members").where("pid", "==", p.id).limit(1).get();
        if (taken.empty) { doc.pid = p.id; doc.linkedAt = now; doc.linkedBy = "auto"; }
      }
    }
    await ref.set(doc, { merge: true });
    const token = await admin.auth().createCustomToken(uid, { discord: String(u.id) });
    return new Response(null, { status: 302, headers: { location: `${site()}/#dlogin=${encodeURIComponent(token)}`, ...clear } });
  } catch (e) {
    console.error("login con Discord:", e);
    return fail("error");
  }
};

export const config = { path: ["/api/auth/discord", "/api/auth/discord/callback"] };
