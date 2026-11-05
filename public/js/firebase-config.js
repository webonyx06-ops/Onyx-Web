// Configuración de Firebase para la web (proyecto ONYX).
// Estos datos son públicos por diseño: la seguridad la dan las reglas de Firestore (firestore.rules).

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDjfut6DuCjrlUdHq3S0CgvvkcX7kudMw0",
  authDomain: "onyx-237a9.firebaseapp.com",
  projectId: "onyx-237a9",
  storageBucket: "onyx-237a9.firebasestorage.app",
  messagingSenderId: "433696316709",
  appId: "1:433696316709:web:08e99d9356c3e652f30ecc",
  measurementId: "G-V9PP0YMRQ6"
};

// Dominio interno de los usuarios de staff (no se mandan mails).
// Si lo cambiás, poné el mismo valor en la variable STAFF_EMAIL_DOMAIN de Netlify.
window.LIGA_STAFF_DOMAIN = "staff.ligat1.app";
