// Conexión con privilegios de servidor a Firebase (misma clave que usa la función de staff).
import admin from "firebase-admin";
import { readServiceAccount } from "./sa.mjs";

export function initAdmin() {
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(readServiceAccount()) });
  return admin;
}

export { admin, readServiceAccount };
