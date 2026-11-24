export const fields = [
  ["riot", "Riot ID (nombre#tag)"], ["rango", "Rango actual"], ["peak", "Peak elo"],
  ["principal", "Rol principal"], ["secundario", "Rol secundario o ninguno"],
  ["flex", "¿Abierto a otros roles? ¿Cuáles?"], ["agentes", "Agentes que más jugás"],
  ["horarios", "Días y horarios disponibles (incluí zona horaria)"], ["pais", "País"],
  ["motivo", "¿Por qué deberían ficharte?"], ["capitan", "¿Te postulás a capitán?"],
  ["pago", "¿Confirmás el pago de US$ 2?"], ["dudas", "Dudas"], ["sugerencias", "Sugerencias"]
];
const publicKeys = fields.slice(0, 9).map(([key]) => key);
export function profile(row) {
  return Object.fromEntries(["discord", ...publicKeys].map(key => [key, String(row[key] || "")]));
}
export const recruitmentCommands = [
  {name:"encuesta", description:"Habilitar este canal y publicar la encuesta de fichajes", default_member_permissions:"32",options:[{type:5,name:"crear_canal",description:"Crear o reutilizar el canal #postulaciones-onyx"}]},
  {name:"postular", description:"Enviar mi postulación al staff para entrar al mercado de ONYX", options:fields.map(([name,description]) => ({
    type:3, name, description, required:!["dudas","sugerencias"].includes(name), max_length: name === "motivo" ? 600 : 220,
    ...(["capitan","pago"].includes(name) ? {choices:[{name:"Sí",value:"Sí"},{name:"No",value:"No"}]} : {})
  }))}
];
