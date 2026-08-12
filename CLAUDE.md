# ED Indumentaria — Convenciones

## Stack
- Backend: Node CommonJS + Express 5 + Prisma 7 (JS, sin TS). DB-first: la base se edita directo
  y se sincroniza con `npm run db:sync` (NO tocar `scripts/db-sync.js` ni `prisma.config.ts`).
- Frontend: React 19 + TypeScript + Vite + Tailwind v4 (clases inline) + Headless UI.
  Sin librerías nuevas sin justificación.
- Identificadores y textos en español. Componentes PascalCase, hooks `useCosa`, resto camelCase.

## Backend
- `index.js` es solo bootstrap (health → auth → requireAuth → routers). No agregar rutas ahí.
- Nueva ruta: archivo en `routes/<dominio>.js` con `express.Router`, handlers envueltos en
  `asyncHandler(fn, 'mensaje de error 500')` de `lib/http.js`. Errores esperados:
  `throw new HttpError(status, body)`.
- IDs de params: `parseId()` / `parseIds()`. Unicidad de nombres: `assertNombreUnico()`.
  Errores de Prisma (P2002/P2003/P2025): el mapa `errores` de `asyncHandler`
  (todo en `lib/validaciones.js` y `lib/http.js`).
- Los ABMs (grupos/subgrupos/clientes/lineas) son routers explícitos con esos helpers:
  se descartó un factory genérico porque los cuatro desvían en validaciones reales
  (filtros, campos extra, chequeos de padre). No introducir un factory con flags.
- Lógica de negocio (precios, remitos, impresión) va en `services/`, nunca en el handler.
- Constantes compartidas con el frontend: `shared/ventas.json` (única fuente). CJS las lee
  vía `constants/ventas.js`; el frontend vía `types.ts`.

## Frontend
- El frontend importa del backend SOLO `@backend/types`. Prohibido importar
  `backend/generated/**` y prohibido `fetch()` fuera de `src/api/cliente.ts`.
- Llamadas HTTP: función en `src/api/<recurso>.ts` usando `request<T>`. Lanzan `ApiError`;
  el llamador maneja el error.
- Estructura: páginas y sus modales viven en `features/<feature>/` (articulos, ventas,
  configuracion, auth); lo compartido en `components/` (`ui/`, `layout/`, `tabla/`),
  `hooks/`, `api/`, `types/`, `utils/`.
- Nuevo modal: en `features/<feature>/modales/`, siempre sobre `components/ui/BaseModal`.
  Convención de apertura: `abierto: boolean` + payload como prop separada.
  Acciones async con `useAccionAsync`; confirmación demorada con `useCuentaRegresiva`.
- Nueva columna de tabla: agregar una `ColumnaTabla<T>` en el `columnas.tsx` de la feature.
  El motor (`useTablaFiltrable`) y la grilla (`DataGrid`) no se modifican para casos puntuales.
- Asociaciones muchos-a-muchos de un artículo: usar `EditRelacionesModal` con un objeto
  de textos + funciones de api, no crear un modal nuevo por entidad.
- Tipos compartidos en `src/types/` ({id, nombre} = `Opcion`). Los tipos de dominio no viven
  dentro de componentes.
- Compartido entre features → `components/`, `hooks/`, `utils/`. De una sola feature → dentro
  de la feature. Ante la duda, dejarlo en la feature (extraer recién con el segundo uso).
- No cambiar comportamiento al refactorizar. Bug encontrado = se documenta y se pregunta;
  no se arregla en silencio.
