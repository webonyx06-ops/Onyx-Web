// Cuentas con mail, coaches que piden equipo y notas de seguimiento
import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeDb } from "./helpers/fakedb.mjs";
import { checkSignup, createMemberAccount, signupLimit, requestCoach, reviewCoach, saveNote, deleteNote, coachNotes, playerNotes } from "../netlify/lib/coaching.mjs";

const NOW = Date.parse("2026-11-05T15:00:00-03:00");
const teams = { onyx: {}, orion: {}, oculto: { hidden: true } };
const fakeAuth = () => { const users = {}; return { users, createUser: async (u) => { if (Object.values(users).some((x) => x.email === u.email)) throw Object.assign(new Error("x"), { code: "auth/email-already-exists" }); users[u.uid] = u; return u; } }; };
const seed = () => ({ "players/p1": { name: "Tomi", team: "onyx" }, "players/p2": { name: "Leo", team: "onyx" }, "players/p3": { name: "Ana", team: "orion" }, "coaches/co1": { name: "Profe Juan", teams: {} } });

test("crear cuenta: valida los datos y no deja usar mails del staff", () => {
  assert.throws(() => checkSignup({ name: "T", email: "a@b.com", password: "1234567890" }), /nick/);
  assert.throws(() => checkSignup({ name: "Tomi", email: "nomail", password: "1234567890" }), /mail/);
  assert.throws(() => checkSignup({ name: "Tomi", email: "ultra1@staff.ligat1.app", password: "1234567890" }), /no se puede usar/);
  assert.throws(() => checkSignup({ name: "Tomi", email: "a@b.com", password: "corta" }), /10 caracteres/);
  assert.equal(checkSignup({ name: " Tomi ", email: "A@B.com", password: "1234567890" }).email, "a@b.com");
});

test("jugador y coach se registran; el coach queda pidiendo su equipo", async () => {
  const db = fakeDb(seed()), auth = fakeAuth();
  const r = await createMemberAccount(db, auth, { name: "Tomi", email: "tomi@mail.com", password: "clave12345" }, { now: NOW, teams });
  assert.match(r.uid, /^e_[a-f0-9]{24}$/); assert.equal(db._get(`members/${r.uid}`).role, "player");
  await assert.rejects(createMemberAccount(db, auth, { name: "Otro", email: "tomi@mail.com", password: "clave12345" }, { now: NOW, teams }), /Ya hay una cuenta/);
  await assert.rejects(createMemberAccount(db, auth, { name: "Juan", email: "j@mail.com", password: "clave12345", role: "coach", team: "oculto" }, { now: NOW, teams }), /equipo/);
  const c = await createMemberAccount(db, auth, { name: "Profe Juan", email: "juan@mail.com", password: "clave12345", role: "coach", team: "onyx", note: "Fui coach en otra liga" }, { now: NOW, teams });
  const rq = db._get(`requests/coachreg_${c.uid}`);
  assert.equal(rq.type, "coachreg"); assert.equal(rq.team, "onyx"); assert.equal(rq.status, "pend");
  await assert.rejects(requestCoach(db, { uid: c.uid, name: "Profe Juan" }, "orion", "", { now: NOW, teams }), /Ya tenés un pedido/);
});

test("límite de cuentas por conexión", async () => {
  const db = fakeDb();
  for (let i = 0; i < 3; i++) assert.equal(await signupLimit(db, "1.2.3.4", NOW, 3), true);
  assert.equal(await signupLimit(db, "1.2.3.4", NOW, 3), false);
  assert.equal(await signupLimit(db, "5.6.7.8", NOW, 3), true);
});

test("el capitán del equipo aprueba al coach y queda unido al coach de la liga con el mismo nombre", async () => {
  const db = fakeDb(seed()), auth = fakeAuth();
  const c = await createMemberAccount(db, auth, { name: "Profe Juan", email: "juan@mail.com", password: "clave12345", role: "coach", team: "onyx" }, { now: NOW, teams });
  const id = `coachreg_${c.uid}`;
  await assert.rejects(reviewCoach(db, { uid: "c2", captain: true, team: "orion", u: "capOrion" }, id, true, { now: NOW }), /otro equipo/);
  await assert.rejects(reviewCoach(db, { uid: "x", kind: "member" }, id, true, { now: NOW }), /Solo el capitán/);
  const r = await reviewCoach(db, { uid: "c1", captain: true, team: "onyx", u: "capOnyx" }, id, true, { now: NOW });
  assert.equal(r.coachId, "co1", "usa el coach que ya estaba cargado con ese nombre");
  assert.ok(db._get("coaches/co1").teams.onyx); assert.equal(db._get(`members/${c.uid}`).coachId, "co1");
  assert.deepEqual(r.paths, ["coaches/co1"]);
  assert.equal(db._get(`requests/${id}`).status, "ok");
  await assert.rejects(reviewCoach(db, { uid: "c1", captain: true, team: "onyx", u: "capOnyx" }, id, true, { now: NOW }), /ya se revisó/);
});

test("notas: el coach escribe para el equipo o para un jugador; cada jugador ve solo lo suyo y lo del equipo", async () => {
  const db = fakeDb({ ...seed(), "coaches/co1": { name: "Profe Juan", teams: { onyx: { since: 1 } } }, "members/e_c": { role: "coach", coachId: "co1" } });
  const coach = { uid: "e_c", kind: "member", name: "Profe Juan", member: { role: "coach", coachId: "co1" } };
  const t = await saveNote(db, coach, { team: "onyx", text: "Buen trabajo con la utilidad", vis: "team", kind: "bien" }, { now: NOW });
  const pv = await saveNote(db, coach, { team: "onyx", text: "Solo para mí: probar a Leo de controlador", vis: "private" }, { now: NOW + 1 });
  const p1 = await saveNote(db, coach, { team: "onyx", pid: "p1", text: "Cuidar la vida en las entradas", vis: "player", kind: "mejorar" }, { now: NOW + 2 });
  await assert.rejects(saveNote(db, coach, { team: "orion", text: "x", vis: "team" }, { now: NOW }), /No sos coach/);
  await assert.rejects(saveNote(db, coach, { team: "onyx", pid: "p3", text: "x", vis: "player" }, { now: NOW }), /no es de tu equipo/);
  await assert.rejects(saveNote(db, { uid: "e_x", kind: "member", member: { role: "player" } }, { team: "onyx", text: "x" }, { now: NOW }), /coaches aprobados/);
  const list = await coachNotes(db, coach);
  assert.equal(list.notes.length, 3); assert.deepEqual(list.teams, ["onyx"]);
  const tomi = await playerNotes(db, { uid: "e_t", kind: "member", pid: "p1" });
  assert.deepEqual(tomi.notes.map((n) => n.id).sort(), [t.id, p1.id].sort(), "Tomi ve la del equipo y la suya");
  const leo = await playerNotes(db, { uid: "e_l", kind: "member", pid: "p2" });
  assert.deepEqual(leo.notes.map((n) => n.id), [t.id], "Leo no ve la de Tomi ni la privada");
  assert.ok(!tomi.notes.some((n) => n.id === pv.id));
  const ana = await playerNotes(db, { uid: "e_a", kind: "member", pid: "p3" });
  assert.equal(ana.notes.length, 0, "otro equipo no ve nada");
  await saveNote(db, coach, { id: p1.id, team: "onyx", pid: "p1", text: "Editada", vis: "private", kind: "mejorar" }, { now: NOW + 3 });
  assert.equal((await playerNotes(db, { uid: "e_t", kind: "member", pid: "p1" })).notes.length, 1, "si la pasa a privada, el jugador deja de verla");
  await assert.rejects(deleteNote(db, { uid: "e_o", kind: "member", member: { coachId: "co9" } }, t.id), /no existe/);
  await deleteNote(db, coach, t.id);
  assert.equal(db._get(`coachnotes/${t.id}`), undefined);
});
