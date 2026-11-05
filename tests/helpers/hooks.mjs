// Cambia "firebase-admin" por una versión de prueba que usa la base en memoria de cada prueba (globalThis.__db).
const STUB = new URL("./firebase-admin-stub.mjs", import.meta.url).href;
export async function resolve(specifier, context, next) {
  if (specifier === "firebase-admin") return { url: STUB, shortCircuit: true };
  return next(specifier, context);
}
