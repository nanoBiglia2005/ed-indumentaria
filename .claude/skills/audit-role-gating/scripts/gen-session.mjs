// Genera cookies de sesion Auth.js validas SIN pasar por Google, firmadas con el
// AUTH_SECRET real de backend/.env. Uso exclusivo contra el backend LOCAL de
// desarrollo (http://127.0.0.1:5000) -- nunca contra la VPS de produccion.
//
// Como funciona: getSession() de @auth/express decodifica la cookie
// "authjs.session-token" y llama al MISMO callback jwt/session de auth.mjs.
// Como ese callback solo copia campos del token cuando NO hay `account`/`profile`
// (es decir, en cualquier request que no sea el login inicial), lo que pongamos
// en el payload pasa intacto a `res.locals.session.user`. Alcanza con
// id_usuario + rol para que requireRol() decida correctamente.
//
// OBLIGATORIO correr con cwd = backend/, porque resuelve @auth/core y lee .env
// contra ESE directorio a mano (Node no camina hasta backend/node_modules solo
// por estar parado ahi si el script fisicamente vive afuera, en .claude/):
//   cd backend
//   node ../.claude/skills/audit-role-gating/scripts/gen-session.mjs
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const backendDir = process.cwd();
const nodeModules = resolve(backendDir, 'node_modules');

if (!existsSync(nodeModules)) {
  console.error(`No se encontro ${nodeModules}. Correr este script con cwd=backend/ (ver el comentario de cabecera).`);
  process.exit(1);
}

// Leer AUTH_SECRET de backend/.env a mano: evita depender de que "dotenv" sea
// resolvible desde la ubicacion fisica de este archivo (vive en .claude/, no en
// backend/), que es exactamente el problema que tambien resuelve el import de abajo.
const envPath = resolve(backendDir, '.env');
if (!existsSync(envPath)) {
  console.error(`No se encontro ${envPath}.`);
  process.exit(1);
}
const envMatch = readFileSync(envPath, 'utf8').match(/^AUTH_SECRET=(.+)$/m);
const secret = envMatch?.[1]?.trim().replace(/^["']|["']$/g, '');
if (!secret) {
  console.error('AUTH_SECRET no esta definido en backend/.env. Abortando.');
  process.exit(1);
}

const { encode } = await import(pathToFileURL(resolve(nodeModules, '@auth/core/jwt.js')).href);

const salt = 'authjs.session-token';

// IDs de usuario reales de la base de desarrollo (db_ed_indumentaria_dev), uno
// por rol. Si estos usuarios cambian o se borran, actualizar aca --
// SELECT id_usuario, email, rol FROM "USUARIOS"; para confirmar valores vigentes.
const usuarios = {
  empleado: { id_usuario: 7, nombre: 'Empleado', apellido: 'Test', rol: 'empleado', email: 'nanocoding2005@gmail.com' },
  ventas: { id_usuario: 4, nombre: 'Ventas', apellido: 'Test', rol: 'ventas', email: 'nanobiglia@gmail.com' },
  admin: { id_usuario: 2, nombre: 'Admin', apellido: 'Test', rol: 'admin', email: 'edindumentariadeportiva@gmail.com' },
  superadmin: { id_usuario: 1, nombre: 'Stefano', apellido: 'Biglia', rol: 'superadmin', email: 'bigliastefano2005@gmail.com' },
};

for (const [key, u] of Object.entries(usuarios)) {
  const token = await encode({
    token: { ...u, name: `${u.nombre} ${u.apellido}`, picture: null },
    secret,
    salt,
  });
  console.log(`${key}=${token}`);
}
