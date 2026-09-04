---
name: sync-shared-constant
description: "Checklist para propagar un cambio en backend/shared/*.json (una lista de roles, un límite, cualquier constante compartida) a todos los archivos que dependen de ella. Usar cada vez que se crea, renombra o cambia el valor de una constante en shared/*.json, antes de dar el cambio por terminado."
---

# Sync Shared Constant

`backend/shared/*.json` es la única fuente de verdad para constantes que usan backend y frontend a la vez (listas de roles, límites, IDs especiales). Un cambio ahí que no se propaga completo deja al frontend escondiendo una sección que la API igual permite, o mostrando una que el backend va a rechazar con 403 — exactamente el tipo de bug que no se nota hasta que alguien lo pisa en producción.

Esta Skill es el checklist fijo que hay que correr completo, no una sugerencia de dónde mirar.

## Checklist

1. **`backend/shared/<dominio>.json`** — el cambio ya está acá (es el disparador de esta Skill).

2. **`backend/constants/<dominio>.js`** — el módulo CommonJS que expone el valor a las rutas del backend. Verificar que:
   - Si es una constante nueva, está exportada.
   - Si cambió de forma (de string a array, por ejemplo), el `module.exports` sigue siendo válido.
   - El comentario de cabecera del archivo sigue describiendo la regla correctamente (estos archivos documentan QUÉ controla cada lista — no dejarlo desactualizado).

3. **`backend/types.ts`** — el re-export para el frontend. Buscar el bloque `export const <NOMBRE>` correspondiente; si la constante es nueva, agregarlo con el mismo patrón que las existentes (import del JSON, export tipado `readonly string[]` o lo que corresponda, comentario explicando quién decide de verdad — que siempre es el backend, nunca el frontend).

4. **Grep en todo el repo** el nombre de la constante para encontrar consumidores del frontend:
   ```bash
   grep -rn "<NOMBRE_DE_LA_CONSTANTE>" frontend/src --include=*.tsx --include=*.ts
   ```
   Los dos consumidores recurrentes de listas de roles ya conocidos son:
   - `frontend/src/components/layout/RolGuard.tsx` (o el `<Route element={<RolGuard roles={...} />}>` en `frontend/src/main.tsx` que lo envuelve) — si la constante gatea una página nueva.
   - `frontend/src/components/layout/Sidebar.tsx` — el `roles:` de la entrada correspondiente en `ITEMS`, para esconder el ítem del menú.

   **No asumir que son los únicos.** Cada dominio puede tener consumidores propios (por ejemplo, `ConfiguracionPage.tsx` lee `ROLES_ADMINISTRAN_IMPRESORAS` directo para decidir si renderiza `<ImpresorasSection />`). El grep es la única forma confiable de no perderse uno.

5. **Backend: buscar el `requireRol(...)` correspondiente.** Si la constante gatea acceso, confirmar que el/los router(s) que corresponden ya importan `requireRol` de `../lib/roles` y la constante nueva/cambiada de `../constants/<dominio>`, y que el gate está en el router correcto — a nivel de todo el router (`router.use(requireRol(...))`, como en `precios.js`) o solo en las rutas de escritura (como en `lineas.js`, donde el GET queda abierto porque otra página lo necesita). Revisar caso por caso, no copiar el patrón sin pensar cuál corresponde.

6. **Señalar explícitamente si algún consumidor pertenece a un dominio de agente distinto al que está haciendo el cambio.** El caso conocido: cualquier constante que termine consumida en `backend/routes/impresoras.js`, `print.js`, `interno.js`, `services/impresion.js` o `services/impresoras.js` es territorio del agente `print-stack`, no de `backend` ni `frontend`. Si el agente que corre esta Skill no es dueño de ese archivo, **no lo edita** — reporta que falta ese paso y a quién le corresponde, en vez de dar el cambio por cerrado.

7. **Verificación final:**
   ```bash
   cd backend && npm test
   cd frontend && npx tsc -b
   ```
   El typecheck del frontend es el chequeo más barato de que `types.ts` quedó consistente — si algo del paso 3 quedó mal tipado, falla ahí antes de llegar a runtime.

## Ejemplo real (de referencia, no reejecutar)

El split de `ROLES_ELIGEN_IMPRESORA` en `ROLES_ELIGEN_IMPRESORA` (elegir destino al imprimir) + `ROLES_ADMINISTRAN_IMPRESORAS` (administrar el registro, superadmin-only) tocó: `shared/impresion.json`, `constants/impresion.js`, `types.ts` (dos exports en vez de uno), `routes/impresoras.js` (el `requireAdmin` interno cambió de lista), y `ConfiguracionPage.tsx` (el `puedeAdministrarImpresoras` pasó a leer la lista nueva). `services/impresoras.js` **no** se tocó a propósito — seguía usando la lista vieja sin cambios, porque "elegir destino" y "administrar el registro" son permisos distintos.
