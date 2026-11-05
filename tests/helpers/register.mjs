// Las pruebas usan un firebase-admin de mentira (sin conexión): se registra antes de cargar los módulos.
import { register } from "node:module";
register("./hooks.mjs", import.meta.url);
