// firebase-admin de prueba: verifica cualquier token (el token es el uid) y usa la base en memoria de la prueba.
const firestore = Object.assign(() => globalThis.__db, { FieldValue: { increment: (n) => n }, Timestamp: { fromMillis: (n) => n } });
const a = { apps: [], initializeApp() { a.apps.push(1); }, credential: { cert: () => ({}) }, auth: () => ({ verifyIdToken: async (t) => ({ uid: t }), createCustomToken: async (uid) => "tok-" + uid }), firestore };
export default a;
