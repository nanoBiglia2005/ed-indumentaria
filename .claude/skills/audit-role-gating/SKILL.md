---
name: audit-role-gating
description: "Verifica extremo a extremo que cada ruta protegida con requireRol rechaza los roles que debe rechazar y deja pasar a los que corresponde, forjando cookies de sesión reales sin pasar por Google. Usar después de agregar o cambiar un requireRol en cualquier ruta, o antes de un release que tocó permisos."
---

# Audit Role Gating

`CLAUDE.md` es explícito: "el rol se lee SIEMPRE de la sesión del servidor... la API tiene que negarse igual" aunque el frontend esconda un botón. Esta Skill es la forma de comprobarlo de verdad, contra el backend corriendo, sin depender de que alguien pruebe cada combinación a mano por el navegador.

## Restricción dura — leer antes de correr nada

**Esto se corre exclusivamente contra el backend LOCAL de desarrollo (`http://127.0.0.1:5000`).** El script usa el `AUTH_SECRET` real de `backend/.env` para forjar cookies de sesión válidas sin pasar por Google — es una herramienta de verificación, no algo para apuntar contra la VPS de producción bajo ninguna circunstancia. El agente `infra-deploy` (el único con acceso SSH) no debe tener esta Skill disponible ni replicar la técnica contra producción.

## Requisitos previos

- El backend local tiene que estar corriendo: `curl http://127.0.0.1:5000/api/health` debe responder `200`.
- `backend/.env` tiene que tener `AUTH_SECRET` seteado (ya lo tiene si el backend arranca).
- La base de dev necesita al menos un usuario real por rol. Los IDs están hardcodeados en `scripts/gen-session.mjs` — si esos usuarios cambiaron, actualizarlos ahí primero (`SELECT id_usuario, email, rol FROM "USUARIOS";`).

## Paso 1 — generar las cookies

Desde `backend/` (obligatorio, ver el comentario de cabecera del script para el por qué):

```bash
cd backend
node ../.claude/skills/audit-role-gating/scripts/gen-session.mjs
```

Devuelve una línea por rol: `empleado=<jwt>`, `ventas=<jwt>`, `admin=<jwt>`, `superadmin=<jwt>`.

## Paso 2 — armar la matriz

Cargar las cuatro cookies en variables y pegarle a cada ruta protegida. El patrón:

```bash
curl -sS -o /dev/null -w "%{http_code}" -X <METODO> \
  --cookie "authjs.session-token=<COOKIE_DEL_ROL>" \
  -H "Content-Type: application/json" -d "<BODY_JSON_VALIDO>" \
  http://127.0.0.1:5000<RUTA>
```

Dos advertencias de bash aprendidas a las malas la primera vez que se corrió esto:
- **El body JSON tiene que ser un string bien formado ANTES de llegar a curl.** Un default de bash mal escrito (llaves anidadas en un `${var:-default}`) corrompe el JSON en silencio y el servidor responde 400 (error de `body-parser`) en vez de 403 — parece un fallo del gate de rol pero es un bug del harness de prueba. Si aparece un 400 donde se esperaba 403, mirar el *body* completo de la respuesta antes de sospechar del código de la app.
- Si se arma una tabla de casos como `"metodo:ruta:body"` con `IFS=:`, un body JSON que contenga `:` (cualquier objeto no vacío) rompe el split. No usar `:` como delimitador cuando el payload es JSON.

## Paso 3 — qué rutas cubrir

Al momento de escribir esto, 11 de los 13 routers en `backend/routes/` importan `requireRol`: `precios.js`, `venta.js` (excepción — sin gate, es la página universal), `interno.js` (excepción — usa `X-Print-Secret`, no rol), `tiposDePago.js`, `remitos.js`, `articulos.js`, `grupos.js`, `subgrupos.js`, `clientes.js`, `lineas.js`, `print.js`, `asociaciones.js`, `impresoras.js`. **No copiar esta lista sin revisar** — si se agregó o quitó un router desde entonces, `grep -rln "requireRol" backend/routes/` da la lista vigente.

Para cada ruta gateada: probar con cada rol que la constante correspondiente **excluye** (debe dar 403) y con al menos uno que **incluye** (no debe dar 403 — puede dar 200, 400 de validación, o 404 si el recurso no existe; lo único que confirma que el gate falló es un 403 inesperado o un 200/aceptado inesperado).

## Paso 4 — reportar

Formato mínimo: una fila por combinación ruta+rol probada, con el status esperado vs. el real. Cualquier discrepancia se investiga antes de reportar — no asumir que un resultado inesperado es "seguramente el harness de prueba" sin aislarlo primero (ver la advertencia del Paso 2).

## Limpieza

El script no escribe nada en la base ni en el repo — no genera archivos temporales fuera de sí mismo. No hace falta limpieza posterior.
