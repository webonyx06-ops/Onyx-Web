import { createHmac,timingSafeEqual } from "node:crypto";

const mac=(s,secret)=>createHmac("sha256",secret).update("recruit:"+s).digest("hex");
export const snowflake=id=>typeof id==="string" && /^\d{15,22}$/.test(id);
export function identityCookie(user,secret,now=Date.now()) {
  const data=Buffer.from(JSON.stringify({id:user.id,username:user.username,expires:now+86400000})).toString("base64url");
  return "onyx_rc="+data+"."+mac(data,secret)+"; Path=/api/recruitment; Secure; HttpOnly; SameSite=Lax; Max-Age=86400";
}
export function identity(req,secret=process.env.DISCORD_CLIENT_SECRET,now=Date.now()) {
  const m=(req.headers.get("cookie")||"").match(/(?:^|;\s*)onyx_rc=([\w-]+)\.([a-f0-9]{64})(?:;|$)/);
  if(!secret || !m || !timingSafeEqual(Buffer.from(mac(m[1],secret)),Buffer.from(m[2]))) return null;
  try{const u=JSON.parse(Buffer.from(m[1],"base64url").toString());return snowflake(u.id) && u.expires>now && typeof u.username==="string"?u:null;}catch{return null;}
}
